const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate);

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

router.get('/', (req, res, next) => {
  try {
    const {
      search = '',
      status,
      priority,
      client_id,
      assigned_to,
      page = 1,
      limit = 20,
    } = req.query;

    const conditions = [];
    const params = [];
    const like = `%${search}%`;

    if (search) {
      conditions.push('(o.title LIKE ? OR o.description LIKE ?)');
      params.push(like, like);
    }
    if (status)      { conditions.push('o.status = ?');      params.push(status); }
    if (priority)    { conditions.push('o.priority = ?');    params.push(priority); }
    if (client_id)   { conditions.push('o.client_id = ?');   params.push(client_id); }
    if (assigned_to) { conditions.push('o.assigned_to = ?'); params.push(assigned_to); }

    if (req.user.role === 'employee') {
      conditions.push('o.assigned_to = ?');
      params.push(req.user.id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const orders = db.prepare(`
      SELECT
        o.*,
        c.name  AS client_name,
        c.email AS client_email,
        u1.name AS assigned_to_name,
        u2.name AS created_by_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN users u1  ON o.assigned_to = u1.id
      LEFT JOIN users u2  ON o.created_by  = u2.id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    const total = db.prepare(`
      SELECT COUNT(*) AS cnt FROM orders o ${where}
    `).get(...params).cnt;

    res.json({ orders, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { client_id, title, description, status, priority, total_amount, due_date, assigned_to } = req.body;

    if (!client_id || !title) {
      return res.status(400).json({ error: 'client_id and title are required' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Allowed: ${VALID_PRIORITIES.join(', ')}` });
    }

    const clientExists = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
    if (!clientExists) return res.status(404).json({ error: 'Client not found' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO orders (id, client_id, title, description, status, priority, total_amount, due_date, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, client_id, title,
      description || null,
      status || 'pending',
      priority || 'medium',
      total_amount || 0,
      due_date || null,
      assigned_to || null,
      req.user.id
    );

    db.prepare(`
      INSERT INTO order_status_history (id, order_id, old_status, new_status, comment, changed_by)
      VALUES (?, ?, NULL, ?, 'Order created', ?)
    `).run(uuidv4(), id, status || 'pending', req.user.id);

    const order = db.prepare(`
      SELECT o.*, c.name AS client_name, u.name AS assigned_to_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN users u ON o.assigned_to = u.id
      WHERE o.id = ?
    `).get(id);

    res.status(201).json({ message: 'Order created', order });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const order = db.prepare(`
      SELECT
        o.*,
        c.name    AS client_name,
        c.email   AS client_email,
        c.phone   AS client_phone,
        u1.name   AS assigned_to_name,
        u2.name   AS created_by_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN users u1  ON o.assigned_to = u1.id
      LEFT JOIN users u2  ON o.created_by  = u2.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (req.user.role === 'employee' && order.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const statusHistory = db.prepare(`
      SELECT h.*, u.name AS changed_by_name
      FROM order_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.order_id = ?
      ORDER BY h.changed_at ASC
    `).all(req.params.id);

    const interactions = db.prepare(`
      SELECT i.*, u.name AS created_by_name
      FROM interactions i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.order_id = ?
      ORDER BY i.occurred_at DESC
    `).all(req.params.id);

    res.json({ order, statusHistory, interactions });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { title, description, status, priority, total_amount, due_date, assigned_to } = req.body;
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status` });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority` });
    }

    db.prepare(`
      UPDATE orders SET
        title        = COALESCE(?, title),
        description  = COALESCE(?, description),
        status       = COALESCE(?, status),
        priority     = COALESCE(?, priority),
        total_amount = COALESCE(?, total_amount),
        due_date     = COALESCE(?, due_date),
        assigned_to  = COALESCE(?, assigned_to),
        updated_at   = datetime('now')
      WHERE id = ?
    `).run(
      title || null, description || null, status || null, priority || null,
      total_amount ?? null, due_date || null, assigned_to || null,
      req.params.id
    );

    if (status && status !== existing.status) {
      db.prepare(`
        INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), req.params.id, existing.status, status, req.user.id);
    }

    const order = db.prepare(`
      SELECT o.*, c.name AS client_name, u.name AS assigned_to_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN users u ON o.assigned_to = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    res.json({ message: 'Order updated', order });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', (req, res, next) => {
  try {
    const { status, comment } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
    }

    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    db.prepare('UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, req.params.id);
    db.prepare(`
      INSERT INTO order_status_history (id, order_id, old_status, new_status, comment, changed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.params.id, existing.status, status, comment || null, req.user.id);

    res.json({ message: 'Status updated', status });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('admin'), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT id FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
