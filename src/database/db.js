const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database.sqlite';
const resolvedPath = DB_PATH === ':memory:' ? ':memory:' : path.resolve(DB_PATH);
const db = new Database(resolvedPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      email        TEXT,
      phone        TEXT,
      company      TEXT,
      address      TEXT,
      notes        TEXT,
      created_by   TEXT REFERENCES users(id),
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id           TEXT PRIMARY KEY,
      client_id    TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      description  TEXT,
      status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending','in_progress','completed','cancelled','on_hold')),
      priority     TEXT NOT NULL DEFAULT 'medium'
                   CHECK(priority IN ('low','medium','high','urgent')),
      total_amount REAL DEFAULT 0,
      due_date     TEXT,
      assigned_to  TEXT REFERENCES users(id),
      created_by   TEXT REFERENCES users(id),
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS interactions (
      id          TEXT PRIMARY KEY,
      client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      order_id    TEXT REFERENCES orders(id) ON DELETE SET NULL,
      type        TEXT NOT NULL CHECK(type IN ('call','email','meeting','note')),
      subject     TEXT NOT NULL,
      description TEXT,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by  TEXT REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id          TEXT PRIMARY KEY,
      order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      old_status  TEXT,
      new_status  TEXT NOT NULL,
      comment     TEXT,
      changed_by  TEXT REFERENCES users(id),
      changed_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { db, initDatabase };
