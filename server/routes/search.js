import { spawn } from 'child_process';
import path from 'path';
import readline from 'readline';
import { parseComboLine } from '../utils/parser.js';
import { getActiveLogPaths, getLogsDirectory } from '../services/logManager.js';
import { getConfiguredThreads } from '../services/telemetry.js';

// Global reference to active search process for telemetry & stop actions
export let activeSearchProcess = null;

export async function searchRoutes(fastify, options) {
  // Cancel active search
  fastify.post('/api/search/stop', async (req, reply) => {
    if (activeSearchProcess && !activeSearchProcess.killed) {
      try {
        activeSearchProcess.kill('SIGTERM');
      } catch (err) {
        // process might have exited
      }
      activeSearchProcess = null;
      return { success: true, message: 'Ripgrep search process stopped.' };
    }
    return { success: true, message: 'No search process active.' };
  });

  // Server-Sent Events (SSE) Streaming Search
  fastify.get('/api/search', (req, reply) => {
    const query = (req.query.q || '').trim();
    const domainOnly = req.query.domainOnly === 'true' || req.query.domainOnly === true;
    const specificFilesParam = req.query.files;
    
    // Resolve files to search
    let targetPaths = [];
    const logsDir = getLogsDirectory();

    if (specificFilesParam) {
      const requested = Array.isArray(specificFilesParam) ? specificFilesParam : specificFilesParam.split(',');
      targetPaths = requested.map(f => path.join(logsDir, f.trim()));
    } else {
      targetPaths = getActiveLogPaths();
    }

    if (targetPaths.length === 0) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: 'No log files selected or directory is empty' })}\n\n`);
      reply.raw.end();
      return;
    }

    // Terminate any previous search if still running
    if (activeSearchProcess && !activeSearchProcess.killed) {
      try {
        activeSearchProcess.kill('SIGTERM');
      } catch (err) {}
      activeSearchProcess = null;
    }

    // Set up SSE streaming headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });
    reply.raw.flushHeaders?.();

    // Ripgrep arguments
    // -i: case-insensitive
    // --no-line-number: suppress line numbers
    // --mmap: memory mapped IO for multi-gigabyte log speed
    // Dynamically sized thread count matching host CPU topology
    const threadCount = getConfiguredThreads();
    const rgPattern = query.length > 0 ? query : '.';
    const rgArgs = [
      '-i',
      '--no-line-number',
      '--mmap',
      '-j', String(threadCount),
      '-H',
      '--',
      rgPattern,
      ...targetPaths
    ];

    const startTime = Date.now();
    let totalMatches = 0;
    let totalEmitted = 0;
    let totalDuplicatesDropped = 0;
    const deduplicationSet = new Set();
    const perFileCounts = {};

    for (const p of targetPaths) {
      perFileCounts[path.basename(p)] = 0;
    }

    // Periodic heartbeat comment to keep SSE connection alive
    const heartbeatTimer = setInterval(() => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(': ping\n\n');
      }
    }, 10000);

    // Spawn ripgrep process
    let rg;
    try {
      rg = spawn('rg', rgArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      activeSearchProcess = rg;
    } catch (err) {
      clearInterval(heartbeatTimer);
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: `Failed to spawn ripgrep: ${err.message}` })}\n\n`);
      reply.raw.end();
      return;
    }

    const rl = readline.createInterface({
      input: rg.stdout,
      crlfDelay: Infinity
    });

    let isPausedByDrain = false;

    // Handle backpressure: if client buffer fills up, pause ripgrep output
    rl.on('line', (line) => {
      if (!line) return;
      totalMatches++;

      // When rg is run with -H, output is `filepath:matched_line`
      let filename = 'unknown.txt';
      let content = line;

      // Extract filename robustly
      let matchedPath = null;
      for (const p of targetPaths) {
        if (line.startsWith(p + ':')) {
          matchedPath = p;
          break;
        }
      }

      if (matchedPath) {
        filename = path.basename(matchedPath);
        content = line.slice(matchedPath.length + 1);
      } else {
        // Fallback for relative paths or different outputs
        const txtMatch = line.match(/^([^:]+\.txt):/i);
        if (txtMatch) {
          filename = path.basename(txtMatch[1]);
          content = line.slice(txtMatch[0].length);
        } else {
          // No filename prefix detected, keep entire line
          content = line;
        }
      }

      // Parse line into structured combo object
      const parsed = parseComboLine(content, filename);
      if (!parsed) return;

      // Domain-only filtering: ensure query matched the site domain or email domain
      if (domainOnly && query.length > 0) {
        const target = query.toLowerCase();
        const itemDomain = (parsed.domain || '').toLowerCase();
        const emailDomain = (parsed.userOrEmail && parsed.userOrEmail.includes('@'))
          ? parsed.userOrEmail.split('@')[1]?.toLowerCase()
          : '';
        if (!itemDomain.includes(target) && !emailDomain.includes(target)) {
          return;
        }
      }

      // Real-Time In-Memory Deduplication
      // Deduplicate by userOrEmail:pass (or raw line if unstructured)
      const dedupKey = `${parsed.userOrEmail.toLowerCase()}:::${parsed.pass}`;
      if (deduplicationSet.has(dedupKey)) {
        totalDuplicatesDropped++;
        return;
      }
      // Keep set bounded if extremely massive (e.g. 500,000 recent items)
      if (deduplicationSet.size < 500000) {
        deduplicationSet.add(dedupKey);
      }

      totalEmitted++;
      perFileCounts[filename] = (perFileCounts[filename] || 0) + 1;

      // Stream JSON frame
      const frame = `data: ${JSON.stringify(parsed)}\n\n`;
      const canWrite = reply.raw.write(frame);

      // Backpressure management: attach only one drain listener
      if (!canWrite && !isPausedByDrain) {
        isPausedByDrain = true;
        rg.stdout.pause();
        reply.raw.once('drain', () => {
          isPausedByDrain = false;
          if (rg && !rg.killed) {
            rg.stdout.resume();
          }
        });
      }
    });

    rg.stderr.on('data', (data) => {
      // rg warnings or errors
      const errText = data.toString();
      if (!errText.includes('broken pipe')) {
        fastify.log.warn(`rg stderr: ${errText}`);
      }
    });

    const cleanup = () => {
      clearInterval(heartbeatTimer);
      if (activeSearchProcess === rg) {
        activeSearchProcess = null;
      }
    };

    rg.on('close', (code) => {
      cleanup();
      const durationMs = Date.now() - startTime;
      const statsPayload = {
        totalMatches,
        totalEmitted,
        duplicatesDropped: totalDuplicatesDropped,
        durationMs,
        perFileCounts,
        filesSearched: targetPaths.map(p => path.basename(p)),
        exitCode: code
      };

      if (!reply.raw.writableEnded) {
        reply.raw.write(`event: done\ndata: ${JSON.stringify(statsPayload)}\n\n`);
        reply.raw.end();
      }
    });

    rg.on('error', (err) => {
      cleanup();
      if (!reply.raw.writableEnded) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
        reply.raw.end();
      }
    });

    // Abort if client closes connection
    req.raw.on('close', () => {
      cleanup();
      if (rg && !rg.killed) {
        try {
          rg.kill('SIGTERM');
        } catch (e) {}
      }
    });
  });
}
