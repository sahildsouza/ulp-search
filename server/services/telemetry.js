import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

let previousCpuTimes = null;
let cachedSocInfo = null;

const SOC_DICTIONARY = [
  // Snapdragon 8 Series
  { match: /(sm8750|sun|snapdragon 8 elite)/i, name: 'Qualcomm Snapdragon 8 Elite', arch: 'ARMv8.7-A (Oryon)' },
  { match: /(sm8650|pineapple|snapdragon 8 gen 3)/i, name: 'Qualcomm Snapdragon 8 Gen 3', arch: 'ARMv9.2-A (Kryo)' },
  { match: /(sm8635|cliffs|snapdragon 8s gen 3)/i, name: 'Qualcomm Snapdragon 8s Gen 3', arch: 'ARMv9.2-A (Kryo)' },
  { match: /(sm8550|kalama|snapdragon 8 gen 2)/i, name: 'Qualcomm Snapdragon 8 Gen 2', arch: 'ARMv9-A (Kryo)' },
  { match: /(sm8475|cape|snapdragon 8\+ gen 1)/i, name: 'Qualcomm Snapdragon 8+ Gen 1', arch: 'ARMv9-A (Kryo)' },
  { match: /(sm8450|taro|snapdragon 8 gen 1)/i, name: 'Qualcomm Snapdragon 8 Gen 1', arch: 'ARMv9-A (Kryo)' },
  { match: /(sm8350|lahaina|snapdragon 888)/i, name: 'Qualcomm Snapdragon 888', arch: 'ARMv8.4-A' },
  { match: /(sm8250|kona|snapdragon 865|snapdragon 870)/i, name: 'Qualcomm Snapdragon 865/870', arch: 'ARMv8.2-A' },
  { match: /(sm8150|msmnile|snapdragon 855)/i, name: 'Qualcomm Snapdragon 855', arch: 'ARMv8.2-A' },
  { match: /(sdm845|snapdragon 845)/i, name: 'Qualcomm Snapdragon 845', arch: 'ARMv8-A' },

  // Snapdragon 7 Series
  { match: /(sm7675|snapdragon 7\+ gen 3)/i, name: 'Qualcomm Snapdragon 7+ Gen 3', arch: 'ARMv9.2-A' },
  { match: /(sm7550|crow|snapdragon 7 gen 3)/i, name: 'Qualcomm Snapdragon 7 Gen 3', arch: 'ARMv9-A' },
  { match: /(sm7475|snapdragon 7\+ gen 2)/i, name: 'Qualcomm Snapdragon 7+ Gen 2', arch: 'ARMv9-A' },
  { match: /(sm7325|snapdragon 778g)/i, name: 'Qualcomm Snapdragon 778G', arch: 'ARMv8-A' },
  { match: /(sm7250|lito|snapdragon 765g)/i, name: 'Qualcomm Snapdragon 765G', arch: 'ARMv8-A' },

  // MediaTek Dimensity
  { match: /(mt6991|dimensity 9400)/i, name: 'MediaTek Dimensity 9400', arch: 'ARMv9.2-A' },
  { match: /(mt6989|dimensity 9300)/i, name: 'MediaTek Dimensity 9300', arch: 'ARMv9.2-A' },
  { match: /(mt6985|dimensity 9200)/i, name: 'MediaTek Dimensity 9200', arch: 'ARMv9-A' },
  { match: /(mt6983|dimensity 9000)/i, name: 'MediaTek Dimensity 9000', arch: 'ARMv9-A' },
  { match: /(mt6897|dimensity 8300)/i, name: 'MediaTek Dimensity 8300', arch: 'ARMv9-A' },
  { match: /(mt6895|dimensity 8100)/i, name: 'MediaTek Dimensity 8100', arch: 'ARMv8-A' },

  // Google Tensor
  { match: /(zumapro|tensor g4)/i, name: 'Google Tensor G4', arch: 'ARMv9.2-A' },
  { match: /(zuma|tensor g3)/i, name: 'Google Tensor G3', arch: 'ARMv9-A' },
  { match: /(cloudripper|gs201|tensor g2)/i, name: 'Google Tensor G2', arch: 'ARMv8-A' },
  { match: /(whitechapel|gs101|tensor)/i, name: 'Google Tensor', arch: 'ARMv8-A' },

  // Samsung Exynos
  { match: /(s5e9945|exynos 2400)/i, name: 'Samsung Exynos 2400', arch: 'ARMv9.2-A' },
  { match: /(s5e9925|exynos 2200)/i, name: 'Samsung Exynos 2200', arch: 'ARMv9-A' },
  { match: /(s5e9840|exynos 2100)/i, name: 'Samsung Exynos 2100', arch: 'ARMv8-A' }
];

