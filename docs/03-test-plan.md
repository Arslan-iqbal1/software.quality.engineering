# Test Plan

## BookKart — Online Bookstore — Version 1.0 (aligned with IEEE 829)

### 1. Test Plan Identifier
TP-BOOKKART-1.0

### 2. Introduction
This plan describes the strategy, scope, resources and schedule for testing BookKart. The system under test is a web-based bookstore (`index.html`, `src/core.js`, `src/app.js`) whose business rules are implemented as pure functions and verified by an automated suite (Node test runner + jsdom) executed locally and in CI (GitHub Actions).

### 3. Test Items
- `src/core.js` — catalog, search, filter, sort, cart, discount, delivery, validation, order logic (unit + integration level)
- `src/app.js` + `index.html` — complete user flows in a simulated DOM (integration/system level)
- `server.js` — static delivery of the app (smoke level: HTTP status checks)

### 4. Features to Be Tested
All functional requirements FR-01…FR-12 (SRS), with emphasis on the high-risk rules: stock limits (FR-06/07), promo decision table (FR-10), delivery threshold (FR-11), checkout validation and order placement (FR-12), plus NFR-03 (stock never negative, no empty orders) and NFR-04 (output escaping).

### 5. Features Not to Be Tested
- Payment processing (out of scope — cash on delivery only)
- Performance/load testing (catalog is small and in-memory; noted as future work)
- Cross-browser rendering differences beyond standards-compliant layout

### 6. Testing Approach

| Level | Technique / tool | What it proves |
|---|---|---|
| Unit testing | `node:test`, assertions on pure functions | Each rule in `core.js` behaves per SRS, at its boundaries |
| Integration testing | jsdom driving the real page (events, forms) | UI wiring + core work together; user flows complete end to end |
| System testing | Full flows: browse → cart → promo → checkout → order | The assembled system meets FR-01…FR-12 |
| Smoke testing | HTTP checks against `server.js` | App and assets are served (200), unknown paths return 404 |
| Static verification | Code inspection | Output escaping, no hidden state mutation (immutability checks in tests) |
| Regression testing | Full suite on every change + CI on every push | Fixes and changes break nothing previously proven |

**Test design techniques:** equivalence partitioning (valid/invalid input classes for search, email, phone), boundary value analysis (stock 4/5, subtotal Rs 1,499/1,500, Rs 1,999/2,000, delivery Rs 999/1,000, name length 2/3, address length 9/10), decision tables (promo codes × subtotal ranges), error guessing (fractional quantities, cumulative over-stock, unknown book ids, HTML in the name field).

### 7. Entry and Exit Criteria

**Entry:** SRS approved; code compiles/runs; test environment (Node ≥ 18) available.

**Exit (all must hold):**
1. 100% of designed test cases executed
2. ≥ 95% pass rate, and 100% pass on High-priority requirements
3. No open Critical or Major defects
4. All functional requirements covered by at least one passing test

### 8. Deliverables
Test plan (this document), test cases, automated test suite (`tests/`), defect report, test summary report, CI run history on GitHub.

### 9. Test Environment
Node.js v24 (LTS-class), jsdom, any OS; browser: any modern browser for manual spot checks; CI: GitHub Actions `ubuntu-latest` with Node 20.

### 10. Schedule (indicative, 2-week project)

| Phase | Work |
|---|---|
| Days 1–2 | Requirements (SRS) + test plan + test case design |
| Days 3–6 | Implementation of `core.js` with unit tests written alongside |
| Days 7–8 | UI implementation + integration tests |
| Days 9–10 | System testing, defect fixing and retesting |
| Days 11–12 | Regression run, CI setup, test summary report |

### 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Boundary rules (discounts, delivery) misunderstood | Wrong totals in production | Decision tables in SRS; boundary tests on both sides of every threshold |
| UI wiring defects escape unit testing | Broken user flows | jsdom integration tests drive the real page and form |
| Test tooling differences between machines | Suite fails to start | Zero-dependency runner; explicit test file glob (see DEF-001); CI verifies on a clean machine |
| Scope creep (payments, accounts) | Missed deadline | Explicit out-of-scope list in SRS and this plan |

### 12. Approvals
Prepared by: ______________________  Date: ____________
