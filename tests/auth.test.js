const request = require('supertest');
const app     = require('../src/app');
const { db }  = require('../src/database/db');

afterAll(() => { try { db.close(); } catch (_) {} });

describe('Auth - POST /api/auth/login', () => {
  it('200 - admin login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@oms.com', password: 'Admin@1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('200 - employee login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ivan@oms.com', password: 'Employee@1234' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('employee');
  });

  it('401 - invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@oms.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('401 - non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@oms.com', password: 'Admin@1234' });

    expect(res.status).toBe(401);
  });

  it('400 - missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@oms.com' });

    expect(res.status).toBe(400);
  });

  it('400 - empty request body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('Auth - GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@oms.com', password: 'Admin@1234' });
    token = res.body.token;
  });

  it('200 - returns current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin@oms.com');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('401 - without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 - invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.invalid');
    expect(res.status).toBe(401);
  });

  it('401 - header without Bearer', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', token);
    expect(res.status).toBe(401);
  });
});

describe('Auth - POST /api/auth/change-password', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@oms.com', password: 'Admin@1234' });
    token = res.body.token;
  });

  it('200 - successful password change and restore', async () => {
    const change = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Admin@1234', newPassword: 'NewPass@9999' });

    expect(change.status).toBe(200);

    const restore = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'NewPass@9999', newPassword: 'Admin@1234' });

    expect(restore.status).toBe(200);
  });

  it('401 - invalid current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongcurrent', newPassword: 'New@1234' });

    expect(res.status).toBe(401);
  });

  it('400 - new password too short', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Admin@1234', newPassword: '123' });

    expect(res.status).toBe(400);
  });

  it('401 - without token', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'Admin@1234', newPassword: 'New@1234' });

    expect(res.status).toBe(401);
  });
});
