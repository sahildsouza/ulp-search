export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat().format(num);
}

export function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatDuration(ms) {
  if (!ms || ms < 1000) return `${ms || 0}ms`;
  const sec = (ms / 1000).toFixed(1);
  return `${sec}s`;
}
