const request = require('supertest');
const app    = require('../src/app');
const { db } = require('../src/database/db');

afterAll(() => { try { db.close(); } catch (_) {} });

let adminToken;
let employeeToken;

beforeAll(async () => {
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@oms.com', password: 'Admin@1234' });
  adminToken = adminRes.body.token;

  const empRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ivan@oms.com', password: 'Employee@1234' });
  employeeToken = empRes.body.token;
});

describe('Dashboard - GET /api/dashboard', () => {
  it('200 - admin receives full dashboard', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('charts');
    expect(res.body).toHaveProperty('recentOrders');
    expect(res.body).toHaveProperty('recentInteractions');
    expect(res.body).toHaveProperty('topClients');
  });

  it('KPIs contain all required fields', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { kpis } = res.body;
    expect(kpis).toHaveProperty('totalClients');
    expect(kpis).toHaveProperty('totalOrders');
    expect(kpis).toHaveProperty('totalInteractions');
    expect(kpis).toHaveProperty('totalRevenue');
    expect(kpis).toHaveProperty('completedRevenue');
    expect(kpis).toHaveProperty('orders');
    expect(kpis.orders).toHaveProperty('pending');
    expect(kpis.orders).toHaveProperty('in_progress');
    expect(kpis.orders).toHaveProperty('completed');
    expect(kpis.orders).toHaveProperty('cancelled');
    expect(kpis.orders).toHaveProperty('on_hold');
  });

  it('KPIs have correct numerical values (seed data)', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { kpis } = res.body;
    expect(kpis.totalClients).toBeGreaterThanOrEqual(3);
    expect(kpis.totalOrders).toBeGreaterThanOrEqual(4);
    expect(kpis.totalInteractions).toBeGreaterThanOrEqual(4);
    expect(kpis.totalRevenue).toBeGreaterThan(0);
    expect(typeof kpis.totalRevenue).toBe('number');
  });

  it('Charts contain all sections', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { charts } = res.body;
    expect(charts).toHaveProperty('ordersByStatus');
    expect(charts).toHaveProperty('ordersByPriority');
    expect(charts).toHaveProperty('interactionsByType');
    expect(charts).toHaveProperty('monthlyTrend');

    expect(Array.isArray(charts.ordersByStatus)).toBe(true);
    expect(Array.isArray(charts.ordersByPriority)).toBe(true);
    expect(Array.isArray(charts.interactionsByType)).toBe(true);
    expect(Array.isArray(charts.monthlyTrend)).toBe(true);
  });

  it('ordersByStatus has fields status, count, amount', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const first = res.body.charts.ordersByStatus[0];
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('count');
    expect(first).toHaveProperty('amount');
  });

  it('recentOrders - array with fields id, title, status', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.recentOrders.length).toBeGreaterThanOrEqual(1);
    const order = res.body.recentOrders[0];
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('title');
    expect(order).toHaveProperty('status');
    expect(order).toHaveProperty('client_name');
  });

  it('topClients - array with orders_count and total_revenue', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(Array.isArray(res.body.topClients)).toBe(true);
    if (res.body.topClients.length > 0) {
      const client = res.body.topClients[0];
      expect(client).toHaveProperty('orders_count');
      expect(client).toHaveProperty('total_revenue');
      expect(client).toHaveProperty('name');
    }
  });

  it('200 - employee also receives dashboard', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('charts');
  });

  it('401 - without token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('Health Check - GET /api/health', () => {
  it('200 - public endpoint without authorization', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('version');
  });
});

describe('404 - unknown routes', () => {
  it('404 - GET /api/unknown', async () => {
    const res = await request(app)
      .get('/api/unknown')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('404 - POST /api/nonexistent', async () => {
    const res = await request(app)
      .post('/api/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(404);
  });
});