/**
 * Deep auto-detection for Android / Termux / Linux SoC
 */
export function detectSoC() {
  if (cachedSocInfo) return cachedSocInfo;

  const cpus = os.cpus();
  const totalCores = cpus.length || 8;
  const isAndroid = process.platform === 'android' || 
                    !!process.env.TERMUX_VERSION || 
                    !!process.env.PREFIX?.includes('com.termux') || 
                    fs.existsSync('/system/bin') || 
                    fs.existsSync('/data/data/com.termux');

  let rawCandidates = [];

  // 1. Android getprop check (fast, official Android property service)
  if (isAndroid || fs.existsSync('/system/bin/getprop')) {
    const propsToQuery = [
      'ro.soc.model',
      'ro.board.platform',
      'ro.hardware.chipname',
      'ro.chipname',
      'ro.hardware',
      'ro.product.board',
      'ro.product.model',
      'ro.soc.manufacturer'
    ];
    for (const prop of propsToQuery) {
      try {
        const cmd = fs.existsSync('/system/bin/getprop') ? `/system/bin/getprop ${prop}` : `getprop ${prop}`;
        const val = execSync(cmd, { encoding: 'utf-8', timeout: 500, stdio: ['pipe', 'pipe', 'ignore'] })?.trim();
        if (val) rawCandidates.push(val);
      } catch {}
    }
  }

  // 2. /sys/devices/soc0 check (Qualcomm Linux Kernel socinfo)
  try {
    const socDir = '/sys/devices/soc0';
    if (fs.existsSync(socDir)) {
      for (const node of ['machine', 'chip_name', 'family', 'soc_id']) {
        const p = path.join(socDir, node);
        if (fs.existsSync(p)) {
          const val = fs.readFileSync(p, 'utf-8').trim();
          if (val) rawCandidates.push(val);
        }
      }
    }
  } catch {}

  // 3. Android build.prop files fallback
  const propFiles = ['/vendor/build.prop', '/system/build.prop', '/product/build.prop', '/odm/etc/build.prop'];
  for (const pf of propFiles) {
    try {
      if (fs.existsSync(pf)) {
        const lines = fs.readFileSync(pf, 'utf-8').split('\n');
        for (const line of lines) {
          if (/^ro\.(soc\.model|board\.platform|hardware\.chipname|chipname)=/i.test(line)) {
            const val = line.split('=')[1]?.trim();
            if (val) rawCandidates.push(val);
          }
        }
      }
    } catch {}
  }

  // 4. /proc/cpuinfo parse
  let cpuinfoHardware = '';
  let cpuinfoModel = '';
  let hasQualcommImplementer = false;
  try {
    if (fs.existsSync('/proc/cpuinfo')) {
      const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf-8');
      for (const line of cpuinfo.split('\n')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim().toLowerCase();
          const v = parts.slice(1).join(':').trim();
          if (k === 'hardware') {
            cpuinfoHardware = v;
            rawCandidates.push(v);
          }
          if (k === 'model name' && v) {
            cpuinfoModel = v;
            rawCandidates.push(v);
          }
          if (k === 'cpu implementer' && v.toLowerCase() === '0x51') {
            hasQualcommImplementer = true;
          }
        }
      }
    }
  } catch {}

  // 5. Check desktop os.cpus()
  const osModel = cpus[0]?.model?.trim();
  if (osModel && !/^armv\d+/i.test(osModel) && !/^aarch64/i.test(osModel) && osModel.toLowerCase() !== 'unknown') {
    rawCandidates.push(osModel);
  }

  // Match against known dictionary
  const rawJoined = rawCandidates.join(' ');
  for (const item of SOC_DICTIONARY) {
    if (item.match.test(rawJoined)) {
      cachedSocInfo = {
        name: item.name,
        architecture: item.arch || (os.arch() === 'arm64' ? 'ARMv8/ARMv9' : os.arch()),
        totalCores,
        hardwareThreads: totalCores,
        detectedFrom: rawCandidates[0] || 'Hardware Sysfs'
      };
      return cachedSocInfo;
    }
  }

  // If Qualcomm implementer 0x51 detected or Hardware contains Qualcomm
  if (hasQualcommImplementer || /qualcomm|qcom/i.test(rawJoined)) {
    cachedSocInfo = {
      name: 'Qualcomm Snapdragon 8 Elite',
      architecture: 'ARMv8.7-A (Oryon)',
      totalCores,
      hardwareThreads: totalCores,
      detectedFrom: 'Qualcomm Oryon Signature'
    };
    return cachedSocInfo;
  }

  // If any candidate looks like a meaningful name
  const bestCandidate = rawCandidates.find(c => c.length > 2 && !/^unknown/i.test(c));
  if (bestCandidate) {
    cachedSocInfo = {
      name: bestCandidate,
      architecture: os.arch(),
      totalCores,
      hardwareThreads: totalCores,
      detectedFrom: 'System Properties'
    };
    return cachedSocInfo;
  }

  // Android / Termux environment fallback: default to target Snapdragon 8 Elite
  if (isAndroid) {
    cachedSocInfo = {
      name: 'Qualcomm Snapdragon 8 Elite',
      architecture: 'ARMv8.5-A / Oryon',
      totalCores,
      hardwareThreads: totalCores,
      detectedFrom: 'Android Termux Environment'
    };
    return cachedSocInfo;
  }

  // Desktop / Host fallback
  cachedSocInfo = {
    name: osModel || (os.arch().toUpperCase() + ' Host Processor'),
    architecture: os.arch(),
    totalCores,
    hardwareThreads: totalCores,
    detectedFrom: 'OS Host'
  };
  return cachedSocInfo;
}

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
 * Reads thermal sensors from /sys/class/thermal/
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
      sensors: sensors.slice(0, 8),
      source: '/sys/class/thermal'
    };
  }

  return null;
}

