<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Operating Principles — Toast MCP Server (hardened fork)

These principles describe how this project is built and evolved. They extend the kernel doctrine in `.harness/platform/core/kernel/base/doctrine.md` with five project-specific principles.

## 1. Read-only by default in v0

Until Track 3 lands an env-flag-gated write surface, the v0 OSS release ships only the 55 read tools (and even then, write registration in code remains conditional on the flag — never on a partial guard). The 21 write tools may still exist in source but must not be registered with the MCP server when `TOAST_READ_ONLY=true` (the default).

**Why:** The 2026-05-27 audit established that the upstream `busybee3333/toast-mcp-server` registers all 21 write tools unconditionally (RISK-006). For Yoko's and any downstream consumer, the safe default is read-only; opt-in writes are an explicit per-deployment risk acceptance.

**Where this lives:** `src/server.ts:77-98` (registration logic), Track 3 ADR defines the flag and gating semantics.

## 2. Credential locality

`TOAST_CLIENT_SECRET` and `TOAST_RESTAURANT_GUID` arrive at the process only via env vars. No config files, no plaintext in `claude_desktop_config.json` recommendations in `README.md`. No logging of credential values, including in error paths.

**Why:** Toast OAuth client credentials grant full access to the restaurant's POS data. Any tracked-file leak is unrecoverable (rotate-only mitigation). The upstream README steers users to embed `TOAST_CLIENT_SECRET` in their Claude Desktop config plaintext — we keep the same env-var shape but mark the README placeholder explicit.

**Where this lives:** `src/clients/toast.ts:77-94` (the only place credentials are sent), `README.md` install section.

## 3. Input bounds at the Zod boundary

Monetary fields are `z.number().int().positive().max(N)`. There is no unbounded `z.number()` for money in any new payment or cash tool. The bound `N` is `10_000_000` (one hundred thousand dollars, in cents) unless a deployment overrides it via the `TOAST_MAX_MONETARY_CENTS` env var — sized to comfortably exceed any legitimate single-check value while bounding worst-case prompt-injection abuse.

**Exception** (per ADR-0003): `amount` on `toast_create_cash_entry` is bipolar (the adjacent `type: 'PAID_IN' | 'PAID_OUT'` enum carries the sign, and the upstream schema description explicitly allows negative for PAID_OUT). That field uses bounded magnitude — `z.number().int().refine(n => n !== 0 && Math.abs(n) <= N)` — instead of `.positive()`. All other monetary fields follow the strict positive form.

**Why:** RISK-001 and RISK-002 from the 2026-05-27 audit, plus RISK-010 (four unaudited monetary fields surfaced during M3 inventory). The fix lives in the schema layer where it's structurally enforced by Zod's runtime validation, not in a separate "validate" function that could be bypassed.

**Where this lives:** `src/lib/monetary.ts` (helpers + env parse), applied to 7 fields across `src/tools/payments.ts`, `src/tools/cash.ts`, `src/tools/menus.ts`. Any new monetary tool follows the same pattern via the helper.

## 4. Outbound base URL is hardcoded

The existing `src/clients/toast.ts:19-22` discipline — `ws-api.toasttab.com` (prod) or `ws-sandbox-api.eng.toasttab.com` (sandbox) selected by `TOAST_ENVIRONMENT` — is canonical. The base URL is never derived from env, request input, or any other dynamic source. Any change to this discipline requires an ADR.

**Why:** This is the defense against credential exfiltration via prompt injection. An attacker who can inject tool-call arguments cannot redirect the outbound API call to their own endpoint as long as the base URL is structurally pinned in source.

**Where this lives:** `src/clients/toast.ts:19-22`.

## 5. No `eval`, no `child_process`, no dynamic require

The current source has none of these (verified via grep during audit). This principle codifies that as a hard rule. Any future addition requires an ADR.

**Why:** These three are the standard remote-code-execution gateways for MCP servers that process LLM-controlled input. Their absence today is what makes the server safe to host even with the auth surface concerns we're addressing in Tracks 2/3.

**Where this lives:** all of `src/`. Verify with `grep -rE "eval\(|child_process|require\(.*\)" src/` — must return no matches.
