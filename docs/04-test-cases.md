# Test Cases

## BookKart — Online Bookstore

**Executed:** 22 October 2026 · **Environment:** Node.js v24.20.0, jsdom · **Result: all cases PASS**
Cases are automated in `tests/core.test.js`, `tests/ui.test.js` and `tests/ui-advanced.test.js` (104 automated checks in total), plus server smoke checks in TC-50.

### A. Catalog, Search, Filter, Sort (FR-01…FR-04)

| ID | Test case | Input / steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-01 | Catalog integrity | Load catalog | 12 books, unique ids, price > 0, 0 ≤ rating ≤ 5 | As expected | ✅ Pass |
| TC-02 | Search by title | Query "atomic" | 1 result: Atomic Habits | As expected | ✅ Pass |
| TC-03 | Search by author | Query "Hawking" | 1 result: A Brief History of Time | As expected | ✅ Pass |
| TC-04 | Search is case-insensitive | Query "ATOMIC" / "hawking" | Same results as TC-02/TC-03 | As expected | ✅ Pass |
| TC-05 | Empty search | Query "" and "   " | Full catalog (12) | As expected | ✅ Pass |
| TC-06 | Search with no match | Query "zzzz-not-a-book" | Empty list; UI shows empty-state message | As expected | ✅ Pass |
| TC-07 | Genre filter | Genre = Fiction | 2 books, all Fiction | As expected | ✅ Pass |
| TC-08 | Genre filter "All" | Genre = All | Full catalog (12) | As expected | ✅ Pass |
| TC-09 | Sort price ascending | Sort = price-asc | First Rs 950, last Rs 5,500 | As expected | ✅ Pass |
| TC-10 | Sort price descending / rating | Sort = price-desc, then rating-desc | First Rs 5,500; top rating 4.9 first | As expected | ✅ Pass |
| TC-11 | Sorting is non-destructive | Sort, then read catalog order | Original order unchanged | As expected | ✅ Pass |

### B. Cart and Stock Rules (FR-05…FR-09)

| ID | Test case | Input / steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-12 | Add item, default qty | Add B01 (no qty) | Cart = {B01: 1} | As expected | ✅ Pass |
| TC-13 | Add accumulates | Add B02 ×2, then ×3 | Cart B02 = 5 | As expected | ✅ Pass |
| TC-14 | Boundary: qty = stock | Add B08 ×4 (stock 4) | Accepted | As expected | ✅ Pass |
| TC-15 | Boundary: qty = stock + 1 | Add B08 ×5 | OUT_OF_STOCK error | As expected | ✅ Pass |
| TC-16 | Cumulative over-stock | Add B08 ×3, then ×2 | OUT_OF_STOCK error | As expected | ✅ Pass |
| TC-17 | Invalid quantities | qty 0, −2, 2.5 | INVALID_QUANTITY error each | As expected | ✅ Pass |
| TC-18 | Unknown book | Add "B99" | BOOK_NOT_FOUND error | As expected | ✅ Pass |
| TC-19 | Set quantity / remove via 0 | Set B01 = 3, then = 0 | Quantity 3, then item removed | As expected | ✅ Pass |
| TC-20 | Remove item | Cart {B01, B02}, remove B01 | Cart = {B02: 1} | As expected | ✅ Pass |
| TC-21 | Count and subtotal | Cart {B01×2, B09×1} | Count 3; subtotal Rs 3,850 | As expected | ✅ Pass |
| TC-22 | Cart immutability | Add to cart A, inspect A | Original cart unchanged | As expected | ✅ Pass |

### C. Promo Codes and Delivery (FR-10, FR-11) — decision table

| ID | Conditions | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-23 | No code | Subtotal Rs 5,000, code = none | Discount Rs 0 | As expected | ✅ Pass |
| TC-24 | STUDENT10 | Subtotal Rs 1,000 | Discount Rs 100 | As expected | ✅ Pass |
| TC-25 | BOOKWORM20 at boundary | Subtotal Rs 2,000 | Discount Rs 400 | As expected | ✅ Pass |
| TC-26 | BOOKWORM20 below boundary | Subtotal Rs 1,999 | MINIMUM_NOT_MET | As expected | ✅ Pass |
| TC-27 | FLAT150 boundaries | Subtotal Rs 1,500 / Rs 1,499 | Rs 150 off / MINIMUM_NOT_MET | As expected | ✅ Pass |
| TC-28 | Unknown code | Code "FREESTUFF" | INVALID_CODE | As expected | ✅ Pass |
| TC-29 | Delivery boundaries | Net Rs 999 / Rs 1,000 / empty cart | Rs 150 / Rs 0 / Rs 0 | As expected | ✅ Pass |
| TC-30 | Total integration | {B09×1} no code; {B05×1} + STUDENT10 | Total Rs 1,100; discount pulls net to Rs 990 so fee applies → Rs 1,140 | As expected | ✅ Pass |

