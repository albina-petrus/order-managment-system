const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate);

const VALID_TYPES = ['call', 'email', 'meeting', 'note'];

router.get('/', (req, res, next) => {
  try {
    const { client_id, order_id, type, page = 1, limit = 20 } = req.query;

    const conditions = [];
    const params = [];

    if (client_id) { conditions.push('i.client_id = ?'); params.push(client_id); }
    if (order_id)  { conditions.push('i.order_id = ?');  params.push(order_id); }
    if (type && VALID_TYPES.includes(type)) { conditions.push('i.type = ?'); params.push(type); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const interactions = db.prepare(`
      SELECT
        i.*,
        c.name  AS client_name,
        o.title AS order_title,
        u.name  AS created_by_name
      FROM interactions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN orders  o ON i.order_id  = o.id
      LEFT JOIN users   u ON i.created_by = u.id
      ${where}
      ORDER BY i.occurred_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    const total = db.prepare(`
      SELECT COUNT(*) AS cnt FROM interactions i ${where}
    `).get(...params).cnt;

    res.json({ interactions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { client_id, order_id, type, subject, description, occurred_at } = req.body;

    if (!client_id || !type || !subject) {
      return res.status(400).json({ error: 'client_id, type, and subject are required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Allowed: ${VALID_TYPES.join(', ')}` });
    }

    const clientExists = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
    if (!clientExists) return res.status(404).json({ error: 'Client not found' });

    if (order_id) {
      const orderExists = db.prepare('SELECT id FROM orders WHERE id = ?').get(order_id);
      if (!orderExists) return res.status(404).json({ error: 'Order not found' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO interactions (id, client_id, order_id, type, subject, description, occurred_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), ?)
    `).run(id, client_id, order_id || null, type, subject, description || null, occurred_at || null, req.user.id);

    const interaction = db.prepare(`
      SELECT i.*, c.name AS client_name, o.title AS order_title, u.name AS created_by_name
      FROM interactions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN orders  o ON i.order_id = o.id
      LEFT JOIN users   u ON i.created_by = u.id
      WHERE i.id = ?
    `).get(id);

    res.status(201).json({ message: 'Interaction recorded', interaction });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const interaction = db.prepare(`
      SELECT i.*, c.name AS client_name, o.title AS order_title, u.name AS created_by_name
      FROM interactions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN orders  o ON i.order_id = o.id
      LEFT JOIN users   u ON i.created_by = u.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interaction) return res.status(404).json({ error: 'Interaction not found' });
    res.json({ interaction });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { type, subject, description, occurred_at } = req.body;
    const existing = db.prepare('SELECT * FROM interactions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Interaction not found' });

    if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the author or an admin can edit' });
    }

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type` });
    }

    db.prepare(`
      UPDATE interactions SET
        type        = COALESCE(?, type),
        subject     = COALESCE(?, subject),
        description = COALESCE(?, description),
        occurred_at = COALESCE(?, occurred_at)
      WHERE id = ?
    `).run(type || null, subject || null, description || null, occurred_at || null, req.params.id);

    const interaction = db.prepare(`
      SELECT i.*, c.name AS client_name, o.title AS order_title, u.name AS created_by_name
      FROM interactions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN orders  o ON i.order_id = o.id
      LEFT JOIN users   u ON i.created_by = u.id
      WHERE i.id = ?
    `).get(req.params.id);

    res.json({ message: 'Interaction updated', interaction });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM interactions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Interaction not found' });

    if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the author or an admin can delete' });
    }

    db.prepare('DELETE FROM interactions WHERE id = ?').run(req.params.id);
    res.json({ message: 'Interaction deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
