/*
 * BookKart automated test suite (Node built-in test runner — zero dependencies).
 * Techniques used: equivalence partitioning, boundary value analysis,
 * decision-table testing (discount/delivery rules), error guessing.
 * Run: npm test
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const K = require('../src/core.js');

const catalog = K.CATALOG;
const validForm = {
  name: 'Ali Raza',
  email: 'ali.raza@example.com',
  phone: '03001234567',
  address: 'House 12, Street 4, Gulberg',
  city: 'Lahore'
};

/* ---------- Catalog integrity ---------- */

test('catalog contains 12 books with unique ids', () => {
  assert.equal(catalog.length, 12);
  assert.equal(new Set(catalog.map(b => b.id)).size, 12);
});

test('every book has a positive price, non-negative stock and a rating within 0-5', () => {
  for (const b of catalog) {
    assert.ok(b.price > 0, b.id);
    assert.ok(b.stock >= 0, b.id);
    assert.ok(b.rating >= 0 && b.rating <= 5, b.id);
  }
});

/* ---------- Search (equivalence partitioning) ---------- */

test('search matches by title (case-insensitive)', () => {
  const r = K.searchBooks(catalog, 'atomic');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'B02');
});

test('search matches by author', () => {
  const r = K.searchBooks(catalog, 'Hawking');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'B03');
});

test('empty search returns the full catalog', () => {
  assert.equal(K.searchBooks(catalog, '').length, 12);
  assert.equal(K.searchBooks(catalog, '   ').length, 12);
});

test('search with no match returns an empty list', () => {
  assert.deepEqual(K.searchBooks(catalog, 'zzzz-not-a-book'), []);
});

/* ---------- Genre filter ---------- */

test('genre filter returns only books of that genre', () => {
  const r = K.filterByGenre(catalog, 'Fiction');
  assert.equal(r.length, 2);
  assert.ok(r.every(b => b.genre === 'Fiction'));
});

test("genre filter 'All' returns the full catalog", () => {
  assert.equal(K.filterByGenre(catalog, 'All').length, 12);
});

/* ---------- Sorting ---------- */

test('sort by price ascending puts the cheapest book first', () => {
  const r = K.sortBooks(catalog, 'price-asc');
  assert.equal(r[0].price, 950);
  assert.equal(r[r.length - 1].price, 5500);
});

test('sort by price descending puts the most expensive book first', () => {
  assert.equal(K.sortBooks(catalog, 'price-desc')[0].price, 5500);
});

test('sort by rating puts a top-rated book first', () => {
  assert.equal(K.sortBooks(catalog, 'rating-desc')[0].rating, 4.9);
});

test('sorting does not mutate the original catalog order', () => {
  const before = catalog.map(b => b.id).join(',');
  K.sortBooks(catalog, 'price-asc');
  assert.equal(catalog.map(b => b.id).join(','), before);
});

/* ---------- Cart: add (boundary value analysis on stock) ---------- */

test('addToCart adds a new item with default quantity 1', () => {
  const cart = K.addToCart(K.createCart(), catalog, 'B01');
  assert.deepEqual(cart, { B01: 1 });
});

test('addToCart accumulates quantity for the same book', () => {
  let cart = K.addToCart(K.createCart(), catalog, 'B02', 2);
  cart = K.addToCart(cart, catalog, 'B02', 3);
  assert.equal(cart.B02, 5);
});

test('addToCart allows quantity exactly equal to stock (upper boundary)', () => {
  const cart = K.addToCart(K.createCart(), catalog, 'B08', 4); // stock = 4
  assert.equal(cart.B08, 4);
});

test('addToCart rejects quantity one above stock (upper boundary + 1)', () => {
  assert.throws(() => K.addToCart(K.createCart(), catalog, 'B08', 5), /OUT_OF_STOCK/);
});

test('addToCart rejects a cumulative quantity above stock', () => {
  const cart = K.addToCart(K.createCart(), catalog, 'B08', 3);
  assert.throws(() => K.addToCart(cart, catalog, 'B08', 2), /OUT_OF_STOCK/);
});

test('addToCart rejects zero and negative quantities', () => {
  assert.throws(() => K.addToCart(K.createCart(), catalog, 'B01', 0), /INVALID_QUANTITY/);
  assert.throws(() => K.addToCart(K.createCart(), catalog, 'B01', -2), /INVALID_QUANTITY/);
});

