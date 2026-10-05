const express = require('express');
const { db } = require('../database/db');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userFilter = isAdmin ? '' : `AND o.assigned_to = '${req.user.id}'`;

    const totalClients = db.prepare('SELECT COUNT(*) AS cnt FROM clients').get().cnt;

    const orderStats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending'     THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'completed'   THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'cancelled'   THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'on_hold'     THEN 1 ELSE 0 END) AS on_hold,
        COALESCE(SUM(total_amount), 0)                          AS total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS completed_revenue
      FROM orders o WHERE 1=1 ${userFilter}
    `).get();

    const totalInteractions = db.prepare(`
      SELECT COUNT(*) AS cnt FROM interactions
    `).get().cnt;

    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount
      FROM orders o WHERE 1=1 ${userFilter}
      GROUP BY status
    `).all();

    const ordersByPriority = db.prepare(`
      SELECT priority, COUNT(*) AS count
      FROM orders o WHERE 1=1 ${userFilter}
      GROUP BY priority
    `).all();

    const interactionsByType = db.prepare(`
      SELECT type, COUNT(*) AS count FROM interactions GROUP BY type
    `).all();

    const recentOrders = db.prepare(`
      SELECT o.id, o.title, o.status, o.priority, o.total_amount, o.created_at,
             c.name AS client_name
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE 1=1 ${userFilter}
      ORDER BY o.created_at DESC LIMIT 5
    `).all();

    const recentInteractions = db.prepare(`
      SELECT i.id, i.type, i.subject, i.occurred_at,
             c.name AS client_name,
             u.name AS created_by_name
      FROM interactions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN users   u ON i.created_by = u.id
      ORDER BY i.occurred_at DESC LIMIT 5
    `).all();

    const monthlyTrend = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) AS month,
        COUNT(*) AS count,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM orders o
      WHERE created_at >= date('now', '-6 months') ${userFilter.replace('AND', 'AND')}
      GROUP BY month
      ORDER BY month ASC
    `).all();

    const topClients = db.prepare(`
      SELECT c.id, c.name, COUNT(o.id) AS orders_count,
             COALESCE(SUM(o.total_amount), 0) AS total_revenue
      FROM clients c
      LEFT JOIN orders o ON o.client_id = c.id
      GROUP BY c.id
      ORDER BY orders_count DESC
      LIMIT 5
    `).all();

    res.json({
      kpis: {
        totalClients,
        totalOrders: orderStats.total,
        totalInteractions,
        totalRevenue: orderStats.total_revenue,
        completedRevenue: orderStats.completed_revenue,
        orders: {
          pending:     orderStats.pending,
          in_progress: orderStats.in_progress,
          completed:   orderStats.completed,
          cancelled:   orderStats.cancelled,
          on_hold:     orderStats.on_hold,
        },
      },
      charts: {
        ordersByStatus,
        ordersByPriority,
        interactionsByType,
        monthlyTrend,
      },
      recentOrders,
      recentInteractions,
      topClients,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
