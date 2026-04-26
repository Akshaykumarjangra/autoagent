import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { processTask } from '../services/agents.js';

const router = Router();

// POST /api/agents/consultation - submit consultation request (after payment verified)
router.post('/consultation', async (req, res) => {
  try {
    const { taskId, topic, details, customerName } = req.body;

    if (!taskId || !topic) {
      return res.status(400).json({ error: 'taskId and topic are required' });
    }

    // Verify task exists and is valid
    const db = getDb();
    const task = db.prepare('SELECT * FROM agent_tasks WHERE id = ?').get(taskId);
    db.close();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status === 'completed') {
      const output = JSON.parse(task.output_data || '{}');
      return res.json({ status: 'completed', report: output.report });
    }

    // Update task input
    const db2 = getDb();
    db2.prepare('UPDATE agent_tasks SET input_data = ? WHERE id = ?').run(
      JSON.stringify({ topic, details, customerName }),
      taskId
    );
    db2.close();

    // Process asynchronously
    processTask(taskId).catch(err => console.error('[Agent Route] Consultation failed:', err));

    res.json({ status: 'processing', taskId, message: 'Consultation agent activated. Poll /api/agents/task/:id for status.' });
  } catch (error) {
    console.error('[Agent Route] Consultation error:', error);
    res.status(500).json({ error: 'Failed to start consultation' });
  }
});

// POST /api/agents/website - submit website generation request
router.post('/website', async (req, res) => {
  try {
    const { taskId, businessName, businessType, description, colorScheme } = req.body;

    if (!taskId) return res.status(400).json({ error: 'taskId is required' });

    const db = getDb();
    const task = db.prepare('SELECT * FROM agent_tasks WHERE id = ?').get(taskId);
    db.close();

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status === 'completed') {
      const output = JSON.parse(task.output_data || '{}');
      return res.json({ status: 'completed', html: output.html });
    }

    // Update task input
    const db2 = getDb();
    db2.prepare('UPDATE agent_tasks SET input_data = ? WHERE id = ?').run(
      JSON.stringify({ businessName, businessType, description, colorScheme }),
      taskId
    );
    db2.close();

    processTask(taskId).catch(err => console.error('[Agent Route] Website gen failed:', err));

    res.json({ status: 'processing', taskId, message: 'Website agent activated.' });
  } catch (error) {
    console.error('[Agent Route] Website error:', error);
    res.status(500).json({ error: 'Failed to start website generation' });
  }
});

// GET /api/agents/task/:id - poll task status
router.get('/task/:id', (req, res) => {
  try {
    const db = getDb();
    const task = db.prepare('SELECT * FROM agent_tasks WHERE id = ?').get(req.params.id);
    db.close();

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const response = {
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      error: task.error,
      createdAt: task.created_at,
      startedAt: task.started_at,
      completedAt: task.completed_at,
    };

    if (task.status === 'completed' && task.output_data) {
      response.output = JSON.parse(task.output_data);
    }

    res.json(response);
  } catch (error) {
    console.error('[Agent Route] Task fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// GET /api/agents/tasks - admin: list all tasks
router.get('/tasks', (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let query = 'SELECT id, payment_id, type, status, progress, error, created_at, started_at, completed_at FROM agent_tasks';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const tasks = db.prepare(query).all(...params);
    const counts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM agent_tasks
    `).get();

    db.close();

    res.json({ tasks, counts });
  } catch (error) {
    console.error('[Agent Route] Tasks list error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

export default router;
