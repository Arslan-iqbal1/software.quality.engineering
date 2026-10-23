# BookKart — Online Bookstore

A complete **Software Quality Engineering (SQE)** project: a working online bookstore built with quality engineered in from the first line of code — a fully tested business-logic core, an automated test suite (unit + UI integration), a CI quality gate, and the complete SQE document set (SRS, test plan, test cases, defect report, test summary report).

## Features

**New in v2 — advanced front end:** filters sidebar (price range, minimum rating, in-stock, wishlist-only), wishlist with persistence, quick-view book modal with descriptions, dark mode, grid/list view toggle, toast notifications, and a cart that survives page reloads.

- 📚 Browse a 12-book catalog (fiction, science, technology, self-help, history, poetry, finance)
- 🔍 Live search by title or author, genre filter, and 4 sort orders
- 🛒 Cart with stock-safe quantities (you can never order more than the stock)
- 🏷️ Promo codes with real business rules — `STUDENT10` (10% off), `BOOKWORM20` (20% off ≥ Rs 2,000), `FLAT150` (Rs 150 off ≥ Rs 1,500)
- 🚚 Delivery fee logic — Rs 150, **free** on orders of Rs 1,000+ after discount
- ✅ Checkout with full field validation (name, email, Pakistani mobile format, address, city) and order placement that decrements stock
- 💳 **Payment methods** — Cash on Delivery, Debit/Credit Card (Luhn + expiry + CVV validated, number stored masked only), Bank Transfer, Easypaisa and JazzCash
- 🔖 Sale pricing like the big stores: every book shows a struck-through MRP and a **Save %** badge
- 🗄️ **SQLite database** — run `npm start` and orders, customers and stock persist in `data/bookkart.db` via the JSON API; on GitHub Pages (static) the store automatically runs on in-browser demo data instead
- 🛎️ **Owner notifications** — every new order instantly pings the owner via ntfy.sh phone push, Telegram, or any webhook (set `BOOKKART_NTFY_TOPIC`, `BOOKKART_TELEGRAM_TOKEN` + `BOOKKART_TELEGRAM_CHAT_ID`, or `BOOKKART_WEBHOOK_URL`)
- 📦 **Order tracking + admin** — customers track with order ID + phone (header **Track** button); the owner manages orders at `/admin.html`, moving them Placed → Confirmed → Dispatched → Delivered (protect it by setting `BOOKKART_ADMIN_KEY`)

## Quick start

```bash
npm start          # serves the app at http://localhost:3000
npm test           # runs the full automated suite (106 tests)
```

No dependencies are needed to run the app (zero-dependency static server). The only dev dependency is `jsdom`, used by the UI integration tests.

## Project structure

| Path | What it is |
|---|---|
| `index.html` | App page (semantic, accessible, mobile-friendly) |
| `src/core.js` | **All business logic as pure functions** — catalog, search, cart, discounts, delivery, validation, orders. Runs identically in browser and Node. |
| `src/app.js` | UI wiring only — reads input, calls `core.js`, renders |
| `src/db.js` | **SQLite persistence** (Node's built-in `node:sqlite`) — books, customers, orders, order_items; transactional order saving |
| `server.js` | Static server + JSON API (`/api/books`, `/api/orders`, `/api/track/:id`) backed by SQLite; the UI uses it automatically when reachable and falls back to in-browser demo data on static hosting |
| `src/notify.js` | Owner notifications on each new order — ntfy.sh, Telegram, or a generic webhook |
| `admin.html` | Owner's orders dashboard — live order list + status management |
| `DEPLOY.md` | **Going-live guide** — Route A: VPS + systemd + nginx/HTTPS; Route B: Render blueprint (`render.yaml`); `.env.example` documents every setting |
| `src/styles.css` | Styling (Inter font, 15px radius design system) |
| `server.js` | Zero-dependency static file server |
| `tests/core.test.js` | 50 unit tests — equivalence partitioning, boundary value analysis, decision tables |
| `tests/ui.test.js` | 10 UI integration tests (jsdom) driving the real page |
| `tests/ui-advanced.test.js` | 9 tests for the v2 front end — wishlist, filters, modal, dark mode, persistence |
| `tests/ui-payment.test.js` | 6 tests for payment method selection, panels and masked card checkout |
| `tests/db.test.js` | 6 tests for the SQLite layer — seeding, transactional saves, rollback, persistence, order status lifecycle |
| `tests/api.test.js` | 9 tests for the HTTP API — catalog, orders, validation, tracking, status updates, admin-key gating |
| `tests/notify.test.js` | 5 tests for owner notifications — channel resolution, message format, failure isolation |
| `tests/deploy.test.js` | 2 tests for deployment readiness — .env loader behaviour, deploy artifacts complete |
| `docs/` | The complete SQE document set (below) |
| `.github/workflows/ci.yml` | CI quality gate — the suite runs on every push |

## SQE documents

1. [Project Report](docs/01-project-report.md) — introduction, objectives, SDLC, quality model, results
2. [Software Requirements Specification](docs/02-srs.md) — functional & non-functional requirements
3. [Test Plan](docs/03-test-plan.md) — strategy, levels, entry/exit criteria, schedule, risks
4. [Test Cases](docs/04-test-cases.md) — designed test cases with execution results
5. [Defect Report](docs/05-defect-report.md) — defects found, root causes, fixes, retests
6. [Test Summary Report](docs/06-test-summary-report.md) — metrics, coverage, exit-criteria verdict
7. [Project Planner](docs/07-project-planner.md) — WBS, schedule, Gantt chart, milestones, resources, risks

## Quality approach in one line

Every rule that can break (stock limits, discount thresholds, delivery boundaries, validation) lives in pure functions in `core.js` and is proven by an automated test — including the boundary values on both sides of every threshold. Testing found **3 real defects** during development (see the defect report); all are fixed and retested. Current status: **106/106 tests passing**.
