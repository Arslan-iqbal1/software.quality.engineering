/* BookKart - UI wiring. All business rules live in core.js (unit-tested);
   this file only reads user input, calls core functions and renders. */
(function () {
  'use strict';
  var K = window.BookKart;

  var state = {
    catalog: K.CATALOG.map(function (b) { return Object.assign({}, b); }),
    cart: K.createCart(),
    promo: null,
    query: '',
    genre: 'All',
    sort: 'featured'
  };

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var grid = $('bookGrid'), emptyState = $('emptyState'), resultInfo = $('resultInfo');

  function visibleBooks() {
    var list = K.searchBooks(state.catalog, state.query);
    list = K.filterByGenre(list, state.genre);
    return K.sortBooks(list, state.sort);
  }

  function renderBooks() {
    var list = visibleBooks();
    grid.innerHTML = list.map(K.renderBookCard).join('');
    emptyState.hidden = list.length !== 0;
    resultInfo.textContent = 'Showing ' + list.length + ' of ' + state.catalog.length + ' books';
    grid.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        try {
          state.cart = K.addToCart(state.cart, state.catalog, btn.getAttribute('data-add'), 1);
          renderCart();
          openCart();
        } catch (e) {
          alert(e.message === 'OUT_OF_STOCK' ? 'Sorry, this book is out of stock.' : 'Could not add this book.');
        }
      });
    });
  }

  function renderCart() {
    $('cartCount').textContent = K.cartCount(state.cart);
    var items = $('cartItems');
    var ids = Object.keys(state.cart);
    $('cartEmpty').hidden = ids.length !== 0;
    items.innerHTML = ids.map(function (id) {
      var book = K.findBook(state.catalog, id);
      return '<div class="cart-row">' +
        '<div><div class="t">' + book.title + '</div><div>' + K.formatPrice(book.price) + ' each</div></div>' +
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
    } catch (e) {
      if (e.message === 'OUT_OF_STOCK') alert('No more copies in stock.');
    }
    renderCart();
  }

  function openCart() { $('cartDrawer').hidden = false; }
  function closeCart() { $('cartDrawer').hidden = true; }

  $('cartButton').addEventListener('click', openCart);
  $('closeCart').addEventListener('click', closeCart);
  $('cartDrawer').addEventListener('click', function (e) { if (e.target === $('cartDrawer')) closeCart(); });

  $('searchInput').addEventListener('input', function (e) { state.query = e.target.value; renderBooks(); });
  $('genreSelect').addEventListener('change', function (e) { state.genre = e.target.value; renderBooks(); });
  $('sortSelect').addEventListener('change', function (e) { state.sort = e.target.value; renderBooks(); });

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

  $('checkoutForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var form = {
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      address: fd.get('address'),
      city: fd.get('city')
    };
    document.querySelectorAll('[data-err]').forEach(function (p) { p.textContent = ''; });
    try {
      var result = K.placeOrder(state.cart, state.catalog, form, state.promo);
      state.catalog = result.catalog;
      state.cart = K.createCart();
      state.promo = null;
      $('promoInput').value = '';
      $('promoMsg').textContent = '';
      var box = $('orderSuccess');
      box.hidden = false;
      box.innerHTML = '<strong>🎉 Order placed!</strong><br>Order ID: ' + result.order.id +
        '<br>Total (Cash on Delivery): ' + K.formatPrice(result.order.totals.total) +
        '<br>Thank you, ' + esc(result.order.customer.name) + '. Your books are on the way to ' + esc(result.order.customer.city) + '.';
      e.target.reset();
      renderBooks();
      renderCart();
    } catch (err) {
      if (err.message === 'EMPTY_CART') {
        alert('Your cart is empty. Add a book first.');
      } else if (err.message === 'VALIDATION_FAILED') {
        Object.keys(err.fields).forEach(function (field) {
          var p = document.querySelector('[data-err="' + field + '"]');
          if (p) p.textContent = err.fields[field];
        });
      }
    }
  });

  renderBooks();
  renderCart();
})();
