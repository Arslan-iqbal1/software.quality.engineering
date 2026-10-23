/*
 * BookKart SQLite persistence tests (src/db.js, node:sqlite).
 * Uses a real temp-file database: seeding, transactional order saving,
 * stock updates, rollback on failure, and persistence across reopen.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../src/db.js');
const K = require('../src/core.js');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookkart-db-'));
const dbFile = path.join(dir, 'test.db');
let db;

const form = {
  name: 'Ali Raza', email: 'ali.raza@example.com', phone: '03001234567',
  address: 'House 12, Street 4, Gulberg', city: 'Lahore'
};

before(() => { db = openDb(dbFile); });
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('first open seeds the books table from the core catalog', () => {
  const books = db.listBooks();
  assert.equal(books.length, 12);
  const b01 = db.getBook('B01');
  assert.equal(b01.price, 1450);
  assert.equal(b01.mrp, 2400);
  assert.equal(b01.stock, K.findBook(K.CATALOG, 'B01').stock);
  assert.equal(b01.description.length > 10, true);
  assert.equal(db.getBook('NOPE'), null);
});

test('saveOrder persists customer, order, items and new stock atomically', () => {
  const before9 = db.getBook('B09').stock;
  const { order, catalog } = K.placeOrder({ B09: 2 }, db.listBooks(), form, null, { method: 'COD' });
  const saved = db.saveOrder(order, catalog, form, null);
  assert.equal(saved.id, order.id);
  assert.equal(saved.customer.email, 'ali.raza@example.com');
  assert.equal(saved.customer.phone, '03001234567');
  assert.equal(saved.items.length, 1);
  assert.equal(saved.items[0].qty, 2);
  assert.equal(saved.totals.total, order.totals.total);
  assert.equal(saved.payment.method, 'COD');
  assert.equal(db.getBook('B09').stock, before9 - 2);
  const list = db.listOrders();
  assert.equal(list.length, 1);
  assert.equal(list[0].customer, 'Ali Raza');
  assert.equal(list[0].items, 1);
});

test('a returning customer is updated, not duplicated', () => {
  const { order, catalog } = K.placeOrder({ B01: 1 }, db.listBooks(), { ...form, city: 'Karachi' }, 'STUDENT10', { method: 'COD' });
  db.saveOrder(order, catalog, { ...form, city: 'Karachi' }, 'STUDENT10');
  const saved = db.getOrder(order.id);
  assert.equal(saved.customer.city, 'Karachi');
  assert.equal(saved.promoCode, 'STUDENT10');
  assert.equal(db.listOrders().length, 2);
});

test('a failing saveOrder rolls back completely (no partial order, stock untouched)', () => {
  const stockBefore = db.getBook('B01').stock;
  const bogus = {
    id: 'BK-BOGUS', totals: { subtotal: 100, discount: 0, delivery: 150, total: 250 },
    payment: { method: 'COD', label: 'Cash on Delivery', detail: '' },
    items: [{ id: 'B99', title: 'Ghost Book', qty: 1, price: 100 }]
  };
  assert.throws(() => db.saveOrder(bogus, db.listBooks(), form, null));
  assert.equal(db.getOrder('BK-BOGUS'), null);
  assert.equal(db.listOrders().length, 2);
  assert.equal(db.getBook('B01').stock, stockBefore);
});

test('orders and stock survive closing and reopening the database file', () => {
  db.close();
  db = openDb(dbFile);
  assert.equal(db.listBooks().length, 12); // not reseeded / duplicated
  assert.equal(db.listOrders().length, 2);
  const first = db.listOrders()[1];
  assert.ok(db.getOrder(first.id));
});
