<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# MCP Risk Register — Toast MCP Server

**Source:** 2026-05-27 security audit (`docs/toast_mcp_security_assessment.docx` + independent source examination).
**Status convention:** open / mitigated / accepted / superseded.

| ID | Severity | Status | Description | Evidence | Mitigation target | Owner |
| -- | -------- | ------ | ----------- | -------- | ----------------- | ----- |
| RISK-001 | high | open | `refundAmount` on `toast_refund_payment` is `z.number()` with no `.positive()`, `.int()`, `.max()` modifiers — unbounded monetary write. | `src/tools/payments.ts:60` | Track 3 M3 (input bounds at Zod boundary, per operating principle 3) | @unclenate |
| RISK-002 | high | open | Cash entries have unbounded `amount` (PAID_IN/PAID_OUT and cash deposits both affected). | `src/tools/cash.ts:77` and `src/tools/cash.ts:181` | Track 3 M3 | @unclenate |
| RISK-003 | high | open | HTTP server binds `0.0.0.0` by default (audit said "localhost"; actual is the wildcard interface). Exposes server to LAN. | `src/main.ts:105` — `app.listen(port, () => {...})` with no host arg | Track 3 M4 (default `127.0.0.1`, env opt-in to bind elsewhere) | @unclenate |
| RISK-004 | medium | open | Wildcard CORS via `cors.default()` — any browser-origin can issue cross-origin requests when HTTP transport is enabled. | `src/main.ts:72` | Track 3 M4 (explicit allow-list) | @unclenate |
| RISK-005 | medium | open | `/health` endpoint returns version string — reconnaissance disclosure. | `src/main.ts:80` | Track 3 M4 (omit version, return only `{status: 'ok'}`) | @unclenate |
| RISK-006 | medium | open | All 21 write tools registered unconditionally — no read-only mode. Audit estimated "~40 write tools"; verified actual = 21 of 76. | `src/server.ts:77-98` (`registerAllTools()`) | Track 3 M2 — design accepted in ADR-0002 (per-tool `mutates: boolean`, `TOAST_READ_ONLY=true` default); implementation pending | @unclenate |
| RISK-007 | medium | open | UI files use `innerHTML` built from order/item fields — XSS-unsafe by construction. Safe today (demo data), unsafe by design. | `order-detail.html:85,112,132`; `order-dashboard.html:182`; `order-grid.html:59` | Track 3 (replace with `textContent` or sanitized template) | @unclenate |
| RISK-008 | low | open | `package.json` `repository.url` points at `BusyBee3333/mcpengine` — provenance mismatch with the published package. | `package.json` | Track 2 (npm provenance + repo URL fix at first hardened release) | @unclenate |
| RISK-009 | low | open | `package-lock.json` resolves express 5.x while `package.json` declares `^4.18.2` (14 reported mismatches); `npm ci` fails with EUSAGE on a clean clone. Workaround: `npm install` regenerates the lock. | `package.json:35`, `package-lock.json` (express tree); reproduced 2026-05-29 | Track 2 M5 — CI verifies `npm ci` succeeds on the committed lockfile; regenerate lock and pin dependency tree at release prep | @unclenate |

## Companion-rule note

Per the auto-harness knowledge-capture module: each `high` severity risk has a paired entry in `docs/knowledge/shared-observations.md` (OBS-001..OBS-006) plus ADR-0001 mentions. Each `medium` and `low` has a paired observation row. The escalation table in `docs/knowledge/README.md` defines the policy.

## Active risks summary

- 3 high, 4 medium, 2 low — all open as of 2026-05-29
- All targeted for resolution in Track 3 (M2, M3, M4) or Track 2 (M5, M6)
- RISK-006 has an accepted design (ADR-0002); code implementation pending
- None require security disclosure handling (no credentials leaked, no production users yet)
