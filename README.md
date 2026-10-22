# BookKart — Online Bookstore

A complete **Software Quality Engineering (SQE)** project: a working online bookstore built with quality engineered in from the first line of code — a fully tested business-logic core, an automated test suite (unit + UI integration), a CI quality gate, and the complete SQE document set (SRS, test plan, test cases, defect report, test summary report).

## Features

- 📚 Browse a 12-book catalog (fiction, science, technology, self-help, history, poetry, finance)
- 🔍 Live search by title or author, genre filter, and 4 sort orders
- 🛒 Cart with stock-safe quantities (you can never order more than the stock)
- 🏷️ Promo codes with real business rules — `STUDENT10` (10% off), `BOOKWORM20` (20% off ≥ Rs 2,000), `FLAT150` (Rs 150 off ≥ Rs 1,500)
- 🚚 Delivery fee logic — Rs 150, **free** on orders of Rs 1,000+ after discount
- ✅ Checkout with full field validation (name, email, Pakistani mobile format, address, city) and cash-on-delivery order placement that decrements stock

## Quick start

```bash
npm start          # serves the app at http://localhost:3000
npm test           # runs the full automated suite (60 tests)
```

No dependencies are needed to run the app (zero-dependency static server). The only dev dependency is `jsdom`, used by the UI integration tests.

## Project structure

| Path | What it is |
|---|---|
| `index.html` | App page (semantic, accessible, mobile-friendly) |
| `src/core.js` | **All business logic as pure functions** — catalog, search, cart, discounts, delivery, validation, orders. Runs identically in browser and Node. |
| `src/app.js` | UI wiring only — reads input, calls `core.js`, renders |
| `src/styles.css` | Styling (Inter font, 15px radius design system) |
| `server.js` | Zero-dependency static file server |
| `tests/core.test.js` | 50 unit tests — equivalence partitioning, boundary value analysis, decision tables |
| `tests/ui.test.js` | 10 UI integration tests (jsdom) driving the real page |
| `docs/` | The complete SQE document set (below) |
| `.github/workflows/ci.yml` | CI quality gate — the suite runs on every push |

## SQE documents

1. [Project Report](docs/01-project-report.md) — introduction, objectives, SDLC, quality model, results
2. [Software Requirements Specification](docs/02-srs.md) — functional & non-functional requirements
3. [Test Plan](docs/03-test-plan.md) — strategy, levels, entry/exit criteria, schedule, risks
4. [Test Cases](docs/04-test-cases.md) — designed test cases with execution results
5. [Defect Report](docs/05-defect-report.md) — defects found, root causes, fixes, retests
6. [Test Summary Report](docs/06-test-summary-report.md) — metrics, coverage, exit-criteria verdict

## Quality approach in one line

Every rule that can break (stock limits, discount thresholds, delivery boundaries, validation) lives in pure functions in `core.js` and is proven by an automated test — including the boundary values on both sides of every threshold. Testing found **3 real defects** during development (see the defect report); all are fixed and retested. Current status: **60/60 tests passing**.
