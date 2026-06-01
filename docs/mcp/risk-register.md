<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# MCP Risk Register — Toast MCP Server

**Source:** 2026-05-27 security audit (`docs/toast_mcp_security_assessment.docx` + independent source examination).
**Status convention:** open / mitigated / accepted / superseded.

| ID | Severity | Status | Description | Evidence | Mitigation target | Owner |
| -- | -------- | ------ | ----------- | -------- | ----------------- | ----- |
| RISK-001 | high | mitigated | `refundAmount` on `toast_refund_payment` is `z.number()` with no `.positive()`, `.int()`, `.max()` modifiers — unbounded monetary write. | `src/tools/payments.ts:62` (was :60 at audit time, line shifted by mutates tag) | **Track 3 M3 — DONE 2026-05-29.** Design: ADR-0003 (PR #5 ec9b306). Implementation: PR #6 30315217 — `refundAmount` + `tipRefundAmount` now use `positiveCents()` (int, >0, ≤ `MAX_MONETARY_CENTS`). | @unclenate |
| RISK-002 | high | mitigated | Cash entries have unbounded `amount` (PAID_IN/PAID_OUT and cash deposits both affected). | `src/tools/cash.ts:78` and `src/tools/cash.ts:184` (was :77/:181 at audit time, lines shifted by mutates tags) | **Track 3 M3 — DONE 2026-05-29.** PR #6 30315217 — cash entry `amount` uses `boundedMagnitudeCents()` (bipolar: int, nonzero, magnitude ≤ cap); cash deposit `amount` uses `positiveCents()`. | @unclenate |
| RISK-003 | high | open | HTTP server binds `0.0.0.0` by default (audit said "localhost"; actual is the wildcard interface). Exposes server to LAN. | `src/main.ts:106` — `app.listen(port, () => {...})` with no host arg | Track 3 M4 — design accepted in ADR-0004 (default `127.0.0.1`, `TOAST_MCP_HOST` opt-in); implementation pending | @unclenate |
| RISK-004 | medium | open | Wildcard CORS via `cors.default()` — any browser-origin can issue cross-origin requests when HTTP transport is enabled. | `src/main.ts:73` | Track 3 M4 — design accepted in ADR-0004 (deny-all by default; `TOAST_CORS_ORIGINS` allow-list); implementation pending | @unclenate |
| RISK-005 | medium | open | `/health` endpoint returns version string — reconnaissance disclosure. | `src/main.ts:81` | Track 3 M4 — design accepted in ADR-0004 (return only `{status: 'ok'}`); implementation pending | @unclenate |
| RISK-006 | medium | mitigated | All 21 write tools registered unconditionally — no read-only mode. Audit estimated "~40 write tools"; verified actual = 21 of 76. | `src/server.ts:77-98` (`registerAllTools()`) at b913e19 | **Track 3 M2 — DONE 2026-05-29.** Design: ADR-0002 (PR #2 ab10399). Implementation: PR #3 467e164 — per-tool `mutates: boolean` tag on 21 tools; `TOAST_READ_ONLY` strict env parser (safe-default read-only); registration-time gate plus dispatch-time defense-in-depth gate; named skipped tools logged at startup; zero-tools warning. | @unclenate |
| RISK-007 | medium | open | UI files use `innerHTML` built from order/item fields — XSS-unsafe by construction. Safe today (demo data), unsafe by design. | `order-detail.html:85,112,132`; `order-dashboard.html:182`; `order-grid.html:59` | Track 3 (replace with `textContent` or sanitized template) | @unclenate |
| RISK-008 | low | open | `package.json` `repository.url` points at `BusyBee3333/mcpengine` — provenance mismatch with the published package. | `package.json` | Track 2 (npm provenance + repo URL fix at first hardened release) | @unclenate |
| RISK-009 | low | mitigated | `package-lock.json` resolves express 5.x while `package.json` declares `^4.18.2` (14 reported mismatches); `npm ci` fails with EUSAGE on a clean clone. Workaround: `npm install` regenerates the lock. | `package.json:35`, `package-lock.json` (express tree); reproduced 2026-05-29 at b913e19 | **Mitigated 2026-05-29 by PR #3 467e164** — regenerated lockfile + `npm audit fix` committed; `npm ci` now succeeds. Track 2 M5 will add a CI check to prevent re-drift. | @unclenate |
| RISK-010 | medium | mitigated | Four additional unbounded monetary fields surfaced during M3 inventory grep — same defect class as RISK-001 and RISK-002, but unaudited. (a) `amount` on `toast_add_payment` (`src/tools/payments.ts:34`); (b) `tipAmount` on `toast_add_payment` (`src/tools/payments.ts:35`); (c) `tipRefundAmount` on `toast_refund_payment` (`src/tools/payments.ts:63`); (d) `price` on `toast_update_item_price` (`src/tools/menus.ts:100`). | Grep `z\.number\(\)` against `src/tools/*.ts` on 2026-05-29 | **Track 3 M3 — DONE 2026-05-29.** PR #6 30315217 — all four now use `positiveCents()`. | @unclenate |

## Companion-rule note

Per the auto-harness knowledge-capture module: each `high` severity risk has a paired entry in `docs/knowledge/shared-observations.md` (OBS-001..OBS-006) plus ADR-0001 mentions. Each `medium` and `low` has a paired observation row. The escalation table in `docs/knowledge/README.md` defines the policy.

## Active risks summary

- 3 high, 5 medium, 2 low total; **5 mitigated, 5 open** as of 2026-05-31
- Mitigated: RISK-001, RISK-002, RISK-010 (Track 3 M3 — monetary bounds, PR #6); RISK-006 (Track 3 M2 — read-only gate, PR #3); RISK-009 (lockfile regen, PR #3)
- Open: RISK-003, RISK-004, RISK-005 (Track 3 M4 — HTTP bind / CORS / health; **design accepted in ADR-0004, implementation pending**), RISK-007 (UI XSS), RISK-008 (Track 2 — provenance)
- None require security disclosure handling (no credentials leaked, no production users yet)
