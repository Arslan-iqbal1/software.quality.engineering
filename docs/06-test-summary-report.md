# Test Summary Report

## BookKart — Online Bookstore

**Test cycle:** Single full cycle, executed 22 October 2026
**Environment:** Node.js v24.20.0 · jsdom · Ubuntu Linux · CI: GitHub Actions (Node 20)

### 1. Execution Summary

| Suite | File | Tests | Passed | Failed |
|---|---|---|---|---|
| Unit tests (business logic) | `tests/core.test.js` | 59 | 59 | 0 |
| UI integration tests (real page in jsdom) | `tests/ui.test.js` | 10 | 10 | 0 |
| Advanced front-end tests (v2 features) | `tests/ui-advanced.test.js` | 9 | 9 | 0 |
| Payment UI tests (v3 features) | `tests/ui-payment.test.js` | 6 | 6 | 0 |
| Database tests (v4/v5, SQLite layer + status) | `tests/db.test.js` | 6 | 6 | 0 |
| API tests (v4/v5, HTTP endpoints + tracking) | `tests/api.test.js` | 9 | 9 | 0 |
| Notification tests (v5, owner alerts) | `tests/notify.test.js` | 5 | 5 | 0 |
| **Total** | | **104** | **104 (100%)** | **0** |

Server smoke checks (HTTP 200 for the page and all assets, 404 for unknown paths): 5/5 passed.
Documented test cases TC-01…TC-92: **92/92 passed.** (v2 front-end upgrade re-verified 22 Oct 2026: 69/69. v3 payments + sale pricing re-verified 23 Oct 2026: 84/84. v4 SQLite database + API re-verified 23 Oct 2026: 95/95. v5 notifications, order status and tracking re-verified 23 Oct 2026: full regression 104/104, no new defects introduced.)

### 2. Coverage

| Measure | Result |
|---|---|
| Functional requirements covered (FR-01…FR-21, incl. v2 front end, v3 payments, v4 database, v5 notifications/tracking) | 21 / 21 = **100%** |
| Core logic functions exercised (`core.js` public API) | 17 / 17 = **100%** |
| Boundary values tested | Stock (4/5), qty (0, −, fractional), subtotal Rs 1,499/1,500 and Rs 1,999/2,000, delivery Rs 999/1,000, name length 2/3, address length 9/10 |
| Non-functional checks | NFR-03 reliability invariants (stock never negative, no empty orders) ✅ · NFR-04 escaping (TC-49) ✅ · NFR-02 responsive layout (CSS media queries, inspected) ✅ |

### 3. Defect Summary

| Metric | Value |
|---|---|
| Defects found | 3 (1 Major-security, 1 Major-functional, 1 Minor-tooling) |
| Defects fixed and retested | 3 |
| Open defects | **0** |
| Defect detection phases | Inspection 1 · Integration testing 1 · Test execution 1 |
| Regression after fixes | Full suite re-run: 104/104 pass |

Detail: [Defect Report](05-defect-report.md).

### 4. Exit Criteria Assessment (from the Test Plan)

| Criterion | Verdict |
|---|---|
| 100% of designed test cases executed | ✅ Met (104 automated + 5 smoke checks) |
| ≥ 95% overall pass rate | ✅ Met (100%) |
| 100% pass on High-priority requirements | ✅ Met (FR-05…FR-07, FR-09…FR-12 all passing) |
| No open Critical or Major defects | ✅ Met (0 open) |

### 5. Risks and Recommendations

- The catalog is in-memory and single-session; persistence, accounts and payments are out of scope for this release and would each need their own test cycles (payment testing with gateway sandbox/mocks is the largest future effort).
- UI tests run in jsdom, not a real browser engine; adding a small Playwright end-to-end suite is the recommended next step for rendering-level confidence.
- Load/performance testing was excluded by plan (small in-memory catalog); revisit if the catalog grows.

### 6. Conclusion

All exit criteria are met. BookKart is verified against every functional requirement, including both sides of every price, stock and validation boundary, with zero open defects. **The product is recommended for release/submission.**
