/*
 * BookKart — owner notifications for new orders (Node only, zero deps).
 *
 * When an order is saved, the store owner gets notified on every
 * channel that is configured through environment variables:
 *
 *   BOOKKART_NTFY_TOPIC       ntfy.sh topic name (free phone push via
 *                             the ntfy app — no account needed), or a
 *                             full https://ntfy.sh/... URL
 *   BOOKKART_TELEGRAM_TOKEN   Telegram bot token (from @BotFather)
 *   BOOKKART_TELEGRAM_CHAT_ID Telegram chat id to message
 *   BOOKKART_WEBHOOK_URL      Any URL: receives a JSON POST of the order
 *
 * Notifications are best-effort: a failing channel is logged and never
 * blocks or fails the customer's order.
 */
'use strict';

function formatPrice(n) {
  return 'Rs ' + Number(n).toLocaleString('en-US');
}

function buildOrderMessage(order) {
  const lines = order.items.map((i) => `• ${i.title} ×${i.qty} — ${formatPrice(i.price * i.qty)}`);
  return [
    `🛎️ New BookKart order ${order.id}`,
    `Total: ${formatPrice(order.totals.total)} (${order.payment.label})`,
    `Customer: ${order.customer.name}, ${order.customer.city} — ${order.customer.phone || ''}`.trim(),
    ...lines,
    `Status: ${order.status || 'Placed'}`
  ].join('\n');
}

function channelsFromEnv(env) {
  const channels = [];
  if (env.BOOKKART_NTFY_TOPIC) {
    const topic = env.BOOKKART_NTFY_TOPIC;
    channels.push({ name: 'ntfy', url: topic.startsWith('http') ? topic : 'https://ntfy.sh/' + topic, kind: 'ntfy' });
  }
  if (env.BOOKKART_TELEGRAM_TOKEN && env.BOOKKART_TELEGRAM_CHAT_ID) {
    channels.push({
      name: 'telegram',
      url: 'https://api.telegram.org/bot' + env.BOOKKART_TELEGRAM_TOKEN + '/sendMessage',
      kind: 'telegram',
      chatId: env.BOOKKART_TELEGRAM_CHAT_ID
    });
  }
  if (env.BOOKKART_WEBHOOK_URL) {
    channels.push({ name: 'webhook', url: env.BOOKKART_WEBHOOK_URL, kind: 'webhook' });
  }
  return channels;
}

async function sendOne(channel, order, message, post) {
  if (channel.kind === 'ntfy') {
    await post(channel.url, message, { Title: 'New BookKart order ' + order.id, Tags: 'shopping_cart,bell' });
  } else if (channel.kind === 'telegram') {
    await post(channel.url, JSON.stringify({ chat_id: channel.chatId, text: message }), { 'Content-Type': 'application/json' });
  } else {
    await post(channel.url, JSON.stringify({ event: 'order.created', order }), { 'Content-Type': 'application/json' });
  }
}

function defaultPost(url, body, headers) {
  return fetch(url, { method: 'POST', headers: headers || {}, body }).then((res) => {
    if (!res.ok) throw new Error('HTTP ' + res.status);
  });
}

/*
 * Notify all configured channels about a saved order.
 * `opts.env` and `opts.post` are injectable for tests.
 * Resolves to [{ channel, ok, error? }] — never rejects.
 */
async function notifyOrder(order, opts) {
  const options = opts || {};
  const env = options.env || process.env;
  const post = options.post || defaultPost;
  const channels = channelsFromEnv(env);
  const message = buildOrderMessage(order);
  const results = [];
  for (const channel of channels) {
    try {
      await sendOne(channel, order, message, post);
      results.push({ channel: channel.name, ok: true });
    } catch (e) {
      console.error(`[notify] ${channel.name} failed:`, e.message);
      results.push({ channel: channel.name, ok: false, error: e.message });
    }
  }
  return results;
}

module.exports = { notifyOrder, buildOrderMessage, channelsFromEnv };
