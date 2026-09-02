import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { searchRoutes } from './routes/search.js';
import { logRoutes } from './routes/logs.js';
import { statsRoutes } from './routes/stats.js';

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

const DEFAULT_PORT = 80;
let PORT = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const HOST = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
} catch (err) {
  if (err.code === 'EACCES' && PORT === 80) {
    console.warn(`\n⚠️  [PERMISSION NOTICE] Port 80 is a privileged port (<1024).`);
    console.warn(`   In Android Termux without root ('tsu'), binding to port 80 may be restricted.`);
    console.warn(`   Auto-switching to port 8080 so your server starts immediately...\n`);
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
console.log(`\n======================================================`);
console.log(`🚀 ULP Data Stream Inspector Fastify Server Online!`);
console.log(`📡 Local URL:   ${localUrl}`);
console.log(`📡 Network URL: http://${HOST === '0.0.0.0' ? '<device-ip>' : HOST}${PORT === 80 ? '' : ':' + PORT}`);
console.log(`⚙️  Active Port: ${PORT} (Default: 80)`);
console.log(`⚙️  Target:      Snapdragon 8 Elite / Android Termux`);
console.log(`======================================================\n`);
