/*
 * BookKart - Core business logic
 * Pure functions only (no DOM), so the exact same code that runs in the
 * browser is unit-tested in Node. UMD pattern: works as a browser global
 * (window.BookKart) and as a CommonJS module for the test suite.
 */
(function (global) {
  'use strict';

  var CATALOG = [
    { id: 'B01', title: 'The Silent Patient', author: 'Alex Michaelides', genre: 'Fiction', price: 1450, mrp: 2400, stock: 12, rating: 4.5, pages: 336, year: 2019, description: 'A famous painter stops speaking after a shocking act of violence. A psychotherapist becomes obsessed with uncovering her motive in this gripping psychological thriller.' },
    { id: 'B02', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help', price: 1800, mrp: 2600, stock: 20, rating: 4.8, pages: 320, year: 2018, description: 'Tiny changes, remarkable results. A proven framework for building good habits and breaking bad ones, backed by biology, psychology and neuroscience.' },
    { id: 'B03', title: 'A Brief History of Time', author: 'Stephen Hawking', genre: 'Science', price: 1650, mrp: 2800, stock: 8, rating: 4.6, pages: 256, year: 1988, description: 'From the Big Bang to black holes — Hawking explores the deepest questions of the universe in language anyone can follow.' },
    { id: 'B04', title: 'Clean Code', author: 'Robert C. Martin', genre: 'Technology', price: 3200, mrp: 4500, stock: 6, rating: 4.7, pages: 464, year: 2008, description: 'A handbook of agile software craftsmanship. Learn to write code that is readable, testable and easy to change — with real case studies.' },
    { id: 'B05', title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', price: 1100, mrp: 1800, stock: 15, rating: 4.4, pages: 208, year: 1988, description: 'Santiago, an Andalusian shepherd, travels to Egypt in search of treasure and discovers his Personal Legend. A beloved fable about following your dreams.' },
    { id: 'B06', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'History', price: 2100, mrp: 3200, stock: 10, rating: 4.7, pages: 512, year: 2011, description: 'A brief history of humankind — how myths, money and empires united strangers and made Homo sapiens the rulers of the world.' },
    { id: 'B07', title: 'Deep Work', author: 'Cal Newport', genre: 'Self-Help', price: 1750, mrp: 2900, stock: 9, rating: 4.5, pages: 304, year: 2016, description: 'Rules for focused success in a distracted world. Newport makes the case that deep, undistracted work is the superpower of the knowledge economy.' },
    { id: 'B08', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', genre: 'Technology', price: 5500, mrp: 7500, stock: 4, rating: 4.6, pages: 1312, year: 2009, description: 'The definitive algorithms textbook used in universities worldwide — sorting, graphs, dynamic programming and much more, with pseudocode throughout.' },
    { id: 'B09', title: 'Shah Jo Risalo', author: 'Shah Abdul Latif Bhittai', genre: 'Poetry', price: 950, mrp: 1600, stock: 14, rating: 4.9, pages: 380, year: 1740, description: 'The timeless Sindhi poetry of Shah Abdul Latif Bhittai — thirty surs of love, devotion and the human search for truth.' },
    { id: 'B10', title: 'The Psychology of Money', author: 'Morgan Housel', genre: 'Finance', price: 1600, mrp: 2500, stock: 18, rating: 4.7, pages: 256, year: 2020, description: 'Nineteen short stories exploring the strange ways people think about wealth, greed and happiness. Doing well with money has surprisingly little to do with how smart you are.' },
    { id: 'B11', title: 'Pakistan: A Hard Country', author: 'Anatol Lieven', genre: 'History', price: 2400, mrp: 3600, stock: 5, rating: 4.3, pages: 560, year: 2011, description: 'A deeply reported portrait of Pakistan — its people, politics, military and resilience — by a journalist who has covered the country for decades.' },
    { id: 'B12', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', genre: 'Science', price: 1950, mrp: 3000, stock: 11, rating: 4.5, pages: 512, year: 2011, description: 'Nobel laureate Daniel Kahneman explains the two systems that drive the way we think — fast intuition and slow logic — and how they shape our choices.' }
  ];

  var DISCOUNT_CODES = {
    STUDENT10: { type: 'percent', value: 10, minSubtotal: 0, description: '10% student discount' },
    BOOKWORM20: { type: 'percent', value: 20, minSubtotal: 2000, description: '20% off on orders of Rs 2,000 or more' },
    FLAT150: { type: 'flat', value: 150, minSubtotal: 1500, description: 'Flat Rs 150 off on orders of Rs 1,500 or more' }
  };

  var FREE_DELIVERY_THRESHOLD = 1000;
  var DELIVERY_FEE = 150;

  function findBook(catalog, bookId) {
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].id === bookId) return catalog[i];
    }
    return null;
  }

  function searchBooks(catalog, query) {
    var q = String(query == null ? '' : query).trim().toLowerCase();
    if (q === '') return catalog.slice();
    return catalog.filter(function (b) {
      return b.title.toLowerCase().indexOf(q) !== -1 ||
             b.author.toLowerCase().indexOf(q) !== -1;
    });
  }

  function filterByGenre(catalog, genre) {
    if (!genre || genre === 'All') return catalog.slice();
    return catalog.filter(function (b) { return b.genre === genre; });
  }

  function sortBooks(catalog, key) {
    var list = catalog.slice();
    switch (key) {
      case 'price-asc': list.sort(function (a, b) { return a.price - b.price; }); break;
      case 'price-desc': list.sort(function (a, b) { return b.price - a.price; }); break;
      case 'rating-desc': list.sort(function (a, b) { return b.rating - a.rating; }); break;
      case 'title-asc': list.sort(function (a, b) { return a.title.localeCompare(b.title); }); break;
      default: break; // 'featured' keeps catalog order
    }
    return list;
  }

  function createCart() { return {}; }

  function addToCart(cart, catalog, bookId, qty) {
    var book = findBook(catalog, bookId);
    if (!book) throw new Error('BOOK_NOT_FOUND');
    var amount = qty == null ? 1 : qty;
    if (typeof amount !== 'number' || !isFinite(amount) || Math.floor(amount) !== amount) {
      throw new Error('INVALID_QUANTITY');
    }
    if (amount <= 0) throw new Error('INVALID_QUANTITY');
    var current = cart[bookId] || 0;
    if (current + amount > book.stock) throw new Error('OUT_OF_STOCK');
    var next = Object.assign({}, cart);
    next[bookId] = current + amount;
    return next;
  }

  function setQuantity(cart, catalog, bookId, qty) {
    var book = findBook(catalog, bookId);
    if (!book) throw new Error('BOOK_NOT_FOUND');
    if (typeof qty !== 'number' || !isFinite(qty) || Math.floor(qty) !== qty || qty < 0) {
      throw new Error('INVALID_QUANTITY');
    }
    if (qty > book.stock) throw new Error('OUT_OF_STOCK');
    var next = Object.assign({}, cart);
    if (qty === 0) delete next[bookId]; else next[bookId] = qty;
    return next;
  }

  function removeFromCart(cart, bookId) {
    var next = Object.assign({}, cart);
    delete next[bookId];
    return next;
  }

  function cartCount(cart) {
    return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id]; }, 0);
  }

  function cartSubtotal(cart, catalog) {
    return Object.keys(cart).reduce(function (sum, id) {
      var book = findBook(catalog, id);
      return book ? sum + book.price * cart[id] : sum;
    }, 0);
  }

  function applyDiscount(subtotal, code) {
    if (!code) return { ok: true, discount: 0, code: null };
    var rule = DISCOUNT_CODES[String(code).trim().toUpperCase()];
    if (!rule) return { ok: false, discount: 0, error: 'INVALID_CODE' };
    if (subtotal < rule.minSubtotal) return { ok: false, discount: 0, error: 'MINIMUM_NOT_MET' };
    var discount = rule.type === 'percent'
      ? Math.round(subtotal * rule.value / 100)
      : Math.min(rule.value, subtotal);
    return { ok: true, discount: discount, code: String(code).trim().toUpperCase() };
  }

  function deliveryFee(amountAfterDiscount, itemCount) {
    if (itemCount === 0) return 0;
    return amountAfterDiscount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  }

  function cartTotal(cart, catalog, code) {
    var subtotal = cartSubtotal(cart, catalog);
    var d = applyDiscount(subtotal, code);
    var fee = deliveryFee(subtotal - d.discount, cartCount(cart));
    return {
      subtotal: subtotal,
      discount: d.discount,
      discountOk: d.ok,
      discountError: d.ok ? null : d.error,
      deliveryFee: fee,
      total: subtotal - d.discount + fee
    };
  }

  function validateCheckout(form) {
    var errors = {};
    var name = String(form.name || '').trim();
    var email = String(form.email || '').trim();
    var phone = String(form.phone || '').replace(/[\s-]/g, '');
    var address = String(form.address || '').trim();
    var city = String(form.city || '').trim();

    if (name.length < 3) errors.name = 'Name must be at least 3 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!/^03\d{9}$/.test(phone)) errors.phone = 'Enter a valid mobile number (e.g. 03001234567).';
    if (address.length < 10) errors.address = 'Address must be at least 10 characters.';
    if (city.length < 3) errors.city = 'Enter your city.';
    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  var PAYMENT_METHODS = {
    COD: { label: 'Cash on Delivery', note: 'Pay in cash when your order arrives at your doorstep.' },
    CARD: { label: 'Debit / Credit Card', note: 'Pay securely by card now. (Demo checkout - no real charge is made.)' },
    BANK: { label: 'Bank Transfer', note: 'Transfer the total to our bank account and use your order ID as the reference. Account: BookKart, Meezan Bank, IBAN PK36 MEZN 0001 0101 0101 0101.' },
    EASYPAISA: { label: 'Easypaisa', note: 'Pay from your Easypaisa mobile account.' },
    JAZZCASH: { label: 'JazzCash', note: 'Pay from your JazzCash mobile account.' }
  };

  function luhnValid(digits) {
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var d = digits.charCodeAt(i) - 48;
      if (d < 0 || d > 9) return false;
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      alt = !alt;
    }
    return digits.length >= 13 && sum % 10 === 0;
  }

  function validatePayment(payment) {
    var errors = {};
    var method = payment && payment.method ? String(payment.method).toUpperCase() : 'COD';
    if (!PAYMENT_METHODS[method]) {
      errors.payment = 'Select a valid payment method.';
      return { valid: false, errors: errors, method: method };
    }
    if (method === 'CARD') {
      var num = String(payment.cardNumber || '').replace(/[\s-]/g, '');
      var name = String(payment.cardName || '').trim();
      var exp = String(payment.cardExpiry || '').trim();
      var cvv = String(payment.cardCvv || '').replace(/\s/g, '');
      if (name.length < 3) errors.cardName = 'Enter the name on the card.';
      if (!luhnValid(num)) errors.cardNumber = 'Enter a valid card number.';
      var m = exp.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
      if (!m) {
        errors.cardExpiry = 'Use MM/YY format.';
      } else {
        var expDate = new Date(2000 + Number(m[2]), Number(m[1]), 0, 23, 59, 59);
        if (expDate < new Date()) errors.cardExpiry = 'This card has expired.';
      }
      if (!/^\d{3,4}$/.test(cvv)) errors.cardCvv = 'Enter the 3-4 digit CVV.';
    }
    if (method === 'EASYPAISA' || method === 'JAZZCASH') {
      var wallet = String(payment.walletNumber || '').replace(/[\s-]/g, '');
      if (!/^03\d{9}$/.test(wallet)) {
        errors.walletNumber = 'Enter a valid mobile account number (e.g. 03001234567).';
      }
    }
    return { valid: Object.keys(errors).length === 0, errors: errors, method: method };
  }

  function paymentSummary(payment) {
    var method = payment && payment.method ? String(payment.method).toUpperCase() : 'COD';
    var rule = PAYMENT_METHODS[method] || PAYMENT_METHODS.COD;
    var summary = { method: method, label: rule.label, note: rule.note, detail: '' };
    if (method === 'CARD') {
      var num = String(payment.cardNumber || '').replace(/[\s-]/g, '');
      summary.detail = 'Card ending in ' + num.slice(-4);
    } else if (method === 'EASYPAISA' || method === 'JAZZCASH') {
      var w = String(payment.walletNumber || '').replace(/[\s-]/g, '');
      summary.detail = rule.label + ' account ending in ' + w.slice(-4);
    } else if (method === 'BANK') {
      summary.detail = 'Transfer to BookKart, Meezan Bank (use order ID as reference)';
    } else {
      summary.detail = 'Keep the exact cash ready for the rider';
    }
    return summary;
  }

  function placeOrder(cart, catalog, form, discountCode, payment) {
    if (cartCount(cart) === 0) throw new Error('EMPTY_CART');
    var v = validateCheckout(form);
    var pv = validatePayment(payment || { method: 'COD' });
    var allErrors = Object.assign({}, v.errors, pv.errors);
    if (!v.valid || !pv.valid) {
      var err = new Error('VALIDATION_FAILED');
      err.fields = allErrors;
      throw err;
    }
    var totals = cartTotal(cart, catalog, discountCode);
    var newCatalog = catalog.map(function (b) {
      if (cart[b.id]) {
        var copy = Object.assign({}, b);
        copy.stock = b.stock - cart[b.id];
        return copy;
      }
      return b;
    });
    var orderId = 'BK-' + Date.now().toString(36).toUpperCase();
    return {
      order: {
        id: orderId,
        items: Object.keys(cart).map(function (id) {
          var book = findBook(catalog, id);
          return { id: id, title: book.title, qty: cart[id], price: book.price };
        }),
        totals: totals,
        payment: paymentSummary(payment || { method: 'COD' }),
        customer: { name: String(form.name).trim(), city: String(form.city).trim() }
      },
      catalog: newCatalog
    };
  }

  function formatPrice(n) {
    return 'Rs ' + Number(n).toLocaleString('en-US');
  }

  function savePercent(book) {
    if (!book.mrp || book.mrp <= book.price) return 0;
    return Math.round((1 - book.price / book.mrp) * 100);
  }

  function stars(rating) {
    var full = Math.round(rating);
    var out = '';
    for (var i = 0; i < 5; i++) out += i < full ? '★' : '☆';
    return out;
  }

  function genreSlug(genre) {
    return String(genre).toLowerCase().replace(/\s+/g, '-');
  }

  function initials(title) {
    return title.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  }

  function renderBookCard(book) {
    var stockLabel = book.stock === 0
      ? '<span class="badge out">Out of stock</span>'
      : '<span class="badge in">' + book.stock + ' in stock</span>';
    var best = book.rating >= 4.7 ? '<span class="badge best">Bestseller</span>' : '';
    var save = savePercent(book);
    var saveBadge = save > 0 ? '<span class="badge save">Save ' + save + '%</span>' : '';
    var mrpHtml = save > 0 ? ' <s class="mrp">' + formatPrice(book.mrp) + '</s>' : '';
    return '<article class="card" data-id="' + book.id + '">' +
      '<div class="cover g-' + genreSlug(book.genre) + '" data-view="' + book.id + '" role="button" tabindex="0" aria-label="View ' + book.title + '">' +
        '<span class="cover-initials">' + initials(book.title) + '</span>' +
        '<span class="cover-title">' + book.title + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-top"><span class="genre">' + book.genre + '</span><span>' + saveBadge + stockLabel + '</span></div>' +
        '<h3 data-view="' + book.id + '">' + book.title + '</h3>' +
        '<p class="author">by ' + book.author + '</p>' +
        '<p class="rating"><span class="stars">' + stars(book.rating) + '</span> ' + book.rating.toFixed(1) + ' ' + best + '</p>' +
        '<div class="card-bottom"><span class="price">' + formatPrice(book.price) + mrpHtml + '</span>' +
        '<div class="card-actions">' +
          '<button class="btn wish-btn" data-wish="' + book.id + '" aria-label="Add to wishlist">♡</button>' +
          '<button class="btn add-btn" data-add="' + book.id + '"' + (book.stock === 0 ? ' disabled' : '') + '>Add to Cart</button>' +
        '</div></div>' +
      '</div>' +
      '</article>';
  }

  var api = {
    CATALOG: CATALOG,
    DISCOUNT_CODES: DISCOUNT_CODES,
    FREE_DELIVERY_THRESHOLD: FREE_DELIVERY_THRESHOLD,
    DELIVERY_FEE: DELIVERY_FEE,
    findBook: findBook,
    searchBooks: searchBooks,
    filterByGenre: filterByGenre,
    sortBooks: sortBooks,
    createCart: createCart,
    addToCart: addToCart,
    setQuantity: setQuantity,
    removeFromCart: removeFromCart,
    cartCount: cartCount,
    cartSubtotal: cartSubtotal,
    applyDiscount: applyDiscount,
    deliveryFee: deliveryFee,
    cartTotal: cartTotal,
    validateCheckout: validateCheckout,
    placeOrder: placeOrder,
    formatPrice: formatPrice,
    savePercent: savePercent,
    PAYMENT_METHODS: PAYMENT_METHODS,
    validatePayment: validatePayment,
    paymentSummary: paymentSummary,
    stars: stars,
    genreSlug: genreSlug,
    renderBookCard: renderBookCard
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BookKart = api;
})(typeof window !== 'undefined' ? window : globalThis);