test('addToCart rejects fractional quantity', () => {
  assert.throws(() => K.addToCart(K.createCart(), catalog, 'B01', 2.5), /INVALID_QUANTITY/);
});

test('addToCart rejects an unknown book id', () => {
  assert.throws(() => K.addToCart(K.createCart(), catalog, 'B99', 1), /BOOK_NOT_FOUND/);
});

test('addToCart does not mutate the original cart', () => {
  const cart = K.createCart();
  K.addToCart(cart, catalog, 'B01', 1);
  assert.deepEqual(cart, {});
});

/* ---------- Cart: set quantity / remove / totals ---------- */

test('setQuantity updates quantity and zero removes the item', () => {
  let cart = K.addToCart(K.createCart(), catalog, 'B01', 1);
  cart = K.setQuantity(cart, catalog, 'B01', 3);
  assert.equal(cart.B01, 3);
  cart = K.setQuantity(cart, catalog, 'B01', 0);
  assert.deepEqual(cart, {});
});

test('setQuantity rejects quantity above stock', () => {
  const cart = K.addToCart(K.createCart(), catalog, 'B04', 1); // stock = 6
  assert.throws(() => K.setQuantity(cart, catalog, 'B04', 7), /OUT_OF_STOCK/);
});

test('removeFromCart removes only the given item', () => {
  let cart = K.addToCart(K.createCart(), catalog, 'B01', 1);
  cart = K.addToCart(cart, catalog, 'B02', 1);
  cart = K.removeFromCart(cart, 'B01');
  assert.deepEqual(cart, { B02: 1 });
});

test('cartCount sums all quantities', () => {
  assert.equal(K.cartCount({ B01: 2, B05: 3 }), 5);
  assert.equal(K.cartCount({}), 0);
});

test('cartSubtotal multiplies price by quantity and sums', () => {
  // 2 x Rs 1,450 (B01) + 1 x Rs 950 (B09) = 3,850
  assert.equal(K.cartSubtotal({ B01: 2, B09: 1 }, catalog), 3850);
  assert.equal(K.cartSubtotal({}, catalog), 0);
});

/* ---------- Discounts (decision table) ---------- */

test('no promo code gives zero discount', () => {
  assert.deepEqual(K.applyDiscount(5000, null), { ok: true, discount: 0, code: null });
});

test('STUDENT10 gives 10% off any order', () => {
  const r = K.applyDiscount(1000, 'STUDENT10');
  assert.equal(r.ok, true);
  assert.equal(r.discount, 100);
});

test('promo codes are case-insensitive', () => {
  assert.equal(K.applyDiscount(1000, 'student10').discount, 100);
});

test('BOOKWORM20 applies at exactly Rs 2,000 subtotal (lower boundary)', () => {
  const r = K.applyDiscount(2000, 'BOOKWORM20');
  assert.equal(r.ok, true);
  assert.equal(r.discount, 400);
});

test('BOOKWORM20 is rejected at Rs 1,999 subtotal (boundary - 1)', () => {
  const r = K.applyDiscount(1999, 'BOOKWORM20');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'MINIMUM_NOT_MET');
});

test('FLAT150 applies at exactly Rs 1,500 and is rejected at Rs 1,499', () => {
  assert.equal(K.applyDiscount(1500, 'FLAT150').discount, 150);
  assert.equal(K.applyDiscount(1499, 'FLAT150').error, 'MINIMUM_NOT_MET');
});

test('an unknown promo code is rejected', () => {
  const r = K.applyDiscount(5000, 'FREESTUFF');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'INVALID_CODE');
});

/* ---------- Delivery fee (boundary value analysis) ---------- */

test('delivery is free for an empty cart', () => {
  assert.equal(K.deliveryFee(0, 0), 0);
});

test('delivery fee applies below Rs 1,000 and is free at exactly Rs 1,000', () => {
  assert.equal(K.deliveryFee(999, 1), 150);
  assert.equal(K.deliveryFee(1000, 1), 0);
  assert.equal(K.deliveryFee(2500, 2), 0);
});

/* ---------- Cart total (integration of subtotal + discount + delivery) ---------- */

test('cartTotal: single book below free-delivery threshold', () => {
  // B09 = Rs 950, no code -> fee 150 -> total 1,100
  const t = K.cartTotal({ B09: 1 }, catalog, null);
  assert.deepEqual(
    { subtotal: t.subtotal, discount: t.discount, fee: t.deliveryFee, total: t.total },
    { subtotal: 950, discount: 0, fee: 150, total: 1100 }
  );
});

