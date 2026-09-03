wimport {
  listLogFiles,
    toggleFileActive,
    setFilesActive,
    renameLogFile,
    deleteLogFiles
} from '../services/logManager.js';
import { generateMockLogs } from '../../generate_mock_data.js';

export async function logRoutes(fastify, options) {
  // List all log files with metadata and line counts
  fastify.get('/api/logs', async (req, reply) => {
    const data = await listLogFiles();
    return data;
  });

  // Toggle single file active state
  fastify.post('/api/logs/toggle', async (req, reply) => {
    const { filename, active } = req.body || {};
    if (!filename) {
      reply.code(400);
      return { error: 'Filename is required' };
    }
    toggleFileActive(filename, active);
    return { success: true, filename, active };
  });

  // Bulk toggle files active state
  fastify.post('/api/logs/bulk-toggle', async (req, reply) => {
    const { filenames, active } = req.body || {};
    if (!Array.isArray(filenames)) {
      reply.code(400);
      return { error: 'filenames array is required' };
    }
    setFilesActive(filenames, active);
    return { success: true, count: filenames.length, active };
  });

  // Rename a log file
  fastify.post('/api/logs/rename', async (req, reply) => {
    const { oldName, newName } = req.body || {};
    if (!oldName || !newName) {
      reply.code(400);
      return { error: 'oldName and newName are required' };
    }
    try {
      const result = renameLogFile(oldName, newName);
      return { success: true, ...result };
    } catch (err) {
      reply.code(400);
      return { error: err.message };
    }
  });

  // Batch delete log files
  fastify.post('/api/logs/delete', async (req, reply) => {
    const { filenames } = req.body || {};
    if (!Array.isArray(filenames) || filenames.length === 0) {
      reply.code(400);
      return { error: 'filenames array is required' };
    }
    const deleted = deleteLogFiles(filenames);
    return { success: true, deleted };
  });

  // Generate mock logs
  fastify.post('/api/logs/generate-mock', async (req, reply) => {
    const { count = 25000, filename = `test_combo_${Date.now()}.txt` } = req.body || {};
    try {
      generateMockLogs([{ name: filename, lines: Math.min(100000, Math.max(1000, count)) }]);
      const data = await listLogFiles();
      return { success: true, filename, data };
    } catch (err) {
      reply.code(500);
      return { error: err.message };
    }
  });
}
