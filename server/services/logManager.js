import fs from 'fs';
import path from 'path';
import readline from 'readline';

// In-memory line count cache keyed by filePath:mtime:size
const lineCountCache = new Map();

// In-memory active file set (all active by default)
const excludedFiles = new Set();

/**
 * Resolves logs directory, checking Termux ~/logs first, then local fallback
 */
export function getLogsDirectory() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const termuxLogs = path.join(home, 'logs');
  
  if (fs.existsSync(termuxLogs)) {
    return termuxLogs;
  }


  const localLogs = path.resolve('logs');
  if (!fs.existsSync(localLogs)) {
    fs.mkdirSync(localLogs, { recursive: true });
  }
  return localLogs;
}

/**
 * Fast streaming line counter using 64KB buffer chunking
 */
export async function countLines(filePath, stat) {
  const cacheKey = `${filePath}:${stat.mtimeMs}:${stat.size}`;
  if (lineCountCache.has(cacheKey)) {
    return lineCountCache.get(cacheKey);
  }

  return new Promise((resolve) => {
    let count = 0;
    const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });

    stream.on('data', (chunk) => {
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 10) { // '\n'
          count++;
        }
      }
    });

    stream.on('end', () => {
      lineCountCache.set(cacheKey, count);
      resolve(count);
    });

    stream.on('error', () => {
      resolve(0);
    });
  });
}

/**
 * Format bytes into human readable string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Scans log directory and returns list of .txt log files with metadata
 */
export async function listLogFiles() {
  const dir = getLogsDirectory();
  if (!fs.existsSync(dir)) {
    return { dir, files: [] };
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const txtFiles = entries.filter(e => e.isFile() && e.name.toLowerCase().endsWith('.txt'));

  const results = await Promise.all(
    txtFiles.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        const lineCount = await countLines(fullPath, stat);
        return {
          name: entry.name,
          path: fullPath,
          sizeBytes: stat.size,
          sizeFormatted: formatBytes(stat.size),
          lineCount,
          lastModified: stat.mtime.toISOString(),
          isActive: !excludedFiles.has(entry.name)
        };
      } catch (err) {
        return null;
      }
    })
  );

  return {
    dir,
    files: results.filter(Boolean).sort((a, b) => b.sizeBytes - a.sizeBytes)
  };
}

/**
 * Toggle inclusion status for a file
 */
export function toggleFileActive(filename, active) {
  if (active) {
    excludedFiles.delete(filename);
  } else {
    excludedFiles.add(filename);
  }
}

/**
 * Bulk set active status
 */
export function setFilesActive(filenames, active) {
  for (const fn of filenames) {
    toggleFileActive(fn, active);
  }
}

/**
 * Rename a log file
 */
export function renameLogFile(oldName, newName) {
  const dir = getLogsDirectory();
  const safeNewName = newName.endsWith('.txt') ? newName : `${newName}.txt`;
  const oldPath = path.join(dir, oldName);
  const newPath = path.join(dir, safeNewName);

  if (!fs.existsSync(oldPath)) {
    throw new Error(`File ${oldName} does not exist`);
  }
  if (fs.existsSync(newPath)) {
    throw new Error(`Target file ${safeNewName} already exists`);
  }

  fs.renameSync(oldPath, newPath);
  if (excludedFiles.has(oldName)) {
    excludedFiles.delete(oldName);
    excludedFiles.add(safeNewName);
  }
  return { oldName, newName: safeNewName };
}

/**
 * Delete log files
 */
export function deleteLogFiles(filenames) {
  const dir = getLogsDirectory();
  const deleted = [];

  for (const fn of filenames) {
    const fullPath = path.join(dir, fn);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      excludedFiles.delete(fn);
      deleted.push(fn);
    }
  }

  return deleted;
}

/**
 * Returns array of full paths for all currently active log files
 */
export function getActiveLogPaths() {
  const dir = getLogsDirectory();
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.txt') && !excludedFiles.has(e.name))
    .map(e => path.join(dir, e.name));
}
