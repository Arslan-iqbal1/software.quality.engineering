/*
 * BookKart owner-notification tests (src/notify.js).
 * No external calls: channels are resolved from a fake env and the
 * HTTP sender is injected.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { notifyOrder, buildOrderMessage, channelsFromEnv } = require('../src/notify.js');

const order = {
  id: 'BK-TEST1',
  customer: { name: 'Ali Raza', city: 'Lahore', phone: '03001234567' },
  items: [{ id: 'B02', title: 'Atomic Habits', qty: 1, price: 1800 }],
  totals: { subtotal: 1800, discount: 0, deliveryFee: 0, total: 1800 },
  payment: { method: 'COD', label: 'Cash on Delivery', detail: '' },
  status: 'Placed'
};

test('no channels configured means no notifications and no error', async () => {
  assert.deepEqual(channelsFromEnv({}), []);
  assert.deepEqual(await notifyOrder(order, { env: {} }), []);
});

test('channel resolution: ntfy topic, telegram pair, webhook', () => {
  const ch = channelsFromEnv({
    BOOKKART_NTFY_TOPIC: 'bookkart-orders-xyz',
    BOOKKART_TELEGRAM_TOKEN: 'T0KEN',
    BOOKKART_TELEGRAM_CHAT_ID: '12345',
    BOOKKART_WEBHOOK_URL: 'https://example.com/hook'
  });
  assert.deepEqual(ch.map((c) => c.name), ['ntfy', 'telegram', 'webhook']);
  assert.equal(ch[0].url, 'https://ntfy.sh/bookkart-orders-xyz');
  // telegram needs BOTH token and chat id
  assert.deepEqual(channelsFromEnv({ BOOKKART_TELEGRAM_TOKEN: 'T0KEN' }), []);
});

test('the message carries order id, total, customer and items', () => {
  const msg = buildOrderMessage(order);
  assert.match(msg, /BK-TEST1/);
  assert.match(msg, /Rs 1,800/);
  assert.match(msg, /Ali Raza, Lahore/);
  assert.match(msg, /Atomic Habits ×1/);
});

test('notifyOrder posts to every configured channel', async () => {
  const sent = [];
  const fakePost = async (url, body, headers) => { sent.push({ url, body, headers }); };
  const results = await notifyOrder(order, {
    env: { BOOKKART_NTFY_TOPIC: 'topic1', BOOKKART_WEBHOOK_URL: 'https://example.com/hook' },
    post: fakePost
  });
  assert.deepEqual(results, [{ channel: 'ntfy', ok: true }, { channel: 'webhook', ok: true }]);
  assert.equal(sent.length, 2);
  assert.match(sent[0].body, /New BookKart order BK-TEST1/); // ntfy gets the text message
  const payload = JSON.parse(sent[1].body); // webhook gets structured JSON
  assert.equal(payload.event, 'order.created');
  assert.equal(payload.order.id, 'BK-TEST1');
});

test('a failing channel never breaks the order flow', async () => {
  const failingPost = async () => { throw new Error('network down'); };
  const results = await notifyOrder(order, { env: { BOOKKART_NTFY_TOPIC: 'topic1' }, post: failingPost });
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, false);
  assert.match(results[0].error, /network down/);
});
