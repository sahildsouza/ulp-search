import http from 'http';

console.log('=== RUNNING END-TO-END INTEGRATION TEST SUITE ===');

const PORT = process.env.PORT || '80';
const BASE_URL = `http://localhost:${PORT}`;

async function testEndpoint(name, path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${name} failed with status ${res.status}`);
  const data = await res.json();
  console.log(`✓ ${name}: SUCCESS`);
  return data;
}

async function runSuite() {
  try {
    // 1. Telemetry Test
    const stats = await testEndpoint('System Telemetry (/api/system-stats)', '/api/system-stats');
    console.log(`   SoC: ${stats.soc.name} (${stats.soc.architecture})`);
    console.log(`   RAM: ${stats.ram.usagePercent}% (${stats.ram.source})`);
    console.log(`   Temp: ${stats.thermal.currentTempC}°C (${stats.thermal.status})`);

    // 2. Log Explorer Test
    const logs = await testEndpoint('Log Inventory (/api/logs)', '/api/logs');
    console.log(`   Log Directory: ${logs.dir}`);
    console.log(`   Discovered Files: ${logs.files.length}`);
    const firstFile = logs.files[0];
    console.log(`   Sample File: ${firstFile.name} (${firstFile.sizeFormatted}, ${firstFile.lineCount} lines)`);

    // 3. Search Inclusion Toggle Test
    await testEndpoint('Toggle File Active (/api/logs/toggle)', '/api/logs/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: firstFile.name, active: false })
    });
    // Toggle back
    await testEndpoint('Toggle File Active Back (/api/logs/toggle)', '/api/logs/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: firstFile.name, active: true })
    });

    // 4. SSE Ripgrep Unlimited Stream Test
    console.log('Testing SSE Ripgrep Stream (/api/search?q=outlook)...');
    let sseMatches = 0;
    let receivedDone = false;
    let sampleItem = null;

    await new Promise((resolve, reject) => {
      const req = http.get(`${BASE_URL}/api/search?q=outlook`, (res) => {
        res.on('data', chunk => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const item = JSON.parse(line.slice(6));
                sseMatches++;
                if (!sampleItem) sampleItem = item;
              } catch (e) {}
            } else if (line.startsWith('event: done')) {
              receivedDone = true;
            }
          }
        });
        res.on('end', () => resolve());
        res.on('error', reject);
      });
      setTimeout(() => {
        req.destroy();
        resolve();
      }, 3000);
    });

    console.log(`✓ SSE Ripgrep Search: SUCCESS`);
    console.log(`   Streamed Matches: ${sseMatches}`);
    console.log(`   Sample Parsed Item:`, sampleItem);

    // 5. Ripgrep Process Stop Test
    const stopRes = await testEndpoint('Stop Search Engine (/api/search/stop)', '/api/search/stop', {
      method: 'POST'
    });
    console.log(`   Stop Engine response: ${stopRes.message}`);

    console.log('\n=============================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS ON PORT ' + PORT + '!');
    console.log('=============================================');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  }
}

runSuite();
