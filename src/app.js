require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { initDatabase } = require('./database/db');
const { seedDatabase }  = require('./database/seed');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const clientsRoutes      = require('./routes/clients');
const ordersRoutes       = require('./routes/orders');
const interactionsRoutes = require('./routes/interactions');
const dashboardRoutes    = require('./routes/dashboard');

initDatabase();
seedDatabase();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.use('/api/auth',         authRoutes);
app.use('/api/users',        usersRoutes);
app.use('/api/clients',      clientsRoutes);
app.use('/api/orders',       ordersRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/dashboard',    dashboardRoutes);

// Додаємо роздачу статики фронтенду для деплою
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return notFound(req, res);
  }
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

app.use(errorHandler);

module.exports = app;
