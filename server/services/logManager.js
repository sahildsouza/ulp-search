import fs from 'fs';
import path from 'path';
import readline from 'readline';

const CACHE_FILENAME = '.ulp_log_cache.json';

// In-memory line count cache keyed by filePath:mtime:size
const lineCountCache = new Map();

// In-memory persistent metadata cache
let persistentCache = null;

// In-memory active file set (all active by default)
const excludedFiles = new Set();

/**
 * Loads persistent cache from disk
 */
function loadPersistentCache(dir) {
  try {
    const cachePath = path.join(dir, CACHE_FILENAME);
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      if (data && typeof data === 'object') {
        return data;
      }
    }
  } catch {}
  return {};
}

/**
 * Saves persistent cache to disk safely
 */
function savePersistentCache(dir, cache) {
  try {
    const cachePath = path.join(dir, CACHE_FILENAME);
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
  } catch {}
}

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
 * Fast streaming line counter using 256KB buffer chunking
 */
export async function countLines(filePath, stat) {
  const cacheKey = `${filePath}:${stat.mtimeMs}:${stat.size}`;
  if (lineCountCache.has(cacheKey)) {
    return lineCountCache.get(cacheKey);
  }

  return new Promise((resolve) => {
    let count = 0;
    const stream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });

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
 * Scans log directory and returns list of .txt log files with metadata.
 * Uses persistent caching so existing files are fetched instantly in < 1ms
 * and only new or modified files are scanned.
 */
export async function listLogFiles(forceRefresh = false) {
  const dir = getLogsDirectory();
  if (!fs.existsSync(dir)) {
    return { dir, files: [], version: 'empty' };
  }

  if (!persistentCache || forceRefresh) {
    persistentCache = loadPersistentCache(dir);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const txtFiles = entries.filter(e => 
    e.isFile() && 
    e.name.toLowerCase().endsWith('.txt') && 
    !e.name.startsWith('.')
  );

  const currentFileNames = new Set(txtFiles.map(e => e.name));
  let cacheModified = false;

  // Clean removed files from cache
  for (const cachedName of Object.keys(persistentCache)) {
    if (!currentFileNames.has(cachedName)) {
      delete persistentCache[cachedName];
      cacheModified = true;
    }
  }

  const results = await Promise.all(
    txtFiles.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        const cached = persistentCache[entry.name];

        // If file already cached and unchanged, reuse immediately without reading disk!
        if (!forceRefresh && cached && cached.sizeBytes === stat.size && cached.mtimeMs === stat.mtimeMs) {
          return {
            name: entry.name,
            path: fullPath,
            sizeBytes: cached.sizeBytes,
            sizeFormatted: cached.sizeFormatted || formatBytes(cached.sizeBytes),
            lineCount: cached.lineCount,
            mtimeMs: cached.mtimeMs,
            lastModified: cached.lastModified || stat.mtime.toISOString(),
            isActive: !excludedFiles.has(entry.name)
          };
        }

        // New or modified file: count lines and cache
        const lineCount = await countLines(fullPath, stat);
        const fileData = {
          name: entry.name,
          path: fullPath,
          sizeBytes: stat.size,
          sizeFormatted: formatBytes(stat.size),
          lineCount,
          mtimeMs: stat.mtimeMs,
          lastModified: stat.mtime.toISOString(),
          isActive: !excludedFiles.has(entry.name)
        };

        persistentCache[entry.name] = {
          sizeBytes: stat.size,
          sizeFormatted: fileData.sizeFormatted,
          lineCount,
          mtimeMs: stat.mtimeMs,
          lastModified: fileData.lastModified
        };
        cacheModified = true;

        return fileData;
      } catch (err) {
        return null;
      }
    })
  );

  if (cacheModified) {
    savePersistentCache(dir, persistentCache);
  }

  const validFiles = results.filter(Boolean).sort((a, b) => b.sizeBytes - a.sizeBytes);
  const totalBytes = validFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  const latestMtime = Math.max(...validFiles.map(f => f.mtimeMs || 0), 0);
  const version = `${validFiles.length}_${totalBytes}_${latestMtime}`;

  return {
    dir,
    files: validFiles,
    version
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
  if (persistentCache && persistentCache[oldName]) {
    persistentCache[safeNewName] = persistentCache[oldName];
    delete persistentCache[oldName];
    savePersistentCache(dir, persistentCache);
  }
  return { oldName, newName: safeNewName };
}

/**
 * Delete log files
 */
export function deleteLogFiles(filenames) {
  const dir = getLogsDirectory();
  const deleted = [];
  let cacheModified = false;

  for (const fn of filenames) {
    const fullPath = path.join(dir, fn);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      excludedFiles.delete(fn);
      deleted.push(fn);
      if (persistentCache && persistentCache[fn]) {
        delete persistentCache[fn];
        cacheModified = true;
      }
    }
  }

  if (cacheModified) {
    savePersistentCache(dir, persistentCache);
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
