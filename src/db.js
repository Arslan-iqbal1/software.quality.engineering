/*
 * BookKart — SQLite persistence layer (Node only, zero dependencies).
 *
 * Uses Node's built-in node:sqlite (Node >= 22). The browser never loads
 * this file; it runs inside server.js. All business rules stay in
 * core.js — this module only stores and retrieves data.
 *
 * Schema:
 *   books(id, title, author, genre, price, mrp, stock, rating,
 *         description, pages, year)
 *   customers(id, name, email UNIQUE, phone, address, city)
 *   orders(id, customer_id -> customers, subtotal, discount, delivery,
 *          total, promo_code, payment_method, payment_label,
 *          payment_detail, placed_at)
 *   order_items(order_id -> orders, book_id -> books, title,
 *               qty, unit_price)
 *
 * On first open the books table is seeded from the core.js catalog;
 * after that the database is the source of truth for stock.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const K = require('./core.js');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  mrp INTEGER NOT NULL CHECK (mrp >= price),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  rating REAL NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  pages INTEGER NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  delivery INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  promo_code TEXT,
  payment_method TEXT NOT NULL,
  payment_label TEXT NOT NULL,
  payment_detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Placed',
  placed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id),
  book_id TEXT NOT NULL REFERENCES books(id),
  title TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL,
  PRIMARY KEY (order_id, book_id)
);
`;

function rowToBook(r) {
  return {
    id: r.id, title: r.title, author: r.author, genre: r.genre,
    price: r.price, mrp: r.mrp, stock: r.stock, rating: r.rating,
    description: r.description, pages: r.pages, year: r.year
  };
}

function openDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  // Migration: databases created before order tracking gain the column.
  const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((r) => r.name);
  if (!orderCols.includes('status')) {
    db.exec("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'Placed'");
  }

  // Seed the catalog once; afterwards the DB owns stock and prices.
  const count = db.prepare('SELECT COUNT(*) AS n FROM books').get().n;
  if (count === 0) {
    const ins = db.prepare(
      'INSERT INTO books (id, title, author, genre, price, mrp, stock, rating, description, pages, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    db.exec('BEGIN');
    try {
      for (const b of K.CATALOG) {
        ins.run(b.id, b.title, b.author, b.genre, b.price, b.mrp, b.stock, b.rating, b.description, b.pages, b.year);
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }

  function listBooks() {
    return db.prepare('SELECT * FROM books ORDER BY id').all().map(rowToBook);
  }

  function getBook(id) {
    const r = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    return r ? rowToBook(r) : null;
  }

  // Persist a completed core.js order atomically: customer, order,
  // line items and the new stock levels land together or not at all.
  // `customer` is the full checkout form (the core order itself only
  // carries name/city for the customer-facing receipt); `promoCode`
  // is the code the customer applied, if any.
  function saveOrder(order, updatedCatalog, customer, promoCode) {
    const stockById = {};
    for (const b of updatedCatalog) stockById[b.id] = b.stock;
    db.exec('BEGIN');
    try {
      const c = customer;
      db.prepare(
        'INSERT INTO customers (name, email, phone, address, city) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone, address = excluded.address, city = excluded.city'
      ).run(c.name, c.email, c.phone, c.address, c.city);
      const customerId = db.prepare('SELECT id FROM customers WHERE email = ?').get(c.email).id;

      db.prepare(
        'INSERT INTO orders (id, customer_id, subtotal, discount, delivery, total, promo_code, payment_method, payment_label, payment_detail, placed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(order.id, customerId, order.totals.subtotal, order.totals.discount, order.totals.deliveryFee,
            order.totals.total, promoCode || null, order.payment.method, order.payment.label,
            order.payment.detail || '', new Date().toISOString());

      const insItem = db.prepare(
        'INSERT INTO order_items (order_id, book_id, title, qty, unit_price) VALUES (?, ?, ?, ?, ?)'
      );
      const updStock = db.prepare('UPDATE books SET stock = ? WHERE id = ?');
      for (const line of order.items) {
        insItem.run(order.id, line.id, line.title, line.qty, line.price);
        updStock.run(stockById[line.id], line.id);
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return getOrder(order.id);
  }

  function getOrder(id) {
    const o = db.prepare(
      'SELECT o.*, c.name, c.email, c.phone, c.address, c.city FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?'
    ).get(id);
    if (!o) return null;
    const items = db.prepare('SELECT book_id, title, qty, unit_price FROM order_items WHERE order_id = ? ORDER BY book_id').all(id)
      .map((r) => ({ id: r.book_id, title: r.title, qty: r.qty, price: r.unit_price }));
    return {
      id: o.id,
      customer: { name: o.name, email: o.email, phone: o.phone, address: o.address, city: o.city },
      items,
      totals: { subtotal: o.subtotal, discount: o.discount, deliveryFee: o.delivery, total: o.total },
      promoCode: o.promo_code,
      status: o.status,
      payment: { method: o.payment_method, label: o.payment_label, detail: o.payment_detail },
      placedAt: o.placed_at
    };
  }

  function listOrders() {
    return db.prepare(
      'SELECT o.id, o.total, o.payment_method, o.status, o.placed_at, c.name AS customer, ' +
      '(SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS items ' +
      'FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.placed_at DESC, o.id DESC'
    ).all();
  }

  const ORDER_STATUSES = ['Placed', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled'];

  function updateOrderStatus(id, status) {
    if (!ORDER_STATUSES.includes(status)) throw new Error('INVALID_STATUS');
    const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    if (info.changes === 0) return null;
    return getOrder(id);
  }

  return {
    listBooks,
    getBook,
    saveOrder,
    getOrder,
    listOrders,
    updateOrderStatus,
    ORDER_STATUSES,
    close: () => db.close()
  };
}

module.exports = { openDb, ORDER_STATUSES: ['Placed', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled'] };
