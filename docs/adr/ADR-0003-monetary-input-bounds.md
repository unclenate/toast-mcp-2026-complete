<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# ADR-0003: Monetary Input Bounds at the Zod Boundary

**Status:** Accepted
**Date:** 2026-05-29
**Author:** @unclenate
**Milestone:** M3 (Track 3)
**Mitigates:** RISK-001, RISK-002, and adds RISK-010 (four additional unbounded monetary fields surfaced during M3 inventory).

## Context

The 2026-05-27 audit named two findings of the same class:

- **RISK-001** — `refundAmount` on `toast_refund_payment` is `z.number()` with no shape modifiers (`src/tools/payments.ts:62`).
- **RISK-002** — Cash entry `amount` and cash deposit `amount` are unbounded `z.number()` (`src/tools/cash.ts:78` and `:184`).

`docs/operating-principles.md` principle 3 codifies the intended fix shape: `z.number().int().positive().max(N)` where `N = 100_000_00` cents (= $100,000), env-overridable. M2 added a read-only-by-default gate that *blocks* these writes when `TOAST_READ_ONLY` is set; M3's job is to make the writes *bounded* even when an operator deliberately opts in to writes.

An M3-discovery grep against `z\.number\(\)` in `src/tools/*.ts` surfaces **four more** monetary fields the audit did not name. They are the same defect class, just unaudited:

| Field | Tool | Location |
| --- | --- | --- |
| `amount` | `toast_add_payment` | `src/tools/payments.ts:34` |
| `tipAmount` | `toast_add_payment` | `src/tools/payments.ts:35` |
| `tipRefundAmount` | `toast_refund_payment` | `src/tools/payments.ts:63` |
| `price` | `toast_update_item_price` | `src/tools/menus.ts:100` |

Total monetary input surface: **7 fields across 3 modules**. Recording the four unaudited ones as **RISK-010** (single row in the risk register, multi-field description) under the same companion-rule discipline as RISK-001..009. Bundling under one ID matches the ADR-0001 precedent (8 findings under one decision); the new findings are mechanically identical to the originals.

The cash entry at `cash.ts:78` is the only field where the existing schema description explicitly allows negative values: `"Amount in cents (positive for paid in, negative for paid out)"`. The sign is redundant with the adjacent `type: 'PAID_IN' | 'PAID_OUT'` enum — Toast's API treats the type as the authoritative direction — but the field has been bipolar since upstream, and tightening to `.positive()` would be a breaking change without a corresponding handler adjustment. We bound the *magnitude* instead.

## Decision

1. **One shared bound, env-overridable.** A constant `MAX_MONETARY_CENTS = 10_000_000` (= $100,000) lives in `src/lib/monetary.ts`. The constant is resolved at module load from the env var `TOAST_MAX_MONETARY_CENTS` when present:
   - Unset or empty → default `10_000_000`
   - Parseable positive integer → use that value
   - Any other shape (negative, decimal, non-numeric, zero) → log a warning and default to `10_000_000`
   The strict parse mirrors `parseReadOnly` from M2: no silent typo acceptance.

2. **Two helper schemas.** Same file exports:
   - `positiveCents()` returning `z.number().int().positive().max(MAX_MONETARY_CENTS)`. Used for the 6 fields that must be `> 0`.
   - `boundedMagnitudeCents()` returning `z.number().int().refine(n => n !== 0 && Math.abs(n) <= MAX_MONETARY_CENTS, { message: \`magnitude must be a nonzero integer ≤ ${MAX_MONETARY_CENTS} cents\` })`. Used for the single bipolar cash-entry field.
   Both helpers attach a `.describe(...)` so the Zod-to-JSON-Schema reflection in `src/server.ts` continues to surface useful documentation to the MCP client.

3. **Per-field application.** The seven `z.number()` sites listed in the Context table are each replaced with the appropriate helper call. No other `z.number()` site is touched — quantity, businessDate, pageSize, etc. are not monetary and are out of scope for M3.

4. **Cash-entry zero rejected.** `boundedMagnitudeCents()` rejects `0` (a paid-in or paid-out of zero is meaningless and almost certainly a prompt-injection probe). The positive helpers already reject `0` via `.positive()`.

