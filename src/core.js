/*
 * BookKart - Core business logic
 * Pure functions only (no DOM), so the exact same code that runs in the
 * browser is unit-tested in Node. UMD pattern: works as a browser global
 * (window.BookKart) and as a CommonJS module for the test suite.
 */
(function (global) {
  'use strict';

  var CATALOG = [
    { id: 'B01', title: 'The Silent Patient', author: 'Alex Michaelides', genre: 'Fiction', price: 1450, stock: 12, rating: 4.5 },
    { id: 'B02', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help', price: 1800, stock: 20, rating: 4.8 },
    { id: 'B03', title: 'A Brief History of Time', author: 'Stephen Hawking', genre: 'Science', price: 1650, stock: 8, rating: 4.6 },
    { id: 'B04', title: 'Clean Code', author: 'Robert C. Martin', genre: 'Technology', price: 3200, stock: 6, rating: 4.7 },
    { id: 'B05', title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', price: 1100, stock: 15, rating: 4.4 },
    { id: 'B06', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'History', price: 2100, stock: 10, rating: 4.7 },
    { id: 'B07', title: 'Deep Work', author: 'Cal Newport', genre: 'Self-Help', price: 1750, stock: 9, rating: 4.5 },
    { id: 'B08', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', genre: 'Technology', price: 5500, stock: 4, rating: 4.6 },
    { id: 'B09', title: 'Shah Jo Risalo', author: 'Shah Abdul Latif Bhittai', genre: 'Poetry', price: 950, stock: 14, rating: 4.9 },
    { id: 'B10', title: 'The Psychology of Money', author: 'Morgan Housel', genre: 'Finance', price: 1600, stock: 18, rating: 4.7 },
    { id: 'B11', title: 'Pakistan: A Hard Country', author: 'Anatol Lieven', genre: 'History', price: 2400, stock: 5, rating: 4.3 },
    { id: 'B12', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', genre: 'Science', price: 1950, stock: 11, rating: 4.5 }
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

  function placeOrder(cart, catalog, form, discountCode) {
    if (cartCount(cart) === 0) throw new Error('EMPTY_CART');
    var v = validateCheckout(form);
    if (!v.valid) {
      var err = new Error('VALIDATION_FAILED');
      err.fields = v.errors;
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
        customer: { name: String(form.name).trim(), city: String(form.city).trim() }
      },
      catalog: newCatalog
    };
  }

  function formatPrice(n) {
    return 'Rs ' + Number(n).toLocaleString('en-US');
  }

  function renderBookCard(book) {
    var stockLabel = book.stock === 0
      ? '<span class="badge out">Out of stock</span>'
      : '<span class="badge in">' + book.stock + ' in stock</span>';
    return '<article class="card" data-id="' + book.id + '">' +
      '<div class="card-top"><span class="genre">' + book.genre + '</span>' + stockLabel + '</div>' +
      '<h3>' + book.title + '</h3>' +
      '<p class="author">by ' + book.author + '</p>' +
      '<p class="rating">★ ' + book.rating.toFixed(1) + '</p>' +
      '<div class="card-bottom"><span class="price">' + formatPrice(book.price) + '</span>' +
      '<button class="btn add-btn" data-add="' + book.id + '"' + (book.stock === 0 ? ' disabled' : '') + '>Add to Cart</button></div>' +
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
    renderBookCard: renderBookCard
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BookKart = api;
})(typeof window !== 'undefined' ? window : globalThis);