### D. Checkout Validation and Orders (FR-12, BR-03)

| ID | Test case | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-31 | Valid form | All fields valid | valid = true, no errors | As expected | ✅ Pass |
| TC-32 | Phone formats | "0300-1234567", "0300 1234567" | Accepted (separators ignored) | As expected | ✅ Pass |
| TC-33 | Invalid emails | "plainaddress", "a@b", "a@.com", "a b@c.com", "" | Each rejected with email error | As expected | ✅ Pass |
| TC-34 | Invalid phones | Wrong prefix, 10 digits, 12 digits, letters, "" | Each rejected with phone error | As expected | ✅ Pass |
| TC-35 | Short fields | Name "Al", address "House 1", city "" | Each rejected with its own error | As expected | ✅ Pass |
| TC-36 | All fields invalid | Fully invalid form | All 5 field errors reported together | As expected | ✅ Pass |
| TC-37 | Place order | Cart {B02×2}, valid form | Total Rs 3,600; order id BK-…; B02 stock 20 → 18 | As expected | ✅ Pass |
| TC-38 | Empty cart order | Cart {} | EMPTY_CART error | As expected | ✅ Pass |
| TC-39 | Invalid form order | Valid cart, bad email | VALIDATION_FAILED with field errors; no order | As expected | ✅ Pass |
| TC-40 | Catalog immutability | Place order, re-read catalog | Original stock unchanged | As expected | ✅ Pass |

### E. UI Integration and Security (jsdom, real page)

| ID | Test case | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-41 | Page load renders catalog | Open index.html | 12 cards; "Showing 12 of 12" | As expected | ✅ Pass |
| TC-42 | Live search in UI | Type "atomic" in search box | Grid narrows to 1 card; clearing restores 12 | As expected | ✅ Pass |
| TC-43 | Genre filter in UI | Select "Technology" | 2 cards shown | As expected | ✅ Pass |
| TC-44 | Add to cart in UI | Click "Add to Cart" (B09) | Badge = 1; subtotal Rs 950; delivery Rs 150; total Rs 1,100 | As expected | ✅ Pass |
| TC-45 | Promo in UI (valid) | Enter STUDENT10, Apply | "Promo applied" message; discount − Rs 95 | As expected | ✅ Pass |
| TC-46 | Promo in UI (invalid) | Enter FREESTUFF, Apply | "Invalid promo code"; discount Rs 0 | As expected | ✅ Pass |
| TC-47 | Checkout errors in UI | Submit invalid form | Error text under name/email/phone fields; no order placed | As expected | ✅ Pass |
| TC-48 | Checkout success in UI | Submit valid form | Success box with order id; cart badge resets to 0 | As expected | ✅ Pass |
| TC-49 | XSS guard (NFR-04) | Name = `<img src=x onerror=…>`, checkout | Name displayed as text; no injected element in page | As expected (after DEF-002 fix) | ✅ Pass |
| TC-50 | Server smoke | GET /, /src/core.js, /src/app.js, /src/styles.css, /missing | 200, 200, 200, 200, 404 | As expected | ✅ Pass |

### F. Advanced Front End — v2 (jsdom, fresh page)

| ID | Test case | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-51 | Wishlist toggle | Click wishlist on B02 and B05 | Header wishlist count = 2 | As expected | ✅ Pass |
| TC-52 | Wishlist-only filter | Enable "Wishlist only" | Grid shows exactly the 2 wishlisted books; disabling restores 12 | As expected | ✅ Pass |
| TC-53 | Price filter | Set max price to Rs 1,000 | Only books ≤ Rs 1,000 shown (1); label updates; restoring shows 12 | As expected | ✅ Pass |
| TC-54 | Minimum-rating filter | Set minimum rating 4.7 | 5 books shown (ratings 4.7–4.9) | As expected | ✅ Pass |
| TC-55 | Reset filters | Apply a filter, click Reset | Full catalog (12) restored, controls back to defaults | As expected | ✅ Pass |
| TC-56 | Quick-view modal | Click a book cover | Modal opens with title, description, price; Close hides it | As expected | ✅ Pass |
| TC-57 | Add from modal + persistence | In modal set qty 2, Add to Cart | Cart badge = 2; cart saved in localStorage | As expected | ✅ Pass |
| TC-58 | Dark mode | Click theme toggle twice | Theme switches dark → light; choice persisted | As expected | ✅ Pass |
| TC-59 | List view toggle | Click list view, then grid view | Grid gains/loses the list-view layout class | As expected | ✅ Pass |

### G. Sale Pricing and Payment Methods — v3

