<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# ADR-0004: HTTP Transport Hardening — Loopback Bind, CORS Allow-List, Health Minimization

**Status:** Accepted
**Date:** 2026-05-31
**Author:** @unclenate
**Milestone:** M4 (Track 3)
**Mitigates:** RISK-003, RISK-004, RISK-005

## Context

The HTTP transport mode (`TOAST_MCP_MODE=http`) in `src/main.ts` carries three audit findings, all from the 2026-05-27 assessment:

- **RISK-003 (high)** — `app.listen(port, ...)` at `src/main.ts:106` passes no host argument, so Node binds `0.0.0.0` (all interfaces). On any multi-homed or LAN-connected host the server is reachable from the network, not just localhost.
- **RISK-004 (medium)** — `app.use(cors.default())` at `src/main.ts:73` emits `Access-Control-Allow-Origin: *`, so any browser origin can issue cross-origin requests once HTTP transport is enabled.
- **RISK-005 (medium)** — `/health` at `src/main.ts:81` returns `{ status, service, version }`; the `version` string is a reconnaissance disclosure to anonymous probes.

HTTP mode is **not recommended in v0** (the `/api/tools/:toolName` endpoint is still a stub that returns "not yet implemented"), but these defaults are wrong-by-construction and block the M5 release: we will not ship a release whose HTTP mode binds all interfaces with wildcard CORS, even if that mode is a stub. Hardening now also means the mode is safe the moment tool execution is wired up.

The existing config convention is `TOAST_MCP_MODE` and `TOAST_MCP_PORT` (read in `loadConfig()` at `src/main.ts:20-24`). M2 (`TOAST_READ_ONLY`) and M3 (`TOAST_MAX_MONETARY_CENTS`) established a strict-env-parse-with-safe-default pattern that this ADR reuses.

## Decision

1. **Default bind to loopback (RISK-003).** Add `TOAST_MCP_HOST` to `loadConfig()`, default `127.0.0.1`. `app.listen` is called as `app.listen(port, host, cb)`. An operator who genuinely needs LAN exposure sets `TOAST_MCP_HOST=0.0.0.0` (or a specific interface IP) explicitly. The startup log line names the resolved host so the binding is visible. No strict-parse rejection here — any non-empty string is passed to `listen` as-is (Node validates it); empty/unset → `127.0.0.1`.

2. **CORS allow-list, deny-all by default (RISK-004).** Replace `cors.default()` with an explicit origin list read from `TOAST_CORS_ORIGINS` (comma-separated). Parsing:
   - Unset or empty → **no CORS middleware is registered at all** (no `Access-Control-Allow-Origin` header ever emitted). Same-origin requests — including the bundled `/apps` UI — are unaffected, because same-origin requests do not use CORS.
   - One or more origins → register `cors({ origin: [<list>] })` so only those exact origins are allowed; each entry is trimmed, empties dropped.
   The default is deny-all-cross-origin, mirroring the safe-by-default posture of M2/M3. The UI works because it is same-origin with the API.

3. **Minimize `/health` (RISK-005).** `/health` returns exactly `{ status: 'ok' }`. Both `service` and `version` are removed. A probe learns only that the process is alive, not what it is or which version it runs.

4. **A small `src/lib/http-config.ts` helper** holds the CORS-origins parse (`parseCorsOrigins(raw): string[]`) and the host resolution (`resolveHttpHost(raw): string`), unit-testable in isolation the same way `parseReadOnly` and `parseMaxMonetaryCents` are. The host resolver is trivial but lives beside the CORS parser for cohesion and so the startup log and the `listen` call share one source of truth.

## Consequences

### Positive

- HTTP mode is safe-by-default: loopback-only, no cross-origin, no version disclosure. Matches the project's "wrong-by-default is unacceptable" posture from ADR-0002.
- The two env knobs (`TOAST_MCP_HOST`, `TOAST_CORS_ORIGINS`) are explicit, grep-able in a deployment, and default to the most restrictive setting.
- Unblocks M5 — the release can ship HTTP mode without carrying RISK-003/004/005.
- Same-origin `/apps` UI is unaffected by the CORS change (verified by the same-origin reasoning, not just assumed).

### Negative

- **Breaking change** for anyone currently relying on the `0.0.0.0` default or wildcard CORS (e.g., a dev who reaches the HTTP server from another machine, or a browser app on a different origin hitting `/api`). They must now set `TOAST_MCP_HOST` and/or `TOAST_CORS_ORIGINS`. Flagged for `CHANGELOG.md` (Track 2 M5). Low real-world impact: HTTP tool execution is a stub today, so almost nobody depends on these paths yet.
- `/health` consumers parsing the `version` field will get `undefined`. The field was never a stable contract.
- One new file + ~6 changed lines in `main.ts`.

### Neutral

- stdio mode (the recommended and only functional transport in v0) is entirely unaffected — none of these three concerns exist there.
- The change is additive at the config layer; no existing env var changes meaning.

## Implementation notes

- `src/lib/http-config.ts` exports `parseCorsOrigins(raw: string | undefined): string[]` and `resolveHttpHost(raw: string | undefined): string`.
- `loadConfig()` in `src/main.ts` gains `host` (from `TOAST_MCP_HOST`) and `corsOrigins` (from `TOAST_CORS_ORIGINS`) on the `Config` interface.
- HTTP block edits, all in `src/main.ts`:
  - `app.use(cors.default())` → conditional `if (corsOrigins.length) app.use(cors.default({ origin: corsOrigins }))`.
  - `/health` body → `{ status: 'ok' }`.
  - `app.listen(port, () => ...)` → `app.listen(port, host, () => ...)`, and the log line includes the host.
- Workspace edit reviewed under Tier 2 discipline (no autonomous git write to `src/`); the maintainer commits.
- A spot-test harness (like M3's) exercises `parseCorsOrigins` (unset, empty, single, multiple, whitespace, trailing comma) and `resolveHttpHost` (unset, `127.0.0.1`, `0.0.0.0`, specific IP) before merge.

## Companion satisfiers

- `docs/mcp/risk-register.md` — RISK-003, RISK-004, RISK-005 rows reference this ADR as mitigation.
- `docs/project/change-log.md` — 2026-05-31 row recording the ADR-0004 acceptance.
- `docs/project/milestones.md` — M4 row updated to "in progress" when implementation begins.
- `docs/deployment/self-hosting-guide.md` — the HTTP-mode section gains the new env vars and notes the safe defaults.

## References

- ADR-0001 — fork rationale; RISK-003/004/005 are listed there.
- ADR-0002 / ADR-0003 — established the strict-env-parse-with-safe-default pattern reused here.
- `src/main.ts:73` (CORS), `:81` (health), `:106` (bind) — the three gating sites.
- `docs/mcp/risk-register.md` RISK-003, RISK-004, RISK-005 — originating findings.
