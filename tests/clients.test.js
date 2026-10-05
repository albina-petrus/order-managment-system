const request = require('supertest');
const app     = require('../src/app');
const { db }  = require('../src/database/db');

afterAll(() => { try { db.close(); } catch (_) {} });

let adminToken;
let employeeToken;
let testClientId;

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

describe('Clients - GET /api/clients', () => {
  it('200 - clients list with pagination', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clients');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(Array.isArray(res.body.clients)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it('200 - search by name (Alpha)', async () => {
    const res = await request(app)
      .get('/api/clients?search=Alpha')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.clients.length).toBeGreaterThanOrEqual(1);
    expect(res.body.clients[0].name).toMatch(/Alpha/i);
  });

  it('200 - search by email', async () => {
    const res = await request(app)
      .get('/api/clients?search=alpha.com')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.clients.length).toBeGreaterThanOrEqual(1);
  });

  it('200 - pagination (limit=1)', async () => {
    const res = await request(app)
      .get('/api/clients?limit=1&page=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.clients.length).toBe(1);
    expect(res.body.limit).toBe(1);
  });

  it('200 - employee also sees clients', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
  });

  it('401 - without token', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(401);
  });
});

describe('Clients - POST /api/clients', () => {
  it('201 - creating new client', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name   : 'Test Company LLC',
        email  : 'test@company.com',
        phone  : '+12025550199',
        company: 'Test Company',
        address: 'New York, Broadway 1',
        notes  : 'Test client',
      });

    expect(res.status).toBe(201);
    expect(res.body.client.name).toBe('Test Company LLC');
    expect(res.body.client).toHaveProperty('id');
    expect(res.body.client).toHaveProperty('created_at');

    testClientId = res.body.client.id;
  });

  it('201 - minimal data (only name)', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Minimal client' });

    expect(res.status).toBe(201);
  });

  it('400 - missing client name', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'noname@ua.com' });

    expect(res.status).toBe(400);
  });
});

describe('Clients - GET /api/clients/:id', () => {
  it('200 - client details with orders and interactions', async () => {
    const res = await request(app)
      .get(`/api/clients/${testClientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('client');
    expect(res.body).toHaveProperty('orders');
    expect(res.body).toHaveProperty('interactions');
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(Array.isArray(res.body.interactions)).toBe(true);
    expect(res.body.client.id).toBe(testClientId);
  });

  it('404 - non-existent client', async () => {
    const res = await request(app)
      .get('/api/clients/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Clients - PUT /api/clients/:id', () => {
  it('200 - updating client', async () => {
    const res = await request(app)
      .put(`/api/clients/${testClientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '+12025550001', notes: 'Updated note' });

    expect(res.status).toBe(200);
    expect(res.body.client.phone).toBe('+12025550001');
    expect(res.body.client.notes).toBe('Updated note');
  });

  it('200 - employee can also update', async () => {
    const res = await request(app)
      .put(`/api/clients/${testClientId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ notes: 'Employee updated note' });

    expect(res.status).toBe(200);
  });

  it('404 - non-existent client', async () => {
    const res = await request(app)
      .put('/api/clients/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

describe('Clients - DELETE /api/clients/:id', () => {
  let deleteTargetId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Client for deletion' });
    deleteTargetId = res.body.client.id;
  });

  it('403 - employee cannot delete', async () => {
    const res = await request(app)
      .delete(`/api/clients/${deleteTargetId}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });

  it('200 - admin deletes client', async () => {
    const res = await request(app)
      .delete(`/api/clients/${deleteTargetId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('404 - deleted client not found', async () => {
    const res = await request(app)
      .get(`/api/clients/${deleteTargetId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