| ID | Test case | Input / steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-60 | MRP & Save % | Read catalog | Every book: MRP > price, Save % between 20–50 (B01 = 40%) | As expected | ✅ Pass |
| TC-61 | COD / Bank need no details | validatePayment COD, BANK, null | All valid; unknown method rejected | As expected | ✅ Pass |
| TC-62 | Valid card | 4242… card, future expiry, CVV 123 | Valid | As expected | ✅ Pass |
| TC-63 | Luhn failure | Card …4241 | cardNumber error | As expected | ✅ Pass |
| TC-64 | Expiry rules | Expired 01/20; current month | Expired rejected; current month accepted | As expected | ✅ Pass |
| TC-65 | CVV / format rules | CVV "12", expiry "13/30", short card name | Each rejected with its own error | As expected | ✅ Pass |
| TC-66 | Wallet validation | Easypaisa/JazzCash numbers, valid + invalid | Valid accepted; "12345" rejected | As expected | ✅ Pass |
| TC-67 | Order records masked payment | Place card order | payment = CARD, detail "Card ending in 4242"; full number nowhere in the order | As expected | ✅ Pass |
| TC-68 | Default payment UI | Load page, open cart | COD selected; all panels hidden; totals show "Cash on Delivery" | As expected | ✅ Pass |
| TC-69 | Card panel UI | Select Card | Card panel shows; button becomes "Pay & Place Order"; totals show "Debit / Credit Card" | As expected | ✅ Pass |
| TC-70 | Invalid card blocks order (UI) | Submit with Luhn-failing card | cardNumber error shown; no order placed | As expected | ✅ Pass |
| TC-71 | Valid card order (UI) | Submit with valid card | Success shows method + "4242", never the full number | As expected | ✅ Pass |
| TC-72 | Wallet panel UI | Select Easypaisa, then JazzCash | Wallet panel shows; label switches Easypaisa → JazzCash | As expected | ✅ Pass |
| TC-73 | Bank panel UI | Select Bank Transfer | Panel shows Meezan Bank details + order-ID reference note | As expected | ✅ Pass |

### H. SQLite Database and HTTP API — v4

| ID | Test case | Input / steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-74 | Database seeding | Open a fresh database file | books table seeded with the 12-book catalog (price, MRP, stock, description) | As expected | ✅ Pass |
| TC-75 | Transactional order save | Place an order, save it | Customer, order, items stored; stock decremented by the ordered qty | As expected | ✅ Pass |
| TC-76 | Returning customer | Second order with the same email | Customer row updated, not duplicated; promo code recorded | As expected | ✅ Pass |
| TC-77 | Rollback on failure | Save an order containing a non-existent book | Error raised; no partial order; stock unchanged | As expected | ✅ Pass |
| TC-78 | Persistence across reopen | Close and reopen the database file | Orders and stock intact; catalog not reseeded | As expected | ✅ Pass |
| TC-79 | GET /api/books | HTTP GET | 200 with the 12-book catalog | As expected | ✅ Pass |
| TC-80 | POST /api/orders (COD) | Order 1 × B09, valid form | 201, order BK-…, total Rs 1,100; stock −1 in the response | As expected | ✅ Pass |
| TC-81 | GET /api/orders + /:id | After TC-80 | List shows the order; detail returns its line items; unknown ID → 404 | As expected | ✅ Pass |
| TC-82 | API validation errors | Invalid email; empty cart; Luhn-failing card | 400 VALIDATION_FAILED with field errors; 400 EMPTY_CART | As expected | ✅ Pass |
| TC-83 | Static + API coexistence | GET / and /api/nope | Homepage serves; unknown API route → 404 JSON | As expected | ✅ Pass |
| TC-84 | Data directory guard | GET /data/bookkart.db | 403 Forbidden — the database file is never served | As expected | ✅ Pass |

### I. Owner Notifications, Order Status and Tracking — v5

| ID | Test case | Input / steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-85 | No channels configured | notifyOrder with empty env | Resolves to an empty result; no error | As expected | ✅ Pass |
| TC-86 | Channel resolution | Env with ntfy topic, Telegram pair, webhook | 3 channels resolved; Telegram ignored unless both token and chat id are set | As expected | ✅ Pass |
| TC-87 | Message content | Build the notification for a sample order | Contains order ID, total, customer name/city, item lines | As expected | ✅ Pass |
| TC-88 | Delivery to all channels | Injected sender, ntfy + webhook configured | Both posted; ntfy gets text, webhook gets order.created JSON | As expected | ✅ Pass |
| TC-89 | Failure isolation | Sender throws | Result marks the channel failed; the call never rejects | As expected | ✅ Pass |
| TC-90 | Status lifecycle | New order → Confirmed → Delivered; invalid status; unknown order | Defaults to Placed; valid updates stored; invalid rejected; unknown → null | As expected | ✅ Pass |
| TC-91 | Tracking privacy | GET /api/track/:id with right phone, wrong phone, unknown id | Right phone → status + summary; wrong phone and unknown id → 404 | As expected | ✅ Pass |
| TC-92 | Status API + admin gate | PATCH status; repeat with BOOKKART_ADMIN_KEY set, with/without the header | Update succeeds and tracking reflects it; gated calls without the key → 401, with it → 200 | As expected | ✅ Pass |
