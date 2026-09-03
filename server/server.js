import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

import { searchRoutes } from './routes/search.js';
import { logRoutes } from './routes/logs.js';
import { statsRoutes } from './routes/stats.js';
import { getSystemTelemetry } from './services/telemetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'warn'
  }
});

// Enable CORS for development frontend
await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Register API Routes
await fastify.register(searchRoutes);
await fastify.register(logRoutes);
await fastify.register(statsRoutes);

// Serve static frontend in production if built
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  await fastify.register(fastifyStatic, {
    root: publicDir,
    prefix: '/'
  });

  // SPA fallback to index.html
  fastify.setNotFoundHandler((req, reply) => {
    if (req.raw.url && !req.raw.url.startsWith('/api')) {
      reply.sendFile('index.html');
    } else {
      reply.code(404).send({ error: 'Endpoint not found' });
    }
  });
}

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: error.message
  });
});

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// On Android Termux (unrooted), ports < 1024 are restricted; default seamlessly to 8080
const isTermux = Boolean(process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux'));
const DEFAULT_PORT = isTermux ? 8080 : 80;
let PORT = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const HOST = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
} catch (err) {
  if (err.code === 'EACCES' && PORT === 80) {
    PORT = 8080;
    try {
      await fastify.listen({ port: PORT, host: HOST });
    } catch (fallbackErr) {
      fastify.log.error(fallbackErr);
      process.exit(1);
    }
  } else {
    fastify.log.error(err);
    process.exit(1);
  }
}

const localUrl = PORT === 80 ? 'http://localhost' : `http://localhost:${PORT}`;
const netIp = getNetworkIp();
const networkUrl = PORT === 80 ? `http://${netIp}` : `http://${netIp}:${PORT}`;

const telemetry = getSystemTelemetry();
const socName = telemetry.soc?.name || os.cpus()[0]?.model?.trim() || 'Generic CPU';
const osName = telemetry.os?.distro || (isTermux ? 'Termux' : os.type());
const arch = os.arch();

console.log(`\n┌──────────────────────────────────────────────────────────────┐`);
console.log(`│  🚀 ULP DATA STREAM INSPECTOR · FASTIFY SERVER ONLINE        │`);
console.log(`├──────────────────────────────────────────────────────────────┤`);
console.log(`│  📡 Local:    ${localUrl.padEnd(47)}│`);
console.log(`│  📡 Network:  ${networkUrl.padEnd(47)}│`);
console.log(`│  ⚙️  Platform: ${(osName + ' (' + arch + ')').padEnd(47)}│`);
console.log(`│  ⚡ Chipset:  ${socName.slice(0, 47).padEnd(47)}│`);
console.log(`└──────────────────────────────────────────────────────────────┘\n`);
