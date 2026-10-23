/*
 * BookKart HTTP API tests — real server (in-memory SQLite) over fetch.
 * Verifies the endpoints the browser's server mode depends on, plus
 * static serving and the data-directory guard.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server.js');

let server, base, orderId;

const form = {
  name: 'Ali Raza', email: 'ali.raza@example.com', phone: '03001234567',
  address: 'House 12, Street 4, Gulberg', city: 'Lahore'
};

before(async () => {
  server = createServer(':memory:');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  server.bookkartDb.close();
});

function postOrder(payload) {
  return fetch(base + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

test('GET /api/books returns the seeded catalog', async () => {
  const res = await fetch(base + '/api/books');
  assert.equal(res.status, 200);
  const books = await res.json();
  assert.equal(books.length, 12);
  assert.equal(books[0].id, 'B01');
});

test('POST /api/orders places a COD order and decrements stock', async () => {
  const stockRes = await fetch(base + '/api/books');
  const b09Before = (await stockRes.json()).find((b) => b.id === 'B09').stock;
  const res = await postOrder({ items: { B09: 1 }, customer: form, promo: null, payment: { method: 'COD' } });
  assert.equal(res.status, 201);
  const data = await res.json();
  orderId = data.order.id;
  assert.match(orderId, /^BK-/);
  assert.equal(data.order.totals.total, 1100); // 950 + 150 delivery
  const b09After = data.books.find((b) => b.id === 'B09').stock;
  assert.equal(b09After, b09Before - 1);
});

test('GET /api/orders and /api/orders/:id return the saved order', async () => {
  const list = await (await fetch(base + '/api/orders')).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].customer, 'Ali Raza');
  const one = await (await fetch(base + '/api/orders/' + orderId)).json();
  assert.equal(one.items.length, 1);
  assert.equal(one.items[0].id, 'B09');
  const missing = await fetch(base + '/api/orders/BK-NOPE');
  assert.equal(missing.status, 404);
});

test('POST /api/orders rejects an invalid form with field errors', async () => {
  const res = await postOrder({ items: { B01: 1 }, customer: { ...form, email: 'not-an-email' }, payment: { method: 'COD' } });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'VALIDATION_FAILED');
  assert.ok(data.fields.email);
});

test('POST /api/orders rejects an empty cart and a bad card', async () => {
  const empty = await postOrder({ items: {}, customer: form, payment: { method: 'COD' } });
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error, 'EMPTY_CART');
  const card = await postOrder({
    items: { B01: 1 }, customer: form,
    payment: { method: 'CARD', cardName: 'Ali Raza', cardNumber: '4242424242424241', cardExpiry: '12/30', cardCvv: '123' }
  });
  assert.equal(card.status, 400);
  const data = await card.json();
  assert.equal(data.error, 'VALIDATION_FAILED');
  assert.ok(data.fields.cardNumber);
});

test('static site still serves and the data directory is off-limits', async () => {
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /BookKart/);
  const dbFile = await fetch(base + '/data/bookkart.db');
  assert.equal(dbFile.status, 403);
  const api404 = await fetch(base + '/api/nope');
  assert.equal(api404.status, 404);
});
