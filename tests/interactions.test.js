const request = require('supertest');
const app    = require('../src/app');
const { db } = require('../src/database/db');

afterAll(() => { try { db.close(); } catch (_) {} });

let adminToken;
let employeeToken;
let employeeId;
let testClientId;
let testOrderId;
let adminInteractionId;
let employeeInteractionId;

beforeAll(async () => {
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@oms.com', password: 'Admin@1234' });
  adminToken = adminLogin.body.token;

  const empLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ivan@oms.com', password: 'Employee@1234' });
  employeeToken = empLogin.body.token;

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${employeeToken}`);
  employeeId = meRes.body.user.id;

  const clientRes = await request(app)
    .post('/api/clients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Interactions Test Client' });
  testClientId = clientRes.body.client.id;

  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ client_id: testClientId, title: 'Interactions Test Order', assigned_to: employeeId });
  testOrderId = orderRes.body.order.id;

  const adminIntRes = await request(app)
    .post('/api/interactions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      client_id  : testClientId,
      order_id   : testOrderId,
      type       : 'call',
      subject    : 'Admin call',
      description: 'Discussed details',
    });
  adminInteractionId = adminIntRes.body.interaction.id;

  const empIntRes = await request(app)
    .post('/api/interactions')
    .set('Authorization', `Bearer ${employeeToken}`)
    .send({
      client_id  : testClientId,
      type       : 'email',
      subject    : 'Email from employee',
      description: 'Sent documents',
    });
  employeeInteractionId = empIntRes.body.interaction.id;
});

describe('Interactions - GET /api/interactions', () => {
  it('200 - list all interactions', async () => {
    const res = await request(app)
      .get('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.interactions)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it('200 - filter by type (call)', async () => {
    const res = await request(app)
      .get('/api/interactions?type=call')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.interactions.forEach(i => expect(i.type).toBe('call'));
  });

  it('200 - filter by client_id', async () => {
    const res = await request(app)
      .get(`/api/interactions?client_id=${testClientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.interactions.forEach(i => expect(i.client_id).toBe(testClientId));
  });

  it('200 - filter by order_id', async () => {
    const res = await request(app)
      .get(`/api/interactions?order_id=${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.interactions.length).toBe(1);
    expect(res.body.interactions[0].id).toBe(adminInteractionId);
  });
});

describe('Interactions - POST /api/interactions', () => {
  it('201 - all types saved correctly', async () => {
    const types = ['call', 'email', 'meeting', 'note'];

    for (const type of types) {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ client_id: testClientId, type, subject: `Test ${type}` });

      expect(res.status).toBe(201);
      expect(res.body.interaction.type).toBe(type);
      expect(res.body.interaction.client_name).toBe('Interactions Test Client');
    }
  });

  it('201 - interaction tied to order', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: testClientId,
        order_id : testOrderId,
        type     : 'meeting',
        subject  : 'Meeting about order',
      });

    expect(res.status).toBe(201);
    expect(res.body.interaction.order_id).toBe(testOrderId);
    expect(res.body.interaction.order_title).toBe('Interactions Test Order');
  });

  it('400 - missing required fields', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: testClientId, type: 'call' });

    expect(res.status).toBe(400);
  });

  it('400 - invalid type', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: testClientId, type: 'telegram', subject: 'Bad' });

    expect(res.status).toBe(400);
  });

  it('404 - non-existent client_id', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: '00000000-0000-0000-0000-000000000000',
        type: 'note', subject: 'Ghost',
      });

    expect(res.status).toBe(404);
  });

  it('404 - non-existent order_id', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: testClientId,
        order_id : '00000000-0000-0000-0000-000000000000',
        type: 'note', subject: 'Ghost Order',
      });

    expect(res.status).toBe(404);
  });
});

describe('Interactions - GET /api/interactions/:id', () => {
  it('200 - get interaction by ID', async () => {
    const res = await request(app)
      .get(`/api/interactions/${adminInteractionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.interaction.id).toBe(adminInteractionId);
    expect(res.body.interaction).toHaveProperty('client_name');
    expect(res.body.interaction).toHaveProperty('created_by_name');
  });

  it('404 - non-existent interaction', async () => {
    const res = await request(app)
      .get('/api/interactions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Interactions - PUT /api/interactions/:id (ownership)', () => {
  it('200 - employee updates THEIR interaction', async () => {
    const res = await request(app)
      .put(`/api/interactions/${employeeInteractionId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ subject: 'Updated email from employee' });

    expect(res.status).toBe(200);
    expect(res.body.interaction.subject).toBe('Updated email from employee');
  });

  it('403 - employee CANNOT update another user interaction', async () => {
    const res = await request(app)
      .put(`/api/interactions/${adminInteractionId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ subject: 'Hack attempt' });

    expect(res.status).toBe(403);
  });

  it('200 - admin can update any interaction', async () => {
    const res = await request(app)
      .put(`/api/interactions/${employeeInteractionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subject: 'Admin edited email' });

    expect(res.status).toBe(200);
  });

  it('400 - invalid type on update', async () => {
    const res = await request(app)
      .put(`/api/interactions/${adminInteractionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'fax' });

    expect(res.status).toBe(400);
  });
});

describe('Interactions - DELETE /api/interactions/:id (ownership)', () => {
  let toDeleteByEmployee;
  let toDeleteByAdmin;

  beforeAll(async () => {
    const r1 = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ client_id: testClientId, type: 'note', subject: 'Note to delete (emp)' });
    toDeleteByEmployee = r1.body.interaction.id;

    const r2 = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: testClientId, type: 'note', subject: 'Note to delete (adm)' });
    toDeleteByAdmin = r2.body.interaction.id;
  });

  it('403 - employee CANNOT delete another user interaction', async () => {
    const res = await request(app)
      .delete(`/api/interactions/${toDeleteByAdmin}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });

  it('200 - employee deletes THEIR interaction', async () => {
    const res = await request(app)
      .delete(`/api/interactions/${toDeleteByEmployee}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
  });

  it('200 - admin deletes any interaction', async () => {
    const res = await request(app)
      .delete(`/api/interactions/${toDeleteByAdmin}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
