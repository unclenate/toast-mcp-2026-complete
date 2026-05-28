<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Shared Observations — Toast MCP Server

Per-entry structure. Each observation is one section below.

---

## OBS-001 — 2026-05-27 — high — Unbounded `refundAmount` on `toast_refund_payment`

**Source:** 2026-05-27 source audit (independent verification of `docs/toast_mcp_security_assessment.docx`)
**Evidence:** `src/tools/payments.ts:60` — `refundAmount: z.number()` with no `.positive()`, `.int()`, `.max()` modifiers.
**Impact:** A prompt-injection or hostile-tool-call scenario could submit arbitrary refund amounts (including negative or absurdly large), routed straight to Toast's `/orders/v2/payments/{guid}/refund` endpoint.
**Escalation applied:** ADR-0001 + `docs/mcp/risk-register.md` RISK-001 + this row.

---

## OBS-002 — 2026-05-27 — high — Cash entries with unbounded `amount`

**Source:** 2026-05-27 source audit
**Evidence:** `src/tools/cash.ts:77` (PAID_IN/PAID_OUT entries), `src/tools/cash.ts:181` (cash deposits).
**Impact:** Same shape as OBS-001 — unbounded monetary write on a stateful POS resource. Cash deposits cannot be voided without a paper trail.
**Escalation applied:** ADR-0001 + risk-register RISK-002 + this row.

---

## OBS-003 — 2026-05-27 — high — HTTP server binds 0.0.0.0 by default

**Source:** 2026-05-27 source audit (correction to `.docx` assessment which assumed localhost)
**Evidence:** `src/main.ts:105` — `app.listen(port, () => {...})` with no host argument, which defaults to `0.0.0.0/::`.
**Impact:** When run in HTTP mode on any machine with a routable IP, the server is exposed to the local network with no auth. A Yoko's-style on-premise deployment would expose the entire Toast tool surface to other hosts on the LAN.
**Escalation applied:** ADR-0001 + risk-register RISK-003 + this row.

---

## OBS-004 — 2026-05-27 — medium — Wildcard CORS

**Source:** 2026-05-27 source audit
**Evidence:** `src/main.ts:72` — `app.use(cors.default())` enables wildcard `Access-Control-Allow-Origin: *`.
**Impact:** Any web page in the browser can issue cross-origin requests to the local server when HTTP mode is enabled. Combined with OBS-003, this turns the local server into a network-reachable, browser-callable endpoint.
**Escalation applied:** risk-register RISK-004 + this row.

---

## OBS-005 — 2026-05-27 — medium — `/health` leaks version string

**Source:** 2026-05-27 source audit
**Evidence:** `src/main.ts:80` — `/health` endpoint returns `{ status: 'ok', version: ... }`.
**Impact:** Version disclosure narrows attacker's vulnerability search. Low blast radius (this is widely considered minor), but combined with OBS-003+OBS-004 it removes a reconnaissance friction point.
**Escalation applied:** risk-register RISK-005 + this row.

---

## OBS-006 — 2026-05-27 — medium — All 21 write tools registered unconditionally

**Source:** 2026-05-27 source audit (the `.docx` estimated "~40 write tools"; verified actual is 21 of 76)
**Evidence:** `src/server.ts:77-98` — `registerAllTools()` registers every tool in every module unconditionally. No read-only gate.
**Impact:** Default deployment exposes 21 mutating endpoints (cash, employees, items, orders, payments) to whatever can call the MCP server. For a fork targeting maintained-OSS release, default-write is the wrong posture.
**Escalation applied:** ADR-0001 + risk-register RISK-006 + this row. Track 3 milestone M2 fixes this.

---

## OBS-007 — 2026-05-27 — medium — UI files use innerHTML

**Source:** 2026-05-27 source audit
**Evidence:** `order-detail.html:85,112,132`; `order-dashboard.html:182`; `order-grid.html:59` — innerHTML assignments built from order/item fields.
**Impact:** XSS-unsafe by construction. Safe today because demo data is curated, but any future use against real Toast data exposes the UI surface to whatever content the POS records hold.
**Escalation applied:** risk-register RISK-007 + this row.

---

## OBS-008 — 2026-05-27 — low — `package.json` provenance mismatch

**Source:** 2026-05-27 source audit
**Evidence:** `package.json` `repository.url` field points at `https://github.com/BusyBee3333/mcpengine.git` — a different repo than the one the published package was built from.
**Impact:** npm provenance / SLSA-style chain-of-custody is broken at the manifest level. Track 2 fixes this when we cut our first npm release under the hardened-fork name.
**Escalation applied:** risk-register RISK-008 + this row.
