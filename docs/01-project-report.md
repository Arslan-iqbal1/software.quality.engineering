# Project Report

## BookKart — Online Bookstore

**Subject:** Software Quality Engineering
**Student Name:** M. Arslan
**Roll No:** S24BSEEN1M01102
**University:** The Islamia University of Bahawalpur

---

## 1. Introduction

BookKart is a web-based online bookstore that lets customers browse a book catalog, search and filter books, manage a shopping cart, apply promotional discount codes, and place cash-on-delivery orders. The project was developed as a Software Quality Engineering project: the goal was not only to build working software, but to demonstrate how quality is planned, designed, verified and measured across the whole software life cycle.

The guiding principle of the project is **"quality built in, not bolted on."** Instead of writing an application first and testing it at the end, quality activities were performed at every phase: requirements were written as testable statements, the architecture separates business logic from presentation so that every rule can be tested automatically, test cases were designed with formal techniques (equivalence partitioning, boundary value analysis, decision tables), and a CI pipeline re-runs the whole test suite on every change.

## 2. Objectives

1. To design and implement a functional online bookstore covering catalog browsing, search, cart management, discounts, delivery rules and checkout.
2. To apply software quality engineering concepts in practice: quality models (ISO/IEC 25010), the V-model relationship between development and testing levels, and formal test-design techniques.
3. To build an automated safety net: unit tests for every business rule and UI integration tests for complete user flows.
4. To measure quality with real metrics: test pass rate, defect counts by severity and phase, and requirement coverage.
5. To produce the standard SQE documentation set: SRS, test plan, test cases, defect report and test summary report.

## 3. Scope

**In scope**

- Book catalog with title, author, genre, price, stock and rating
- Search (title/author), genre filter, sorting (price, rating, title)
- Cart operations with stock validation
- Promotional codes with minimum-order rules
- Delivery fee with a free-delivery threshold
- Checkout form validation and order placement with stock decrement

**Out of scope**

- Online payment processing (cash on delivery only)
- User accounts and order history persistence (single-session demo)
- Admin panel for catalog management

## 4. Development Life Cycle

An **iterative model aligned with the V-model** was followed. Each development phase had a matching verification phase:

| Development phase | Verification / validation phase |
|---|---|
| Requirements (SRS) | Acceptance criteria + system test design |
| Architecture & design | Integration test design |
| Module implementation (`core.js`) | Unit testing |
| UI wiring (`app.js`) | UI integration testing |
| Release | CI quality gate + test summary report |

## 5. Technology

| Layer | Choice | Reason |
|---|---|---|
| Language | JavaScript (ES6), HTML5, CSS3 | Runs everywhere; the same `core.js` file executes in the browser and in the Node test runner |
| Runtime / server | Node.js, zero-dependency static server | No build step, nothing to break |
| Unit testing | Node built-in test runner (`node:test`) | Zero dependencies, fast, standard assertions |
| UI testing | jsdom | Drives the real page (DOM, events, forms) without a browser download |
| CI | GitHub Actions | Quality gate on every push and pull request |
| Version control | Git + GitHub | Full history of meaningful commits |

No production dependencies are used at all, which removes an entire class of supply-chain and compatibility defects.

## 6. Quality Model (ISO/IEC 25010 mapping)

| Quality characteristic | How BookKart addresses it |
|---|---|
| Functional suitability | Every functional requirement (FR-01…FR-12 in the SRS) is covered by at least one automated test |
| Reliability | Business rules are pure functions — same input, same output, no hidden state; stock can never go negative |
| Usability | Mobile-first responsive layout, live search, inline validation errors next to each field |
| Performance efficiency | Zero-dependency page; filtering and sorting happen instantly in memory |
| Security | Checkout input is validated on every field; user input shown back on the page is HTML-escaped (a defect found by inspection and fixed — see Defect Report DEF-002) |
| Maintainability | Strict separation: `core.js` (rules) vs `app.js` (wiring) vs `styles.css` (presentation) |
| Compatibility | Runs in any modern browser; core logic also runs in Node ≥ 18 |
| Portability | `npm start` on any OS; no database or external service required |

## 7. Results (summary)

- **95 automated tests executed: 95 passed, 0 failed** (59 unit + 25 UI integration + 5 database + 6 API tests, covering the v2 advanced front end, the v3 payment methods and sale pricing, and v4 SQLite persistence: transactional order storage, rollback, and persistence across server restarts)
- **3 defects found** during development (1 by inspection, 1 during integration testing, 1 in the test tooling itself) — **all fixed and retested**, 0 open
- **100% of functional requirements** covered by automated tests
- Full detail: [Test Summary Report](06-test-summary-report.md) and [Defect Report](05-defect-report.md)

## 8. Conclusion

BookKart demonstrates that software quality is an engineering discipline, not a final inspection step. Testable requirements, a testable architecture, formal test-design techniques and continuous automated verification together produced a small system whose behaviour — including its edge cases at every price, stock and validation boundary — is proven by evidence rather than assumed.

## 9. Future Enhancements

- Persistent storage (database) with user accounts and order history
- Payment gateway integration with its own test strategy (sandbox + mocking)
- End-to-end tests in a real browser (Playwright) and visual regression testing
- Performance/load testing of the catalog under concurrent users
- Accessibility audit against WCAG 2.2
