import { getSystemTelemetry } from '../services/telemetry.js';
import { activeSearchProcess } from './search.js';

export async function statsRoutes(fastify, options) {
  fastify.get('/api/system-stats', async (req, reply) => {
    const telemetry = getSystemTelemetry(activeSearchProcess);
    return telemetry;
  });
}
