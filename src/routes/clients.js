const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const like = `%${search}%`;

    const clients = db.prepare(`
      SELECT
        c.*,
        u.name AS created_by_name,
        COUNT(DISTINCT o.id) AS orders_count
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN orders o ON o.client_id = c.id
      WHERE c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company LIKE ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(like, like, like, like, Number(limit), offset);

    const total = db.prepare(`
      SELECT COUNT(*) AS cnt FROM clients
      WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?
    `).get(like, like, like, like).cnt;

    res.json({ clients, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { name, email, phone, company, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Client name is required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO clients (id, name, email, phone, company, address, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email || null, phone || null, company || null, address || null, notes || null, req.user.id);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.status(201).json({ message: 'Client created', client });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const client = db.prepare(`
      SELECT c.*, u.name AS created_by_name
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!client) return res.status(404).json({ error: 'Client not found' });

    const orders = db.prepare(`
      SELECT o.*, u.name AS assigned_to_name
      FROM orders o
      LEFT JOIN users u ON o.assigned_to = u.id
      WHERE o.client_id = ?
      ORDER BY o.created_at DESC
    `).all(req.params.id);

    const interactions = db.prepare(`
      SELECT i.*, u.name AS created_by_name, o.title AS order_title
      FROM interactions i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN orders o ON i.order_id = o.id
      WHERE i.client_id = ?
      ORDER BY i.occurred_at DESC
    `).all(req.params.id);

    res.json({ client, orders, interactions });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { name, email, phone, company, address, notes } = req.body;
    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    db.prepare(`
      UPDATE clients SET
        name       = COALESCE(?, name),
        email      = COALESCE(?, email),
        phone      = COALESCE(?, phone),
        company    = COALESCE(?, company),
        address    = COALESCE(?, address),
        notes      = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name || null, email || null, phone || null, company || null, address || null, notes || null, req.params.id);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json({ message: 'Client updated', client });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', require('../middlewares/auth').authorize('admin'), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