test('cartTotal: discount can pull an order below the free-delivery threshold', () => {
  // 1 x B01 (1,450) with STUDENT10 -> discount 145 -> 1,305 >= 1,000 -> free delivery
  const t1 = K.cartTotal({ B01: 1 }, catalog, 'STUDENT10');
  assert.equal(t1.discount, 145);
  assert.equal(t1.deliveryFee, 0);
  assert.equal(t1.total, 1305);
  // 1 x B05 (1,100) with STUDENT10 -> discount 110 -> 990 < 1,000 -> fee applies
  const t2 = K.cartTotal({ B05: 1 }, catalog, 'STUDENT10');
  assert.equal(t2.discount, 110);
  assert.equal(t2.deliveryFee, 150);
  assert.equal(t2.total, 1140);
});

/* ---------- Checkout validation (equivalence partitioning) ---------- */

test('a fully valid checkout form passes validation', () => {
  const v = K.validateCheckout(validForm);
  assert.equal(v.valid, true);
  assert.deepEqual(v.errors, {});
});

test('phone numbers with dashes or spaces are accepted', () => {
  assert.equal(K.validateCheckout({ ...validForm, phone: '0300-1234567' }).valid, true);
  assert.equal(K.validateCheckout({ ...validForm, phone: '0300 1234567' }).valid, true);
});

test('invalid emails are rejected', () => {
  for (const email of ['plainaddress', 'a@b', 'a@.com', 'a b@c.com', '']) {
    const v = K.validateCheckout({ ...validForm, email });
    assert.equal(v.valid, false, email);
    assert.ok(v.errors.email, email);
  }
});

test('invalid phone numbers are rejected', () => {
  for (const phone of ['02001234567', '0300123456', '030012345678', 'abcdefghijk', '']) {
    const v = K.validateCheckout({ ...validForm, phone });
    assert.equal(v.valid, false, phone);
    assert.ok(v.errors.phone, phone);
  }
});

test('short name, short address and empty city are each rejected', () => {
  assert.ok(K.validateCheckout({ ...validForm, name: 'Al' }).errors.name);
  assert.ok(K.validateCheckout({ ...validForm, address: 'House 1' }).errors.address);
  assert.ok(K.validateCheckout({ ...validForm, city: '' }).errors.city);
});

test('all invalid fields are reported together', () => {
  const v = K.validateCheckout({ name: '', email: 'x', phone: '1', address: '', city: '' });
  assert.equal(v.valid, false);
  assert.deepEqual(Object.keys(v.errors).sort(), ['address', 'city', 'email', 'name', 'phone']);
});

/* ---------- Place order (system-level behaviour) ---------- */

test('placeOrder succeeds, decrements stock and computes totals', () => {
  const cart = { B02: 2 }; // 2 x 1,800 = 3,600, free delivery
  const { order, catalog: newCatalog } = K.placeOrder(cart, catalog, validForm, null);
  assert.equal(order.totals.total, 3600);
  assert.equal(order.items.length, 1);
  assert.match(order.id, /^BK-/);
  assert.equal(K.findBook(newCatalog, 'B02').stock, 18); // 20 - 2
});

test('placeOrder does not mutate the original catalog', () => {
  K.placeOrder({ B02: 1 }, catalog, validForm, null);
  assert.equal(K.findBook(catalog, 'B02').stock, 20);
});

test('placeOrder rejects an empty cart', () => {
  assert.throws(() => K.placeOrder({}, catalog, validForm, null), /EMPTY_CART/);
});

test('placeOrder rejects an invalid form and reports the fields', () => {
  assert.throws(
    () => K.placeOrder({ B01: 1 }, catalog, { ...validForm, email: 'bad' }, null),
    (err) => err.message === 'VALIDATION_FAILED' && !!err.fields.email
  );
});

/* ---------- Presentation helpers ---------- */

test('formatPrice formats rupees with thousands separators', () => {
  assert.equal(K.formatPrice(950), 'Rs 950');
  assert.equal(K.formatPrice(1250), 'Rs 1,250');
  assert.equal(K.formatPrice(5500), 'Rs 5,500');
});

