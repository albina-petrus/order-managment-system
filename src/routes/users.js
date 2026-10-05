const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin'), (req, res, next) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, role, is_active, created_at, updated_at
      FROM users ORDER BY created_at DESC
    `).all();
    res.json({ users, total: users.length });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('admin'), (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed: admin, employee' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const id = uuidv4();
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, email, hashed, role);

    const user = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('admin'), (req, res, next) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorize('admin'), (req, res, next) => {
  try {
    const { name, email, role, is_active } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (role && !['admin', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    db.prepare(`
      UPDATE users SET
        name       = COALESCE(?, name),
        email      = COALESCE(?, email),
        role       = COALESCE(?, role),
        is_active  = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name || null, email || null, role || null, is_active ?? null, req.params.id);

    const user = db.prepare('SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ message: 'User updated', user });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('admin'), (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate own account' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    db.prepare('UPDATE users SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
