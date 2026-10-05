const request = require('supertest');
const app    = require('../src/app');
const { db } = require('../src/database/db');

afterAll(() => { try { db.close(); } catch (_) {} });

let adminToken;
let employeeToken;
let createdUserId;

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

describe('Users - GET /api/users', () => {
  it('200 - admin gets list', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
    expect(res.body.users[0]).not.toHaveProperty('password');
  });

  it('403 - employee has no access', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });

  it('401 - without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('Users - POST /api/users', () => {
  it('201 - admin creates new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name    : 'Test Manager',
        email   : 'test.manager@oms.com',
        password: 'Manager@1234',
        role    : 'employee',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test.manager@oms.com');
    expect(res.body.user.role).toBe('employee');
    expect(res.body.user).not.toHaveProperty('password');

    createdUserId = res.body.user.id;
  });

  it('409 - duplicate email', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate', email: 'test.manager@oms.com',
        password: 'Pass@1234', role: 'employee',
      });

    expect(res.status).toBe(409);
  });

  it('400 - invalid role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Bad Role', email: 'bad@oms.com',
        password: 'Pass@1234', role: 'superuser',
      });

    expect(res.status).toBe(400);
  });

  it('400 - password too short', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Short', email: 'short@oms.com',
        password: '123', role: 'employee',
      });

    expect(res.status).toBe(400);
  });

  it('400 - missing required fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'missing@oms.com' });

    expect(res.status).toBe(400);
  });

  it('403 - employee cannot create users', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        name: 'Hack', email: 'hack@oms.com',
        password: 'Pass@1234', role: 'admin',
      });

    expect(res.status).toBe(403);
  });
});

describe('Users - GET /api/users/:id', () => {
  it('200 - admin gets user by ID', async () => {
    const res = await request(app)
      .get(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(createdUserId);
  });

  it('404 - non-existent ID', async () => {
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Users - PUT /api/users/:id', () => {
  it('200 - admin updates user data', async () => {
    const res = await request(app)
      .put(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Manager' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Manager');
  });

  it('400 - update with invalid role', async () => {
    const res = await request(app)
      .put(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'god' });

    expect(res.status).toBe(400);
  });
});

describe('Users - DELETE /api/users/:id', () => {
  it('200 - admin deactivates another user', async () => {
    const res = await request(app)
      .delete(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  it('401 - deactivated user cannot login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.manager@oms.com', password: 'Manager@1234' });

    expect(res.status).toBe(401);
  });

  it('400 - admin cannot deactivate themselves', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    const selfId = meRes.body.user.id;

    const res = await request(app)
      .delete(`/api/users/${selfId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});