test('renderBookCard shows title, author, genre and formatted price', () => {
  const html = K.renderBookCard(K.findBook(catalog, 'B04'));
  assert.ok(html.includes('Clean Code'));
  assert.ok(html.includes('Robert C. Martin'));
  assert.ok(html.includes('Technology'));
  assert.ok(html.includes('Rs 3,200'));
  assert.ok(!html.includes('disabled'));
});

test('renderBookCard disables the buy button for an out-of-stock book', () => {
  const html = K.renderBookCard({ id: 'BX', title: 'Gone', author: 'A', genre: 'Fiction', price: 500, stock: 0, rating: 4.0 });
  assert.ok(html.includes('Out of stock'));
  assert.ok(html.includes('disabled'));
});

/* ---------- Sale pricing (Books Villa style compare-at prices) ---------- */

test('every book has an MRP above its selling price and a sensible save percent', () => {
  for (const b of catalog) {
    assert.ok(b.mrp > b.price, b.id);
    const pct = K.savePercent(b);
    assert.ok(pct >= 20 && pct <= 50, b.id + ' ' + pct);
  }
  assert.equal(K.savePercent(K.findBook(catalog, 'B01')), 40); // 1450 vs 2400
});

/* ---------- Payment methods ---------- */

const cardOk = { method: 'CARD', cardName: 'Ali Raza', cardNumber: '4242 4242 4242 4242', cardExpiry: '12/30', cardCvv: '123' };

test('COD and bank transfer need no extra payment details', () => {
  assert.equal(K.validatePayment({ method: 'COD' }).valid, true);
  assert.equal(K.validatePayment({ method: 'BANK' }).valid, true);
  assert.equal(K.validatePayment(null).valid, true); // defaults to COD
  assert.equal(K.validatePayment({ method: 'BARTER' }).valid, false);
});

test('a valid card passes (Luhn check, future expiry, 3-digit CVV)', () => {
  assert.equal(K.validatePayment(cardOk).valid, true);
  assert.equal(K.validatePayment({ ...cardOk, cardNumber: '4242424242424242' }).valid, true);
});

test('a card number failing the Luhn check is rejected', () => {
  const v = K.validatePayment({ ...cardOk, cardNumber: '4242424242424241' });
  assert.equal(v.valid, false);
  assert.ok(v.errors.cardNumber);
});

test('an expired card is rejected; the current month is accepted', () => {
  assert.ok(K.validatePayment({ ...cardOk, cardExpiry: '01/20' }).errors.cardExpiry);
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(2);
  assert.equal(K.validatePayment({ ...cardOk, cardExpiry: mm + '/' + yy }).valid, true);
});

test('bad CVV and bad expiry format are rejected', () => {
  assert.ok(K.validatePayment({ ...cardOk, cardCvv: '12' }).errors.cardCvv);
  assert.ok(K.validatePayment({ ...cardOk, cardCvv: 'abcd' }).errors.cardCvv);
  assert.ok(K.validatePayment({ ...cardOk, cardExpiry: '13/30' }).errors.cardExpiry);
  assert.ok(K.validatePayment({ ...cardOk, cardExpiry: '1230' }).errors.cardExpiry);
  assert.ok(K.validatePayment({ ...cardOk, cardName: 'Al' }).errors.cardName);
});

test('wallet payments require a valid Pakistani mobile number', () => {
  assert.equal(K.validatePayment({ method: 'EASYPAISA', walletNumber: '03001234567' }).valid, true);
  assert.equal(K.validatePayment({ method: 'JAZZCASH', walletNumber: '0300-1234567' }).valid, true);
  assert.ok(K.validatePayment({ method: 'EASYPAISA', walletNumber: '12345' }).errors.walletNumber);
});

test('placeOrder records the payment method and masks the card number', () => {
  const { order } = K.placeOrder({ B01: 1 }, catalog, validForm, null, cardOk);
  assert.equal(order.payment.method, 'CARD');
  assert.equal(order.payment.detail, 'Card ending in 4242');
  assert.ok(!JSON.stringify(order).includes('4242424242424242'), 'full card number must never be stored');
});

test('placeOrder defaults to COD and rejects an invalid payment', () => {
  const { order } = K.placeOrder({ B01: 1 }, catalog, validForm, null);
  assert.equal(order.payment.method, 'COD');
  assert.throws(
    () => K.placeOrder({ B01: 1 }, catalog, validForm, null, { ...cardOk, cardCvv: '1' }),
    (err) => err.message === 'VALIDATION_FAILED' && !!err.fields.cardCvv
  );
});
