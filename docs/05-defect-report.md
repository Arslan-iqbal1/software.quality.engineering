# Defect Report

## BookKart — Online Bookstore

**Reporting period:** Development & testing, October 2026 · **Total defects found: 3 · Fixed: 3 · Open: 0**

| ID | Title | Severity | Found by | Status |
|---|---|---|---|---|
| DEF-001 | Test suite fails to start: `node --test tests/` treats the directory as an entry module | Minor | Test execution | ✅ Fixed & retested |
| DEF-002 | XSS: customer name inserted into the order-success message without escaping | Major | Code inspection | ✅ Fixed & retested |
| DEF-003 | Fragile checkout: form fields read via named properties (`form.name`), which breaks in spec-strict DOM implementations | Major | Integration testing (jsdom) | ✅ Fixed & retested |

---

### DEF-001 — Test script does not start the suite

- **Severity / Priority:** Minor / Medium (product code unaffected; the quality gate itself was broken)
- **Found in:** `package.json` test script — `node --test tests/`
- **Symptoms:** `npm test` crashed with `Error: Cannot find module '.../tests'` before running a single test, in this Node.js environment.
- **Root cause:** The directory argument form of the test-runner command is environment-sensitive; the path was resolved as a module entry instead of a test directory.
- **Fix:** Changed the script to an explicit file glob: `node --test tests/*.test.js`.
- **Retest:** `npm test` → 60 tests executed, 60 passed. CI (GitHub Actions) uses the same script, so the gate is verified on a clean machine on every push.

### DEF-002 — Cross-site scripting via the customer name field

- **Severity / Priority:** Major / High (violates NFR-04)
- **Found by:** Code inspection of `src/app.js` (static verification activity in the test plan)
- **Description:** The order-success message was built with `innerHTML` and included the customer's typed name and city without escaping. A name such as `<img src=x onerror=alert(1)>` would be inserted into the page as live HTML instead of text.
- **Root cause:** Unescaped user input rendered through `innerHTML`.
- **Fix:** Added an `esc()` HTML-escaping helper in `src/app.js`; customer name and city are escaped before insertion.
- **Retest:** New automated case TC-49 submits the malicious name through the real checkout flow and asserts the success box contains the text but **no** injected element. Passing.

### DEF-003 — Checkout form read via fragile named-property access

- **Severity / Priority:** Major / High (checkout — FR-12 — could fail outright)
- **Found by:** UI integration testing (`tests/ui.test.js`, jsdom)
- **Description:** The submit handler read fields as `e.target.name`, `e.target.email`, … — relying on the legacy "named form control" behaviour. In the jsdom DOM implementation `form.name` does not resolve to the input control (it collides with the form element's own `name` property), so checkout threw `TypeError: Cannot set/read properties of undefined` and no order could be placed in that environment.
- **Root cause:** Dependence on non-portable, collision-prone DOM behaviour instead of the standard API.
- **Fix:** The handler now reads values through `new FormData(e.target)`, the standard, implementation-independent API.
- **Retest:** All checkout integration cases (TC-47, TC-48, TC-49) pass; full suite 60/60.

---

### Defect metrics

| Metric | Value |
|---|---|
| Defects found before release | 3 |
| Defects fixed & retested | 3 (100%) |
| Open defects at release | 0 (no Critical/Major open — exit criterion met) |
| Found by inspection | 1 (33%) |
| Found by integration testing | 1 (33%) |
| Found in test tooling/execution | 1 (33%) |
| Defect removal efficiency | 100% (all defects found were found before delivery) |
