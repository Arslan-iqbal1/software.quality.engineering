/*
 * BookKart UI integration tests (jsdom).
 * Loads the real index.html + core.js + app.js and drives the page the way
 * a user would: searching, filtering, adding to cart, promo codes, checkout.
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

function field(form, name) { return form.elements.namedItem(name); }

function fire(el, type) {
  el.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
}

test('page renders all 12 book cards on load', () => {
  assert.equal(document.querySelectorAll('#bookGrid .card').length, 12);
  assert.match(document.getElementById('resultInfo').textContent, /Showing 12 of 12/);
});

test('typing in search filters the grid', () => {
  const input = document.getElementById('searchInput');
  input.value = 'atomic';
  fire(input, 'input');
  assert.equal(document.querySelectorAll('#bookGrid .card').length, 1);
  input.value = '';
  fire(input, 'input');
  assert.equal(document.querySelectorAll('#bookGrid .card').length, 12);
});

test('search with no match shows the empty state', () => {
  const input = document.getElementById('searchInput');
  input.value = 'zzzz';
  fire(input, 'input');
  assert.equal(document.querySelectorAll('#bookGrid .card').length, 0);
  assert.equal(document.getElementById('emptyState').hidden, false);
  input.value = '';
  fire(input, 'input');
});

test('genre filter narrows the grid to that genre', () => {
  const sel = document.getElementById('genreSelect');
  sel.value = 'Technology';
  fire(sel, 'change');
  assert.equal(document.querySelectorAll('#bookGrid .card').length, 2);
  sel.value = 'All';
  fire(sel, 'change');
  assert.equal(document.querySelectorAll('#bookGrid .card').length, 12);
});

test('adding a book updates the cart badge and totals', () => {
  document.querySelector('[data-add="B09"]').click(); // Shah Jo Risalo, Rs 950
  assert.equal(document.getElementById('cartCount').textContent, '1');
  assert.equal(document.getElementById('tSubtotal').textContent, 'Rs 950');
  assert.equal(document.getElementById('tDelivery').textContent, 'Rs 150');
  assert.equal(document.getElementById('tTotal').textContent, 'Rs 1,100');
});

test('a valid promo code applies the discount in the UI', () => {
  const input = document.getElementById('promoInput');
  input.value = 'STUDENT10';
  document.getElementById('applyPromo').click();
  assert.match(document.getElementById('promoMsg').textContent, /Promo applied/);
  assert.equal(document.getElementById('tDiscount').textContent, '− Rs 95');
});

test('an invalid promo code shows an error and no discount', () => {
  const input = document.getElementById('promoInput');
  input.value = 'FREESTUFF';
  document.getElementById('applyPromo').click();
  assert.match(document.getElementById('promoMsg').textContent, /Invalid promo code/);
  assert.equal(document.getElementById('tDiscount').textContent, '− Rs 0');
});

test('checkout with invalid data shows field errors and places no order', () => {
  const form = document.getElementById('checkoutForm');
  field(form, 'name').value = 'Al';
  field(form, 'email').value = 'not-an-email';
  field(form, 'phone').value = '123';
  field(form, 'address').value = 'Home';
  field(form, 'city').value = '';
  fire(form, 'submit');
  assert.match(document.querySelector('[data-err="name"]').textContent, /at least 3/);
  assert.match(document.querySelector('[data-err="email"]').textContent, /valid email/);
  assert.match(document.querySelector('[data-err="phone"]').textContent, /valid mobile/);
  assert.equal(document.getElementById('orderSuccess').hidden, true);
});

test('checkout with valid data places the order and empties the cart', () => {
  const form = document.getElementById('checkoutForm');
  field(form, 'name').value = 'Ali Raza';
  field(form, 'email').value = 'ali.raza@example.com';
  field(form, 'phone').value = '03001234567';
  field(form, 'address').value = 'House 12, Street 4, Gulberg';
  field(form, 'city').value = 'Lahore';
  fire(form, 'submit');
  const box = document.getElementById('orderSuccess');
  assert.equal(box.hidden, false);
  assert.match(box.textContent, /Order placed/);
  assert.match(box.textContent, /BK-/);
  assert.equal(document.getElementById('cartCount').textContent, '0');
});

test('order success message escapes HTML in the customer name (XSS guard)', () => {
  document.querySelector('[data-add="B09"]').click();
  const form = document.getElementById('checkoutForm');
  field(form, 'name').value = '<img src=x onerror=alert(1)>';
  field(form, 'email').value = 'a@b.com';
  field(form, 'phone').value = '03001234567';
  field(form, 'address').value = 'House 12, Street 4, Gulberg';
  field(form, 'city').value = 'Lahore';
  fire(form, 'submit');
  const box = document.getElementById('orderSuccess');
  assert.equal(box.querySelector('img'), null);
  assert.match(box.textContent, /<img src=x/); // shown as harmless text
});