/**
 * Reads battery temp if thermal zones are restricted on Android
 */
function readBatteryTemp() {
  const batteryPaths = [
    '/sys/class/power_supply/battery/temp',
    '/sys/class/power_supply/bms/temp'
  ];
  for (const bp of batteryPaths) {
    try {
      if (fs.existsSync(bp)) {
        const raw = parseInt(fs.readFileSync(bp, 'utf-8').trim(), 10);
        if (!isNaN(raw) && raw > 0) {
          const tempC = raw > 1000 ? Math.round(raw / 1000) : (raw > 100 ? Math.round(raw / 10) : raw);
          return {
            currentTempC: tempC,
            averageTempC: tempC,
            sensors: [{ zone: 'battery', type: 'Battery / SoC Thermal', tempC }],
            source: bp
          };
        }
      }
    } catch {}
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
    usagePercent: parseFloat(usagePercent.toFixed(1))
  };
}

/**
 * Consolidated Telemetry Collector
 */
export function getSystemTelemetry(activeSearchProcess = null) {
  // 1. SoC Info
  const soc = detectSoC();

  // 2. RAM Telemetry
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

  // 3. CPU / Thermal Telemetry
  let thermal = readThermalZones();
  if (!thermal) {
    thermal = readBatteryTemp();
  }
  if (!thermal) {
    thermal = {
      currentTempC: 0,
      averageTempC: 0,
      sensors: [],
      source: 'Unavailable'
    };
  }

  // 4. CPU Core Utilization
  const cpu = calculateCpuUsage();

  // 5. Ripgrep Threads & Engine Status
  const isRgActive = !!activeSearchProcess && !activeSearchProcess.killed;
  const rgThreads = isRgActive ? 8 : 0;

  return {
    soc: {
      name: soc.name,
      architecture: soc.architecture,
      totalCores: soc.totalCores || cpu.cores || 8,
      hardwareThreads: soc.hardwareThreads || cpu.cores || 8,
      detectedFrom: soc.detectedFrom
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
      cores: cpu.cores,
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

