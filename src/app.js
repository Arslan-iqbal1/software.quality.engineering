/* BookKart v2 - UI wiring.
   All business rules live in core.js (unit-tested). This file owns:
   page state, filters pipeline, rendering, cart drawer, quick-view modal,
   wishlist, theme, toasts and localStorage persistence. */
(function () {
  'use strict';
  var K = window.BookKart;
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- persistent state (cart / wishlist / theme survive reloads) ---------- */
  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  var savedCart = loadJSON('bookkart-cart', {});
  Object.keys(savedCart).forEach(function (id) {
    if (!K.findBook(K.CATALOG, id)) delete savedCart[id];
  });

  var state = {
    catalog: K.CATALOG.map(function (b) { return Object.assign({}, b); }),
    cart: savedCart,
    wishlist: new Set(loadJSON('bookkart-wishlist', [])),
    promo: null,
    query: '',
    genre: 'All',
    sort: 'featured',
    maxPrice: 5500,
    minRating: 0,
    inStockOnly: false,
    wishOnly: false,
    view: 'grid',
    modalBook: null,
    modalQty: 1
  };

  var grid = $('bookGrid'), emptyState = $('emptyState'), resultInfo = $('resultInfo');

  /* ---------- toast ---------- */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    $('toast').appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- catalogue pipeline: search -> genre -> price -> rating -> stock -> wishlist -> sort ---------- */
  function visibleBooks() {
    var list = K.searchBooks(state.catalog, state.query);
    list = K.filterByGenre(list, state.genre);
    list = list.filter(function (b) { return b.price <= state.maxPrice; });
    list = list.filter(function (b) { return b.rating >= state.minRating; });
    if (state.inStockOnly) list = list.filter(function (b) { return b.stock > 0; });
    if (state.wishOnly) list = list.filter(function (b) { return state.wishlist.has(b.id); });
    return K.sortBooks(list, state.sort);
  }

  function renderBooks() {
    var list = visibleBooks();
    grid.innerHTML = list.map(K.renderBookCard).join('');
    grid.classList.toggle('list-view', state.view === 'list');
    emptyState.hidden = list.length !== 0;
    resultInfo.textContent = 'Showing ' + list.length + ' of ' + state.catalog.length + ' books';

    grid.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () { addToCart(btn.getAttribute('data-add'), 1, true); });
    });
    grid.querySelectorAll('[data-wish]').forEach(function (btn) {
      var id = btn.getAttribute('data-wish');
      btn.classList.toggle('active', state.wishlist.has(id));
      btn.textContent = state.wishlist.has(id) ? '♥' : '♡';
      btn.addEventListener('click', function () { toggleWish(id); });
    });
    grid.querySelectorAll('[data-view]').forEach(function (el) {
      el.addEventListener('click', function () { openModal(el.getAttribute('data-view')); });
    });
  }

  function toggleWish(id) {
    if (state.wishlist.has(id)) {
      state.wishlist.delete(id);
      toast('Removed from wishlist');
    } else {
      state.wishlist.add(id);
      toast('Added to wishlist ♥');
    }
    saveJSON('bookkart-wishlist', Array.from(state.wishlist));
    $('wishCount').textContent = state.wishlist.size;
    renderBooks();
  }

  /* ---------- cart ---------- */
  function addToCart(id, qty, openDrawer) {
    try {
      state.cart = K.addToCart(state.cart, state.catalog, id, qty);
      saveJSON('bookkart-cart', state.cart);
      renderCart();
      toast('Added to cart');
      if (openDrawer) openCart();
    } catch (e) {
      toast(e.message === 'OUT_OF_STOCK' ? 'Sorry, not enough copies in stock.' : 'Could not add this book.');
    }
  }

  function renderCart() {
    $('cartCount').textContent = K.cartCount(state.cart);
    var items = $('cartItems');
    var ids = Object.keys(state.cart);
    $('cartEmpty').hidden = ids.length !== 0;
    items.innerHTML = ids.map(function (id) {
      var book = K.findBook(state.catalog, id);
      return '<div class="cart-row">' +
        '<div class="thumb g-' + K.genreSlug(book.genre) + '">' + book.title.charAt(0) + '</div>' +
        '<div class="grow"><div class="t">' + book.title + '</div><div class="p">' + K.formatPrice(book.price) + ' each</div></div>' +
        '<div class="qty">' +
          '<button data-dec="' + id + '" aria-label="Decrease quantity">−</button>' +
          '<span>' + state.cart[id] + '</span>' +
          '<button data-inc="' + id + '" aria-label="Increase quantity">+</button>' +
        '</div>' +
        '<strong>' + K.formatPrice(book.price * state.cart[id]) + '</strong>' +
        '<button class="btn ghost" data-remove="' + id + '" aria-label="Remove item">🗑</button>' +
      '</div>';
    }).join('');

    items.querySelectorAll('[data-inc]').forEach(function (b) {
      b.addEventListener('click', function () { changeQty(b.getAttribute('data-inc'), 1); });
    });
    items.querySelectorAll('[data-dec]').forEach(function (b) {
      b.addEventListener('click', function () { changeQty(b.getAttribute('data-dec'), -1); });
    });
    items.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.cart = K.removeFromCart(state.cart, b.getAttribute('data-remove'));
        saveJSON('bookkart-cart', state.cart);
        renderCart();
      });
    });

    var totals = K.cartTotal(state.cart, state.catalog, state.promo);
    $('tSubtotal').textContent = K.formatPrice(totals.subtotal);
    $('tDiscount').textContent = '− ' + K.formatPrice(totals.discount);
    $('tDelivery').textContent = totals.deliveryFee === 0 ? 'FREE' : K.formatPrice(totals.deliveryFee);
    $('tTotal').textContent = K.formatPrice(totals.total);
  }

  function changeQty(id, delta) {
    try {
      state.cart = K.setQuantity(state.cart, state.catalog, id, (state.cart[id] || 0) + delta);
      saveJSON('bookkart-cart', state.cart);
    } catch (e) {
      if (e.message === 'OUT_OF_STOCK') toast('No more copies in stock.');
    }
    renderCart();
  }

  function openCart() { $('cartDrawer').hidden = false; }
  function closeCart() { $('cartDrawer').hidden = true; }

  /* ---------- quick-view modal ---------- */
  function openModal(id) {
    var book = K.findBook(state.catalog, id);
    if (!book) return;
    state.modalBook = book;
    state.modalQty = 1;
    $('modalContent').innerHTML =
      '<div class="modal-grid">' +
        '<div class="cover g-' + K.genreSlug(book.genre) + '"><span class="cover-initials">' + book.title.charAt(0) + '</span><span class="cover-title">' + book.title + '</span></div>' +
        '<div>' +
          '<span class="genre">' + book.genre + '</span>' +
          '<h2 id="modalTitle">' + book.title + '</h2>' +
          '<p class="modal-meta">by ' + book.author + ' · ' + book.year + ' · ' + book.pages + ' pages</p>' +
          '<p class="rating"><span class="stars">' + K.stars(book.rating) + '</span> ' + book.rating.toFixed(1) + ' / 5</p>' +
          '<p class="modal-desc">' + book.description + '</p>' +
          '<p class="modal-meta">' + (book.stock > 0 ? book.stock + ' copies in stock' : 'Out of stock') + '</p>' +
          '<div class="modal-buy">' +
            '<span class="modal-price">' + K.formatPrice(book.price) + '</span>' +
            '<div class="qty"><button id="modalDec" aria-label="Decrease quantity">−</button><span id="modalQty">1</span><button id="modalInc" aria-label="Increase quantity">+</button></div>' +
            '<button id="modalAdd" class="btn primary"' + (book.stock === 0 ? ' disabled' : '') + '>Add to Cart</button>' +
            '<button id="modalWish" class="btn wish-btn' + (state.wishlist.has(book.id) ? ' active' : '') + '" aria-label="Toggle wishlist">' + (state.wishlist.has(book.id) ? '♥' : '♡') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    $('bookModal').hidden = false;

    $('modalDec').addEventListener('click', function () {
      state.modalQty = Math.max(1, state.modalQty - 1);
      $('modalQty').textContent = state.modalQty;
    });
    $('modalInc').addEventListener('click', function () {
      state.modalQty = Math.min(book.stock || 1, state.modalQty + 1);
      $('modalQty').textContent = state.modalQty;
    });
    $('modalAdd').addEventListener('click', function () {
      addToCart(book.id, state.modalQty, false);
      closeModal();
    });
    $('modalWish').addEventListener('click', function () {
      toggleWish(book.id);
      closeModal();
    });
  }
  function closeModal() { $('bookModal').hidden = true; state.modalBook = null; }

  /* ---------- events: header ---------- */
  $('cartButton').addEventListener('click', openCart);
  $('closeCart').addEventListener('click', closeCart);
  $('cartDrawer').addEventListener('click', function (e) { if (e.target === $('cartDrawer')) closeCart(); });
  $('closeModal').addEventListener('click', closeModal);
  $('bookModal').addEventListener('click', function (e) { if (e.target === $('bookModal')) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); closeCart(); }
  });

  var savedTheme = 'light';
  try { savedTheme = localStorage.getItem('bookkart-theme') || 'light'; } catch (e) { /* ignore */ }
  document.documentElement.dataset.theme = savedTheme;
  $('themeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  $('themeToggle').addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    $('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
    try { localStorage.setItem('bookkart-theme', next); } catch (e) { /* ignore */ }
  });

  $('wishButton').addEventListener('click', function () {
    state.wishOnly = !state.wishOnly;
    $('wishOnlyToggle').checked = state.wishOnly;
    renderBooks();
    if (state.wishOnly) toast('Showing your wishlist');
  });

  /* ---------- events: filters ---------- */
  $('searchInput').addEventListener('input', function (e) { state.query = e.target.value; renderBooks(); });
  $('genreSelect').addEventListener('change', function (e) { state.genre = e.target.value; renderBooks(); });
  $('sortSelect').addEventListener('change', function (e) { state.sort = e.target.value; renderBooks(); });
  $('priceRange').addEventListener('input', function (e) {
    state.maxPrice = Number(e.target.value);
    $('priceLabel').textContent = K.formatPrice(state.maxPrice);
    renderBooks();
  });
  $('ratingSelect').addEventListener('change', function (e) { state.minRating = Number(e.target.value); renderBooks(); });
  $('stockToggle').addEventListener('change', function (e) { state.inStockOnly = e.target.checked; renderBooks(); });
  $('wishOnlyToggle').addEventListener('change', function (e) { state.wishOnly = e.target.checked; renderBooks(); });
  $('filtersToggle').addEventListener('click', function () { $('sidebar').classList.toggle('open'); });
  $('resetFilters').addEventListener('click', function () {
    state.query = ''; state.genre = 'All'; state.sort = 'featured';
    state.maxPrice = 5500; state.minRating = 0; state.inStockOnly = false; state.wishOnly = false;
    $('searchInput').value = ''; $('genreSelect').value = 'All'; $('sortSelect').value = 'featured';
    $('priceRange').value = 5500; $('priceLabel').textContent = K.formatPrice(5500);
    $('ratingSelect').value = '0'; $('stockToggle').checked = false; $('wishOnlyToggle').checked = false;
    renderBooks();
    toast('Filters reset');
  });
  $('viewGrid').addEventListener('click', function () {
    state.view = 'grid';
    $('viewGrid').classList.add('active'); $('viewList').classList.remove('active');
    renderBooks();
  });
  $('viewList').addEventListener('click', function () {
    state.view = 'list';
    $('viewList').classList.add('active'); $('viewGrid').classList.remove('active');
    renderBooks();
  });

  /* ---------- promo ---------- */
  $('applyPromo').addEventListener('click', function () {
    var code = $('promoInput').value.trim();
    var subtotal = K.cartSubtotal(state.cart, state.catalog);
    var res = K.applyDiscount(subtotal, code || null);
    var msg = $('promoMsg');
    if (res.ok && code) {
      state.promo = code.toUpperCase();
      msg.textContent = 'Promo applied: you saved ' + K.formatPrice(res.discount) + '.';
      msg.className = 'promo-msg ok';
    } else if (!code) {
      state.promo = null;
      msg.textContent = '';
      msg.className = 'promo-msg';
    } else {
      state.promo = null;
      msg.textContent = res.error === 'MINIMUM_NOT_MET'
        ? 'This code needs a higher order value.'
        : 'Invalid promo code.';
      msg.className = 'promo-msg bad';
    }
    renderCart();
  });

  /* ---------- checkout ---------- */
  $('checkoutForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var form = {
      name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
      address: fd.get('address'), city: fd.get('city')
    };
    document.querySelectorAll('[data-err]').forEach(function (p) { p.textContent = ''; });
    try {
      var result = K.placeOrder(state.cart, state.catalog, form, state.promo);
      state.catalog = result.catalog;
      state.cart = K.createCart();
      saveJSON('bookkart-cart', state.cart);
      state.promo = null;
      $('promoInput').value = '';
      $('promoMsg').textContent = '';
      var box = $('orderSuccess');
      box.hidden = false;
      box.innerHTML = '<strong>🎉 Order placed!</strong><br>Order ID: ' + result.order.id +
        '<br>Total (Cash on Delivery): ' + K.formatPrice(result.order.totals.total) +
        '<br>Thank you, ' + esc(result.order.customer.name) + '. Your books are on the way to ' + esc(result.order.customer.city) + '.';
      e.target.reset();
      toast('Order placed 🎉');
      renderBooks();
      renderCart();
    } catch (err) {
      if (err.message === 'EMPTY_CART') {
        toast('Your cart is empty. Add a book first.');
      } else if (err.message === 'VALIDATION_FAILED') {
        Object.keys(err.fields).forEach(function (field) {
          var p = document.querySelector('[data-err="' + field + '"]');
          if (p) p.textContent = err.fields[field];
        });
      }
    }
  });

  /* ---------- init ---------- */
  $('wishCount').textContent = state.wishlist.size;
  renderBooks();
  renderCart();
})();
