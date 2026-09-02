import fs from 'fs';
import os from 'os';
import path from 'path';

let previousCpuTimes = null;

/**
 * Reads and parses /proc/meminfo for Android / Termux / Linux
 */
function readProcMeminfo() {
  try {
    if (!fs.existsSync('/proc/meminfo')) return null;
    const content = fs.readFileSync('/proc/meminfo', 'utf-8');
    const lines = content.split('\n');
    const data = {};

    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_]+):\s+(\d+)\s+kB/);
      if (match) {
        data[match[1]] = parseInt(match[2], 10) * 1024; // convert kB to bytes
      }
    }

    if (data.MemTotal) {
      const total = data.MemTotal;
      const free = data.MemFree || 0;
      const available = data.MemAvailable || (free + (data.Buffers || 0) + (data.Cached || 0));
      const used = total - available;
      const usagePercent = Math.min(100, Math.max(0, (used / total) * 100));

      return {
        total,
        used,
        free,
        available,
        usagePercent: parseFloat(usagePercent.toFixed(1)),
        buffers: data.Buffers || 0,
        cached: data.Cached || 0,
        source: '/proc/meminfo'
      };
    }
  } catch (err) {
    // Fallback if permission or file error
  }
  return null;
}

/**
 * Reads Snapdragon 8 Elite thermal sensors from /sys/class/thermal/
 */
function readThermalZones() {
  const thermalDir = '/sys/class/thermal';
  const sensors = [];

  try {
    if (fs.existsSync(thermalDir)) {
      const entries = fs.readdirSync(thermalDir);
      for (const entry of entries) {
        if (entry.startsWith('thermal_zone')) {
          const zonePath = path.join(thermalDir, entry);
          const typeFile = path.join(zonePath, 'type');
          const tempFile = path.join(zonePath, 'temp');

          if (fs.existsSync(typeFile) && fs.existsSync(tempFile)) {
            const type = fs.readFileSync(typeFile, 'utf-8').trim();
            const rawTemp = parseInt(fs.readFileSync(tempFile, 'utf-8').trim(), 10);
            const tempC = rawTemp > 1000 ? Math.round(rawTemp / 1000) : rawTemp;

            sensors.push({ zone: entry, type, tempC });
          }
        }
      }
    }
  } catch (err) {
    // Directory might not be readable
  }

  if (sensors.length > 0) {
    // Look for CPU/SoC specific Snapdragon sensors
    const cpuSensors = sensors.filter(s => 
      /cpu|soc|battery|pmic|oryon|qcom/i.test(s.type)
    );
    const primary = cpuSensors.length > 0 ? cpuSensors : sensors;
    const maxTemp = Math.max(...primary.map(s => s.tempC));
    const avgTemp = Math.round(primary.reduce((acc, s) => acc + s.tempC, 0) / primary.length);

    return {
      currentTempC: maxTemp,
      averageTempC: avgTemp,
      sensors: sensors.slice(0, 8), // top 8 sensors
      source: '/sys/class/thermal'
    };
  }

  return null;
}

/**
 * Calculate CPU Load across cores
 */
function calculateCpuUsage() {
  const cpus = os.cpus();
  let totalUser = 0;
  let totalNice = 0;
  let totalSys = 0;
  let totalIdle = 0;
  let totalIrq = 0;

  for (const cpu of cpus) {
    totalUser += cpu.times.user;
    totalNice += cpu.times.nice;
    totalSys += cpu.times.sys;
    totalIdle += cpu.times.idle;
    totalIrq += cpu.times.irq;
  }

  const currentTimes = {
    total: totalUser + totalNice + totalSys + totalIdle + totalIrq,
    idle: totalIdle
  };

  let usagePercent = 0;
  if (previousCpuTimes) {
    const totalDiff = currentTimes.total - previousCpuTimes.total;
    const idleDiff = currentTimes.idle - previousCpuTimes.idle;
    if (totalDiff > 0) {
      usagePercent = Math.min(100, Math.max(0, ((totalDiff - idleDiff) / totalDiff) * 100));
    }
  }
  previousCpuTimes = currentTimes;

  return {
    cores: cpus.length,
    usagePercent: parseFloat(usagePercent.toFixed(1)),
    model: cpus[0]?.model || 'Qualcomm Snapdragon 8 Elite'
  };
}

/**
 * Consolidated Telemetry Collector with Snapdragon 8 Elite specifications
 */
export function getSystemTelemetry(activeSearchProcess = null) {
  // 1. RAM Telemetry
  let mem = readProcMeminfo();
  if (!mem) {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    mem = {
      total,
      used,
      free,
      available: free,
      usagePercent: parseFloat(((used / total) * 100).toFixed(1)),
      buffers: 0,
      cached: 0,
      source: 'os.memory (host fallback)'
    };
  }

  // 2. CPU / Thermal Telemetry
  let thermal = readThermalZones();
  if (!thermal) {
    thermal = {
      currentTempC: 0,
      averageTempC: 0,
      sensors: [],
      source: 'Unavailable'
    };
  }

  // 3. CPU Core Utilization
  const cpu = calculateCpuUsage();

  // 4. Ripgrep Threads & Engine Status
  const isRgActive = !!activeSearchProcess && !activeSearchProcess.killed;
  const rgThreads = isRgActive ? 8 : 0; // -j 8 parameter for Snapdragon 8 Elite

  return {
    soc: {
      name: 'Qualcomm Snapdragon 8 Elite',
      architecture: 'ARMv8.5-A / Oryon 2nd Gen',
      primeCores: 2,
      perfCores: 6,
      totalCores: 8,
      hardwareThreads: 8
    },
    ram: {
      totalBytes: mem.total,
      usedBytes: mem.used,
      freeBytes: mem.free,
      availableBytes: mem.available,
      usagePercent: mem.usagePercent,
      source: mem.source
    },
    thermal: {
      currentTempC: thermal.currentTempC,
      averageTempC: thermal.averageTempC,
      sensors: thermal.sensors,
      status: thermal.currentTempC > 70 ? 'CRITICAL' : (thermal.currentTempC > 55 ? 'WARM' : 'OPTIMAL')
    },
    cpu: {
      cores: 8,
      usagePercent: cpu.usagePercent,
      loadAvg: os.loadavg()
    },
    engine: {
      activeRgSearch: isRgActive,
      configuredThreads: 8,
      activeThreads: rgThreads,
      pid: activeSearchProcess?.pid || null
    },
    uptimeSeconds: Math.floor(os.uptime()),
    timestamp: Date.now()
  };
}
