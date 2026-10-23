/*
 * BookKart payment UI tests (jsdom, fresh page).
 * Method selection shows the right panel; invalid payment data blocks the
 * order with field errors; a valid card order succeeds and is masked.
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
  // one book in the cart for all payment tests
  document.querySelector('[data-add="B09"]').click();
});

function fire(el, type) {
  el.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
}
function field(name) {
  return document.getElementById('checkoutForm').elements.namedItem(name);
}
function fillCustomer() {
  field('name').value = 'Ali Raza';
  field('email').value = 'ali.raza@example.com';
  field('phone').value = '03001234567';
  field('address').value = 'House 12, Street 4, Gulberg';
  field('city').value = 'Lahore';
}
function chooseMethod(value) {
  document.querySelector('input[name="paymentMethod"][value="' + value + '"]').click();
}

test('COD is selected by default and all payment panels are hidden', () => {
  assert.equal(document.querySelector('input[name="paymentMethod"]:checked').value, 'COD');
  assert.equal(document.getElementById('payCard').hidden, true);
  assert.equal(document.getElementById('payBank').hidden, true);
  assert.equal(document.getElementById('payWallet').hidden, true);
  assert.equal(document.getElementById('tPayment').textContent, 'Cash on Delivery');
});

test('choosing Card shows the card panel and updates the order button', () => {
  chooseMethod('CARD');
  assert.equal(document.getElementById('payCard').hidden, false);
  assert.equal(document.getElementById('payWallet').hidden, true);
  assert.equal(document.getElementById('tPayment').textContent, 'Debit / Credit Card');
  assert.match(document.getElementById('placeOrderBtn').textContent, /Pay/);
});

test('an invalid card blocks the order and shows the field error', () => {
  fillCustomer();
  field('cardName').value = 'Ali Raza';
  field('cardNumber').value = '4242424242424241'; // fails Luhn
  field('cardExpiry').value = '12/30';
  field('cardCvv').value = '123';
  fire(document.getElementById('checkoutForm'), 'submit');
  assert.match(document.querySelector('[data-err="cardNumber"]').textContent, /valid card number/);
  assert.equal(document.getElementById('orderSuccess').hidden, true);
});

test('a valid card places the order and the success box masks the number', () => {
  field('cardNumber').value = '4242 4242 4242 4242';
  fire(document.getElementById('checkoutForm'), 'submit');
  const box = document.getElementById('orderSuccess');
  assert.equal(box.hidden, false);
  assert.match(box.textContent, /Debit \/ Credit Card/);
  assert.match(box.textContent, /4242/);
  assert.ok(!box.textContent.includes('4242 4242'), 'full number must not be displayed');
});

test('choosing Easypaisa shows the wallet panel with the right label', () => {
  chooseMethod('EASYPAISA');
  assert.equal(document.getElementById('payWallet').hidden, false);
  assert.equal(document.getElementById('payCard').hidden, true);
  assert.equal(document.getElementById('walletLabel').textContent, 'Easypaisa');
  chooseMethod('JAZZCASH');
  assert.equal(document.getElementById('walletLabel').textContent, 'JazzCash');
});

test('bank transfer shows the account details panel', () => {
  chooseMethod('BANK');
  assert.equal(document.getElementById('payBank').hidden, false);
  assert.match(document.getElementById('payBank').textContent, /Meezan Bank/);
  chooseMethod('COD');
  assert.equal(document.getElementById('payBank').hidden, true);
});
