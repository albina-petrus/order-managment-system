const request = require('supertest');
const app    = require('../src/app');
const { db } = require('../src/database/db');

afterAll(() => { try { db.close(); } catch (_) {} });

let adminToken;
let employeeToken;
let employeeId;
let testClientId;
let assignedOrderId;
let unassignedOrderId;

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
    .send({ name: 'Orders Test Client', email: 'orders@test.com' });
  testClientId = clientRes.body.client.id;

  const assignedRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      client_id  : testClientId,
      title      : 'Assigned order',
      priority   : 'high',
      total_amount: 50000,
      assigned_to: employeeId,
    });
  assignedOrderId = assignedRes.body.order.id;

  const unassignedRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      client_id: testClientId,
      title    : 'Unassigned order',
    });
  unassignedOrderId = unassignedRes.body.order.id;
});

describe('Orders - GET /api/orders', () => {
  it('200 - admin sees all orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(res.body).toHaveProperty('total');
    const ids = res.body.orders.map(o => o.id);
    expect(ids).toContain(assignedOrderId);
    expect(ids).toContain(unassignedOrderId);
  });

  it('200 - employee sees only assigned orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.orders.map(o => o.id);
    expect(ids).toContain(assignedOrderId);
    expect(ids).not.toContain(unassignedOrderId);
  });

  it('200 - filter by status (pending)', async () => {
    const res = await request(app)
      .get('/api/orders?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.orders.forEach(o => expect(o.status).toBe('pending'));
  });

  it('200 - filter by client_id', async () => {
    const res = await request(app)
      .get(`/api/orders?client_id=${testClientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.orders.forEach(o => expect(o.client_id).toBe(testClientId));
  });

  it('200 - search by title', async () => {
    const res = await request(app)
      .get('/api/orders?search=Assigned')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Orders - POST /api/orders', () => {
  it('201 - creation with default status and history entry', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id   : testClientId,
        title       : 'New order',
        description : 'Order description',
        priority    : 'urgent',
        total_amount: 99000,
        assigned_to : employeeId,
      });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('pending');
    expect(res.body.order.client_name).toBe('Orders Test Client');
    expect(res.body.order.assigned_to_name).toBeDefined();
  });

  it('400 - missing required fields', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Without client' });

    expect(res.status).toBe(400);
  });

  it('400 - invalid status', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: testClientId, title: 'Bad Status', status: 'flying' });

    expect(res.status).toBe(400);
  });

  it('400 - invalid priority', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: testClientId, title: 'Bad Priority', priority: 'critical' });

    expect(res.status).toBe(400);
  });

  it('404 - non-existent client_id', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: '00000000-0000-0000-0000-000000000000', title: 'Ghost Order' });

    expect(res.status).toBe(404);
  });
});

describe('Orders - GET /api/orders/:id', () => {
  it('200 - admin gets details with statusHistory and interactions', async () => {
    const res = await request(app)
      .get(`/api/orders/${assignedOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('order');
    expect(res.body).toHaveProperty('statusHistory');
    expect(res.body).toHaveProperty('interactions');
    expect(Array.isArray(res.body.statusHistory)).toBe(true);
    expect(res.body.statusHistory.length).toBeGreaterThanOrEqual(1);
    expect(res.body.statusHistory[0].new_status).toBe('pending');
  });

  it('200 - employee sees assigned order', async () => {
    const res = await request(app)
      .get(`/api/orders/${assignedOrderId}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
  });

  it('403 - employee DOES NOT see unassigned order', async () => {
    const res = await request(app)
      .get(`/api/orders/${unassignedOrderId}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });

  it('404 - non-existent order', async () => {
    const res = await request(app)
      .get('/api/orders/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Orders - PUT /api/orders/:id', () => {
  it('200 - updates data and logs to history on status change', async () => {
    const res = await request(app)
      .put(`/api/orders/${assignedOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_progress', total_amount: 55000 });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('in_progress');
    expect(res.body.order.total_amount).toBe(55000);

    const detailRes = await request(app)
      .get(`/api/orders/${assignedOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detailRes.body.statusHistory.length).toBeGreaterThanOrEqual(2);
    const lastEntry = detailRes.body.statusHistory.at(-1);
    expect(lastEntry.old_status).toBe('pending');
    expect(lastEntry.new_status).toBe('in_progress');
  });

  it('400 - invalid status on update', async () => {
    const res = await request(app)
      .put(`/api/orders/${assignedOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'teleported' });

    expect(res.status).toBe(400);
  });
});

describe('Orders - PATCH /api/orders/:id/status', () => {
  it('200 - quick status change with comment', async () => {
    const res = await request(app)
      .patch(`/api/orders/${assignedOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed', comment: 'All done!' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('400 - invalid status', async () => {
    const res = await request(app)
      .patch(`/api/orders/${assignedOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'launched' });

    expect(res.status).toBe(400);
  });

  it('400 - missing status in body', async () => {
    const res = await request(app)
      .patch(`/api/orders/${assignedOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('Orders - DELETE /api/orders/:id', () => {
  let toDeleteId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: testClientId, title: 'Order to delete' });
    toDeleteId = res.body.order.id;
  });

  it('403 - employee cannot delete order', async () => {
    const res = await request(app)
      .delete(`/api/orders/${toDeleteId}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });

  it('200 - admin deletes order', async () => {
    const res = await request(app)
      .delete(`/api/orders/${toDeleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('404 - deleted order not found', async () => {
    const res = await request(app)
      .get(`/api/orders/${toDeleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
