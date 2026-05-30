<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Tool Registry — Toast MCP Server

**Total tools:** 76 (21 write/mutating, 55 read)
**Source of truth:** `src/tools/*.ts` files, registered via `src/server.ts` `registerAllTools()`.

## Write tools (21) — read-only mode: **skipped**

These tools call non-idempotent Toast endpoints (POST/PUT/PATCH/DELETE). Each is tagged `mutates: true` in its module and is **skipped from registration when `TOAST_READ_ONLY` is unset, empty, or `"true"`** (the default). Only the literal env value `"false"` opts in to writes. Per ADR-0002 (PR #2 `ab10399`), implementation landed in PR #3 `467e164`.

**Runtime evidence:** start the server in read-only mode and the startup log emits `Registered 55 tools (mode: read-only, 21 write tools skipped)` followed by `Skipped (read-only): <alphabetically-sorted names>`. Re-tagging a tool flips its presence in this list; mistagging a read tool with `mutates: true` makes it appear in the skipped log so the misclassification is observable from startup.

| Tool | Module | Toast endpoint shape | Risks |
| ---- | ------ | -------------------- | ----- |
| `toast_create_cash_entry` | cash | POST `/cashmgmt/v1/entries` | RISK-002 (unbounded amount) |
| `toast_void_cash_entry` | cash | DELETE `/cashmgmt/v1/entries/{guid}` | |
| `toast_create_cash_deposit` | cash | POST `/cashmgmt/v1/deposits` | RISK-002 (unbounded amount) |
| `toast_create_employee` | employees | POST employee | PII surface |
| `toast_update_employee` | employees | PATCH employee | PII surface |
| `toast_disable_employee` | employees | PATCH employee status | |
| `toast_update_stock_quantity` | items | PATCH inventory | |
| `toast_set_infinite_quantity` | items | PATCH inventory | |
| `toast_bulk_update_stock` | items | bulk PATCH inventory | blast radius |
| `toast_update_item_price` | items | PATCH item | menu/pricing surface |
| `toast_set_item_86` | items | PATCH item availability | |
| `toast_bulk_86_items` | items | bulk PATCH item availability | blast radius |
| `toast_create_order` | orders | POST `/orders/v2/orders` | |
| `toast_void_order` | orders | POST `/orders/v2/orders/{guid}/void` | |
| `toast_add_selections` | orders | POST line items on check | |
| `toast_void_selection` | orders | POST void selection | |
| `toast_apply_discount` | orders | POST discount on check | |
| `toast_update_order_promised_time` | orders | PATCH order | |
| `toast_add_payment` | payments | POST `/orders/v2/checks/{guid}/payments` | RISK-001 (unbounded amount via downstream) |
| `toast_refund_payment` | payments | POST `/orders/v2/payments/{guid}/refund` | **RISK-001 (unbounded `refundAmount`)** |
| `toast_void_payment` | payments | POST `/orders/v2/payments/{guid}/void` | |

## Read tools (55)

These tools call idempotent Toast endpoints (GET). Safe to register in all modes.

By module, totals:

- **cash:** 5 (`toast_list_cash_drawers`, `toast_get_cash_drawer`, `toast_list_cash_entries`, `toast_get_cash_drawer_summary`, `toast_list_cash_deposits`)
- **payments:** 3 (`toast_get_payment`, `toast_get_check_payments`, `toast_get_payment_summary`)
- **orders, employees, items, configuration, inventory, reporting:** remainder

For the canonical list, generate from source:

```bash
grep -hoE "name: '[a-z0-9_]+'" src/tools/*.ts | sort -u
```

(The list is intentionally not duplicated verbatim here because it changes when Track 3 adds gating; the regex above is the durable source of truth.)

## Tool input validation

All tools use Zod schemas registered at the `inputSchema` field. Runtime validation happens at `src/server.ts:151` via `tool.inputSchema.parse(...)`. This is real validation, not type-decoration.

**Known gaps (Track 3 fixes):**

- Monetary fields use `z.number()` without `.positive()`, `.int()`, `.max(N)` (RISK-001, RISK-002)
- Restaurant GUID is `z.string()` without UUID-shape validation — low risk, since the underlying API rejects malformed GUIDs

## Schema generation

The current implementation in `src/server.ts:107-136` is a hand-rolled, lossy Zod-to-JSON-Schema translation. For external publication of the tool schemas, swap to `zod-to-json-schema` — but for MCP wire protocol, the hand-rolled version is sufficient because the MCP SDK does its own marshalling.
