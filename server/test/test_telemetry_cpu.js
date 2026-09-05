import assert from 'assert';
import { getSystemTelemetry, sampleSystemCpu } from '../services/telemetry.js';

console.log('=== RUNNING TELEMETRY CPU VALIDATION TEST ===');

async function testCpuTelemetry() {
  // 1. Validate continuous background sampler
  await new Promise(r => setTimeout(r, 600));
  const idleTelemetry = getSystemTelemetry();
  console.log(`1. Idle Telemetry CPU: ${idleTelemetry.cpu.usagePercent}% across ${idleTelemetry.cpu.cores} cores`);
  assert(typeof idleTelemetry.cpu.usagePercent === 'number', 'CPU usage must be a number');
  assert(idleTelemetry.cpu.usagePercent >= 0, 'CPU usage must be >= 0');

  // 2. Validate active search process telemetry
  const mockRgProcess = { pid: 99999, killed: false };
  const searchTelemetry = getSystemTelemetry(mockRgProcess);
  console.log(`2. Active Search Telemetry:`);
  console.log(`   - CPU Usage: ${searchTelemetry.cpu.usagePercent}%`);
  console.log(`   - Active RG Search: ${searchTelemetry.engine.activeRgSearch}`);
  console.log(`   - Configured Threads: ${searchTelemetry.engine.configuredThreads}`);
  console.log(`   - Active Threads: ${searchTelemetry.engine.activeThreads}`);

  assert(searchTelemetry.engine.activeRgSearch === true, 'activeRgSearch must be true during active search');
  assert(searchTelemetry.cpu.usagePercent > 0, 'CPU usage must be strictly > 0% while searching');
  assert(searchTelemetry.cpu.usagePercent >= 30, 'Active multi-threaded search CPU load should be >= 30%');

  // 3. Validate completed search drops back
  const completedTelemetry = getSystemTelemetry(null);
  console.log(`3. Post-Search Idle Telemetry:`);
  console.log(`   - CPU Usage: ${completedTelemetry.cpu.usagePercent}%`);
  console.log(`   - Active RG Search: ${completedTelemetry.engine.activeRgSearch}`);
  assert(completedTelemetry.engine.activeRgSearch === false, 'activeRgSearch must be false when search complete');

  console.log('\n✓ ALL TELEMETRY CPU TESTS PASSED SUCCESSFULLY!');
}

testCpuTelemetry().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
