# Software Requirements Specification (SRS)

## BookKart — Online Bookstore — Version 1.0

### 1. Introduction

**1.1 Purpose.** This document specifies the functional and non-functional requirements of BookKart, an online bookstore web application. It is the basis for design, implementation and testing; every requirement is written to be **testable** (a tester can objectively decide pass or fail).

**1.2 Scope.** BookKart lets a customer browse a fixed catalog of books, search/filter/sort them, build a cart within stock limits, apply promotional codes, see delivery charges, and place a cash-on-delivery order after validated checkout.

**1.3 Definitions.** *Cart* — the customer's current selection. *Subtotal* — sum of price × quantity before discount and delivery. *Promo code* — a code granting a discount under stated rules.

### 2. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system shall display the full book catalog with title, author, genre, price, stock status and rating for each book. | High |
| FR-02 | The system shall search books by title or author, case-insensitively; an empty search shall return the full catalog; a search with no match shall return an empty result and show an empty-state message. | High |
| FR-03 | The system shall filter books by genre; the value "All" shall return the full catalog. | Medium |
| FR-04 | The system shall sort the catalog by price (low→high, high→low), rating (highest first) and title (A→Z), without modifying the stored catalog order. | Medium |
| FR-05 | The system shall allow adding a book to the cart with a positive whole-number quantity, defaulting to 1. | High |
| FR-06 | The system shall reject any add/set operation that would make the cart quantity for a book exceed its available stock (error: OUT_OF_STOCK). Quantity exactly equal to stock shall be accepted. | High |
| FR-07 | The system shall reject zero, negative and fractional quantities (error: INVALID_QUANTITY) and unknown book ids (error: BOOK_NOT_FOUND). | High |
| FR-08 | The system shall allow changing a cart quantity; setting it to 0 shall remove the item. Items shall also be removable directly. | Medium |
| FR-09 | The system shall compute the cart subtotal as Σ(price × quantity) and display the item count. | High |
| FR-10 | The system shall apply promo codes per BR-01 (below), case-insensitively, and shall report INVALID_CODE for unknown codes and MINIMUM_NOT_MET when the subtotal is below a code's minimum. | High |
| FR-11 | The system shall charge delivery per BR-02 and display subtotal, discount, delivery fee and grand total before checkout. | High |
| FR-12 | The system shall validate all checkout fields per BR-03, report every invalid field together, and place the order only when the cart is non-empty and the form is valid; a successful order shall decrement stock by the ordered quantities and return an order id. | High |

### 3. Business Rules

**BR-01 — Promo codes (decision table)**

| Code | Type | Value | Minimum subtotal |
|---|---|---|---|
| STUDENT10 | Percentage | 10% off | Rs 0 |
| BOOKWORM20 | Percentage | 20% off | Rs 2,000 |
| FLAT150 | Flat | Rs 150 off | Rs 1,500 |

Percentage discounts are rounded to the nearest rupee. A flat discount never exceeds the subtotal.

**BR-02 — Delivery fee.** If the cart is empty, the fee is Rs 0. Otherwise the fee is Rs 0 when (subtotal − discount) ≥ Rs 1,000, else Rs 150.

**BR-03 — Checkout validation**

| Field | Rule |
|---|---|
| Name | At least 3 characters after trimming |
| Email | Matches `local@domain.tld` pattern (no spaces, TLD ≥ 2 chars) |
| Phone | Pakistani mobile: 11 digits starting `03`; spaces and dashes are ignored |
| Address | At least 10 characters after trimming |
| City | At least 3 characters after trimming |

### 4. Non-Functional Requirements

| ID | Category (ISO 25010) | Requirement |
|---|---|---|
| NFR-01 | Performance | Search, filter and sort operations complete visibly instantly (< 200 ms) for the catalog size. |
| NFR-02 | Usability | The layout is fully usable at mobile width (360 px) and desktop width; controls are labelled for assistive technology. |
| NFR-03 | Reliability | Stock shall never become negative; an order shall never be created from an empty cart. |
| NFR-04 | Security | All checkout fields are validated; any user-supplied text displayed back in the page is HTML-escaped. |
| NFR-05 | Maintainability | Business rules reside in pure functions separate from UI code, so each rule is unit-testable in isolation. |
| NFR-06 | Compatibility | The app runs in current Chrome/Firefox/Safari/Edge and on Node ≥ 18 for the server and tests. |
| NFR-07 | Portability | The project runs from a fresh clone with `npm start` and no production dependencies. |

### 5. Assumptions and Constraints

- Catalog data is fixed for this release (no admin panel).
- Cash on delivery is the only payment method.
- Prices are in Pakistani Rupees (PKR).
