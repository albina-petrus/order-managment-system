const { db } = require('../database/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function seedDatabase() {
  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = 'admin@oms.com'").get();
  if (existingAdmin) {
    return;
  }

  const adminId = uuidv4();
  const employeeId = uuidv4();
  const adminPassword = bcrypt.hashSync('Admin@1234', 10);
  const employeePassword = bcrypt.hashSync('Employee@1234', 10);

  db.prepare(`
    INSERT INTO users (id, name, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'Administrator', 'admin@oms.com', adminPassword, 'admin');

  db.prepare(`
    INSERT INTO users (id, name, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(employeeId, 'Manager John', 'ivan@oms.com', employeePassword, 'employee');

  const clients = [
    { id: uuidv4(), name: 'Alpha Trade LLC', email: 'info@alpha.com', phone: '+12025550100', company: 'Alpha Trade', address: 'New York, 5th Ave 1' },
    { id: uuidv4(), name: 'Petrenko Inc.', email: 'petrenko@ua.net', phone: '+12025550101', company: 'Petrenko Inc.', address: 'Chicago, Main St 14' },
    { id: uuidv4(), name: 'Beta Logistics', email: 'beta@logistic.com', phone: '+12025550102', company: 'Beta Logistics', address: 'Los Angeles, Sunset Blvd 5' },
  ];

  const insertClient = db.prepare(`
    INSERT INTO clients (id, name, email, phone, company, address, created_by)
    VALUES (@id, @name, @email, @phone, @company, @address, @created_by)
  `);

  for (const c of clients) {
    insertClient.run({ ...c, created_by: adminId });
  }

  const orderStatuses = ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const orderTitles = [
    'Office equipment supply',
    'Corporate website development',
    'Server maintenance',
    'Automation consulting',
    'Spare parts delivery',
  ];

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, client_id, title, description, status, priority, total_amount, assigned_to, created_by)
    VALUES (@id, @client_id, @title, @description, @status, @priority, @total_amount, @assigned_to, @created_by)
  `);

  const orderId1 = uuidv4();
  const orderId2 = uuidv4();

  insertOrder.run({ id: orderId1, client_id: clients[0].id, title: orderTitles[0], description: 'Supply of 20 computers and peripherals', status: 'in_progress', priority: 'high', total_amount: 150000, assigned_to: employeeId, created_by: adminId });
  insertOrder.run({ id: orderId2, client_id: clients[1].id, title: orderTitles[1], description: 'Corporate website with CMS', status: 'pending', priority: 'medium', total_amount: 45000, assigned_to: employeeId, created_by: adminId });
  insertOrder.run({ id: uuidv4(), client_id: clients[2].id, title: orderTitles[2], description: 'Quarterly server hardware maintenance', status: 'completed', priority: 'low', total_amount: 12000, assigned_to: employeeId, created_by: adminId });
  insertOrder.run({ id: uuidv4(), client_id: clients[0].id, title: orderTitles[3], description: 'ERP system implementation consulting', status: 'on_hold', priority: 'urgent', total_amount: 80000, assigned_to: employeeId, created_by: adminId });

  const insertInteraction = db.prepare(`
    INSERT INTO interactions (id, client_id, order_id, type, subject, description, created_by)
    VALUES (@id, @client_id, @order_id, @type, @subject, @description, @created_by)
  `);

  insertInteraction.run({ id: uuidv4(), client_id: clients[0].id, order_id: orderId1, type: 'call', subject: 'Order details clarification', description: 'Discussed equipment specification and delivery terms', created_by: employeeId });
  insertInteraction.run({ id: uuidv4(), client_id: clients[0].id, order_id: orderId1, type: 'email', subject: 'Invoice sent', description: 'Documents sent for signature', created_by: employeeId });
  insertInteraction.run({ id: uuidv4(), client_id: clients[1].id, order_id: orderId2, type: 'meeting', subject: 'Client meeting', description: 'Website mockups presentation, design approved', created_by: adminId });
  insertInteraction.run({ id: uuidv4(), client_id: clients[2].id, order_id: null, type: 'note', subject: 'Note', description: 'Client interested in contract extension for next year', created_by: employeeId });

  console.log('✅ Database seeded successfully');
  console.log('   Admin:    admin@oms.com    / Admin@1234');
  console.log('   Employee: ivan@oms.com     / Employee@1234');
}

module.exports = { seedDatabase };
