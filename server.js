/* BookKart server — zero-dependency Node server.
 *
 * Serves the static storefront AND a small JSON API backed by SQLite
 * (src/db.js, Node's built-in node:sqlite):
 *
 *   GET  /api/books        catalog with live stock from the database
 *   GET  /api/orders       past orders (newest first)
 *   GET  /api/orders/:id   one order with customer + line items
 *   POST /api/orders       place an order: { items, customer, promo, payment }
 *                          validated by src/core.js, then saved atomically
 *
 * The browser uses the API when it is reachable (server mode) and falls
 * back to in-page demo data when the site is hosted statically
 * (e.g. GitHub Pages). Database file: data/bookkart.db
 * (override with the BOOKKART_DB environment variable).
 *
 * Usage: npm start  ->  http://localhost:3000
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const K = require('./src/core.js');
const { openDb } = require('./src/db.js');
const { notifyOrder } = require('./src/notify.js');

const root = __dirname;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8'
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 100000) reject(new Error('BODY_TOO_LARGE'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function createServer(dbPath) {
  const db = openDb(dbPath || process.env.BOOKKART_DB || path.join(root, 'data', 'bookkart.db'));
  // When BOOKKART_ADMIN_KEY is set, order management (list + status
  // changes) requires it in the x-admin-key header. Unset = local demo.
  const adminKey = process.env.BOOKKART_ADMIN_KEY || '';
  const isAdmin = (req) => !adminKey || req.headers['x-admin-key'] === adminKey;

  const server = http.createServer(async (req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);

    /* ---------- JSON API ---------- */
    if (urlPath === '/api/books' && req.method === 'GET') {
      return sendJson(res, 200, db.listBooks());
    }

    if (urlPath === '/api/orders' && req.method === 'GET') {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'ADMIN_KEY_REQUIRED' });
      return sendJson(res, 200, db.listOrders());
    }

    // Public order tracking: order id + the phone used at checkout.
    const trackMatch = urlPath.match(/^\/api\/track\/([\w-]+)$/);
    if (trackMatch && req.method === 'GET') {
      const order = db.getOrder(trackMatch[1]);
      const phone = (new URL(req.url, 'http://localhost').searchParams.get('phone') || '').replace(/\D/g, '');
      const digits = (v) => String(v || '').replace(/\D/g, '');
      const match = order && phone.length >= 10 &&
        (digits(order.customer.phone) === phone || digits(order.customer.phone).endsWith(phone) || phone.endsWith(digits(order.customer.phone)));
      if (!match) return sendJson(res, 404, { error: 'ORDER_NOT_FOUND' });
      return sendJson(res, 200, {
        id: order.id, status: order.status, total: order.totals.total,
        items: order.items.reduce((n, i) => n + i.qty, 0),
        city: order.customer.city, placedAt: order.placedAt, payment: order.payment.label
      });
    }

    const statusMatch = urlPath.match(/^\/api\/orders\/([\w-]+)\/status$/);
    if (statusMatch && req.method === 'PATCH') {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'ADMIN_KEY_REQUIRED' });
      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch (e) {
        return sendJson(res, 400, { error: 'INVALID_JSON' });
      }
      try {
        const updated = db.updateOrderStatus(statusMatch[1], payload.status);
        if (!updated) return sendJson(res, 404, { error: 'ORDER_NOT_FOUND' });
        return sendJson(res, 200, updated);
      } catch (err) {
        if (err.message === 'INVALID_STATUS') return sendJson(res, 400, { error: 'INVALID_STATUS' });
        throw err;
      }
    }

    const orderMatch = urlPath.match(/^\/api\/orders\/([\w-]+)$/);
    if (orderMatch && req.method === 'GET') {
      const order = db.getOrder(orderMatch[1]);
      if (!order) return sendJson(res, 404, { error: 'ORDER_NOT_FOUND' });
      return sendJson(res, 200, order);
    }

    if (urlPath === '/api/orders' && req.method === 'POST') {
      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch (e) {
        return sendJson(res, 400, { error: 'INVALID_JSON' });
      }
      const items = payload.items || {};
      const customer = payload.customer || {};
      try {
        const result = K.placeOrder(items, db.listBooks(), customer, payload.promo || null, payload.payment || { method: 'COD' });
        const saved = db.saveOrder(result.order, result.catalog, {
          name: String(customer.name || '').trim(),
          email: String(customer.email || '').trim(),
          phone: String(customer.phone || '').trim(),
          address: String(customer.address || '').trim(),
          city: String(customer.city || '').trim()
        }, payload.promo || null);
        notifyOrder(saved).catch(() => { /* already logged per channel */ });
        return sendJson(res, 201, { order: saved, books: db.listBooks() });
      } catch (err) {
        if (err.message === 'VALIDATION_FAILED') {
          return sendJson(res, 400, { error: 'VALIDATION_FAILED', fields: err.fields });
        }
        if (['EMPTY_CART', 'OUT_OF_STOCK', 'BOOK_NOT_FOUND', 'INVALID_QUANTITY', 'INVALID_PROMO'].includes(err.message)) {
          return sendJson(res, 400, { error: err.message });
        }
        console.error('Order failed:', err);
        return sendJson(res, 500, { error: 'SERVER_ERROR' });
      }
    }

    if (urlPath.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'NOT_FOUND' });
    }

    /* ---------- static files ---------- */
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const file = path.join(root, rel);
    if (!file.startsWith(root) || rel.startsWith('data/') || rel === 'server.js') {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });

  server.bookkartDb = db;
  return server;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port, () => console.log('BookKart running at http://localhost:' + port));
}

module.exports = { createServer };
