/**
 * Downloads data as a text or json file in browser
 */
function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToTxt(items, filename = 'ulp_credentials.txt') {
  if (!items || items.length === 0) return;
  const lines = items.map(item => {
    if (item.userOrEmail && item.pass) {
      return `${item.userOrEmail}:${item.pass}`;
    }
    return item.raw || `${item.userOrEmail}:${item.pass}`;
  });
  downloadFile(lines.join('\n'), filename, 'text/plain;charset=utf-8');
}

export function exportToJson(items, filename = 'ulp_credentials.json') {
  if (!items || items.length === 0) return;
  const jsonStr = JSON.stringify(items, null, 2);
  downloadFile(jsonStr, filename, 'application/json;charset=utf-8');
}