5. **Decimal rejected.** `.int()` is load-bearing. The `cents`-based input shape means anything non-integer is an operator-input bug or an injection probe (e.g., `1.5` cents). The error message points at this in the Zod refinement description.

6. **No "soft warning" mode.** Out-of-bound inputs are rejected at the schema layer, before any handler runs. There is no `.refine(..., { soft: true })` equivalent in Zod and we do not invent one. Operators who legitimately need higher bounds set `TOAST_MAX_MONETARY_CENTS`.

## Consequences

### Positive

- Mitigates RISK-001, RISK-002, and the four newly-surfaced RISK-010 fields in one decision.
- Backed by `docs/operating-principles.md` principle 3 — code finally enforces what the principle promised.
- Helper-based: future monetary tools call `positiveCents()` and inherit the bound; the audit surface for "are all monetary fields bounded?" becomes `grep -nE 'z\.number\(\)' src/tools/ | grep -v "businessDate\|page\|quantity\|threshold\|limit\|numberOf"` plus the inverse: every monetary field calls one of two helpers.
- Env override gives operators an escape hatch without code change for legitimate high-value scenarios (a $200K cash deposit during a major reconciliation event, for example).

### Negative

- **Breaking change** for any current opt-in-write user who passes:
  - Decimal cents (`1234.5`) — was accepted, now rejected. Realistically nobody is doing this; the descriptions all say "in cents".
  - Amounts > $100K — was accepted, now rejected unless `TOAST_MAX_MONETARY_CENTS` is raised.
  - Zero on a cash entry — was accepted (no-op or POS-silent), now rejected.
  Flagged for `CHANGELOG.md` (Track 2 M5).
- One new `src/lib/monetary.ts` file (~50 lines) plus 7 tool-file edits.
- The bipolar cash-entry field deviates from principle 3's strict `.positive()` wording. Principle 3 should be amended (or this ADR should explicitly note it as a documented deviation; doing the latter to avoid principle-doc churn).

### Neutral

- The helper interface is additive. Existing read tools and the 21 write tools without monetary fields are unaffected.
- The env-parse adds one log line at startup when the override is malformed. Stderr-only, matches the M2 convention.

## Implementation notes

- `src/lib/monetary.ts` exports: `MAX_MONETARY_CENTS` (resolved value), `parseMaxMonetaryCents(raw: string | undefined): { value: number; warning: string | null }` (testable like `parseReadOnly`), `positiveCents()`, `boundedMagnitudeCents()`.
- Edits limited to the 7 fields enumerated above:
  - `src/tools/payments.ts:34, 35, 62, 63`
  - `src/tools/cash.ts:78, 184`
  - `src/tools/menus.ts:100`
- Workspace edit reviewed under Tier 2 discipline (no autonomous git write to `src/`); the maintainer commits.
- The 21-tool write inventory in `docs/mcp/tool-registry.md` should add a per-row monetary-bounds annotation as a follow-up Tier-3 commit after this ADR's implementation merges (same pattern as M2's tool-registry annotation followup).
- A small smoke test harness (similar to M2's `test-error-info.mjs`) runs the helpers against a 6-case input matrix (valid positive, zero, negative, decimal, exceeds bound, BigInt-cast attempt) to catch regressions before merge.

## Companion satisfiers

- `docs/mcp/risk-register.md` — RISK-001 and RISK-002 rows reference this ADR as mitigation; new RISK-010 row added for the four unaudited fields.
- `docs/project/change-log.md` — 2026-05-29 row recording the ADR-0003 acceptance.
- `docs/project/milestones.md` — M3 row updated to "in progress" when implementation begins.
- `docs/operating-principles.md` principle 3 — minor amendment noting the bipolar-cash-entry deviation, with a back-reference to this ADR.

## References

- ADR-0001 — fork rationale; RISK-001 and RISK-002 are listed there.
- ADR-0002 — M2 read-only gate; established the strict-env-parse pattern this ADR reuses for `TOAST_MAX_MONETARY_CENTS`.
- `docs/operating-principles.md` principle 3 — the intended shape of the fix.
- `src/tools/payments.ts:34,35,62,63`, `src/tools/cash.ts:78,184`, `src/tools/menus.ts:100` — the seven gating sites.
- `docs/mcp/risk-register.md` RISK-001, RISK-002 — originating findings.
