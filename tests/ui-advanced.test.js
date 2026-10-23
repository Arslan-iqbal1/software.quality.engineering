/*
 * BookKart v2 advanced front-end tests (jsdom).
 * Covers the upgraded UI: wishlist, price/rating filters, quick-view modal,
 * dark mode, cart persistence and view toggle — on a fresh page instance.
 */
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

let window, document;

before(() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
  window = dom.window;
  document = window.document;
  window.eval(fs.readFileSync(path.join(__dirname, '..', 'src', 'core.js'), 'utf8'));
  window.eval(fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8'));
});

function fire(el, type) {
  el.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
}
const cards = () => document.querySelectorAll('#bookGrid .card').length;

test('wishlist toggle updates the header wishlist count', () => {
  document.querySelector('[data-wish="B02"]').click();
  assert.equal(document.getElementById('wishCount').textContent, '1');
  document.querySelector('[data-wish="B05"]').click();
  assert.equal(document.getElementById('wishCount').textContent, '2');
});

test('wishlist-only filter shows just the wishlisted books', () => {
  const t = document.getElementById('wishOnlyToggle');
  t.checked = true;
  fire(t, 'change');
  assert.equal(cards(), 2);
  t.checked = false;
  fire(t, 'change');
  assert.equal(cards(), 12);
});

test('price filter narrows the grid to books at or below the limit', () => {
  const r = document.getElementById('priceRange');
  r.value = '1000';
  fire(r, 'input');
  assert.equal(cards(), 1); // only Shah Jo Risalo (Rs 950)
  assert.equal(document.getElementById('priceLabel').textContent, 'Rs 1,000');
  r.value = '5500';
  fire(r, 'input');
  assert.equal(cards(), 12);
});

test('minimum-rating filter keeps only highly rated books', () => {
  const s = document.getElementById('ratingSelect');
  s.value = '4.7';
  fire(s, 'change');
  assert.equal(cards(), 5); // 4.8, 4.7, 4.7, 4.9, 4.7
  s.value = '0';
  fire(s, 'change');
  assert.equal(cards(), 12);
});

test('reset filters restores the full catalog', () => {
  const s = document.getElementById('ratingSelect');
  s.value = '4.7';
  fire(s, 'change');
  assert.equal(cards(), 5);
  document.getElementById('resetFilters').click();
  assert.equal(cards(), 12);
  assert.equal(s.value, '0');
});

test('quick-view modal opens with book details and closes', () => {
  document.querySelector('[data-view="B04"]').click();
  const modal = document.getElementById('bookModal');
  assert.equal(modal.hidden, false);
  assert.match(document.getElementById('modalContent').textContent, /Clean Code/);
  assert.match(document.getElementById('modalContent').textContent, /Rs 3,200/);
  document.getElementById('closeModal').click();
  assert.equal(modal.hidden, true);
});

test('adding from the modal updates the cart and persists it to localStorage', () => {
  document.querySelector('[data-view="B09"]').click();
  document.getElementById('modalInc').click(); // qty 2
  document.getElementById('modalAdd').click();
  assert.equal(document.getElementById('bookModal').hidden, true);
  assert.equal(document.getElementById('cartCount').textContent, '2');
  const saved = JSON.parse(window.localStorage.getItem('bookkart-cart'));
  assert.equal(saved.B09, 2);
});

test('dark mode toggle switches the theme and persists it', () => {
  document.getElementById('themeToggle').click();
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(window.localStorage.getItem('bookkart-theme'), 'dark');
  document.getElementById('themeToggle').click();
  assert.equal(document.documentElement.dataset.theme, 'light');
});

test('list view toggle changes the grid layout class', () => {
  document.getElementById('viewList').click();
  assert.ok(document.getElementById('bookGrid').classList.contains('list-view'));
  document.getElementById('viewGrid').click();
  assert.ok(!document.getElementById('bookGrid').classList.contains('list-view'));
});
