<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# ADR-0001: Security-Hardened Fork of `@busybee3333/toast-mcp-server`

**Status:** Accepted
**Date:** 2026-05-28
**Author:** @unclenate

## Context

`@busybee3333/toast-mcp-server` is the original npm-published MCP server for Toast Restaurant POS. As of the 2026-05-27 audit, it has the following posture issues that make it unsuitable for production use without modification:

1. **Provenance mismatch** — `package.json` `repository.url` points at `BusyBee3333/mcpengine`, a different repo than where the package lives. (RISK-008)
2. **No `SECURITY.md`, no disclosure policy.**
3. **All 21 write tools registered unconditionally** at `src/server.ts:77-98` — no read-only mode. (RISK-006)
4. **Unbounded monetary fields** at the Zod schema layer:
   - `refundAmount` on `toast_refund_payment` (`src/tools/payments.ts:60`) — RISK-001
   - Cash entry / cash deposit `amount` (`src/tools/cash.ts:77,181`) — RISK-002
5. **HTTP server binds `0.0.0.0`** by default (`src/main.ts:105`) — RISK-003
6. **Wildcard CORS** via `cors.default()` (`src/main.ts:72`) — RISK-004
7. **`/health` leaks version string** (`src/main.ts:80`) — RISK-005
8. **UI files use `innerHTML`** built from POS fields — XSS-unsafe by construction. (RISK-007)

Plaintext-credential install pattern in the README compounds these (steers users to embed `TOAST_CLIENT_SECRET` in `claude_desktop_config.json` which is then synced via OS file-sync mechanisms).

Upstream maintainer activity is sporadic; a contributed PR addressing all eight items at once would be unlikely to land on a timeline that matches Yoko's Restaurant Group's deployment needs.

## Decision

Fork `@busybee3333/toast-mcp-server` into `unclenate/toast-mcp-2026-complete` and:

1. **Govern under auto-harness** using composition `mcp-server-typescript-oss` (the composition itself was contributed upstream as auto-harness PR #73)
2. **Address the eight risks** under separate ADRs per the Track 3 plan (`docs/project/milestones.md` M2/M3/M4)
3. **Re-publish to npm under a different package name** at v0.x once Track 3 lands and Track 2 ships release scaffolding (M5/M6)
4. **Retain the option** to contribute the fixes back as upstream PRs once they're proven in the hardened fork

## Consequences

### Positive

- Independent provenance chain (correct `repository.url`, npm provenance attestations)
- Release cadence decoupled from upstream's maintainer availability
- Yoko's and other downstream consumers gain a hardened drop-in option
- Each risk lands under its own ADR with explicit before/after — easier to audit
- `auto-harness` gets a real consumer dogfood project, surfacing framework gaps (PR #73 was driven by this need)

### Negative

- We carry the maintenance burden for the fork — security patches, dependency updates, Toast API changes
- Fork divergence makes a future upstream merge harder; we mitigate by keeping ADR-mapped changes minimal and well-documented
- Users now have two npm packages to choose from; some confusion is unavoidable until the hardened fork demonstrates clear value

### Neutral

- `src/` remains structurally similar to upstream — most ADRs add gates and bounds, not new features

## Companion satisfiers

- `docs/project/change-log.md` — 2026-05-28 row references this ADR
- `docs/mcp/risk-register.md` — RISK-001..RISK-008 reference this ADR as their authorizing record
- `docs/knowledge/shared-observations.md` — OBS-001..OBS-008 are the underlying observations

## References

- `docs/toast_mcp_security_assessment.docx` — the third-party assessment that prompted this fork
- `docs/superpowers/specs/2026-05-27-harness-bootstrap-design.md` — the design for the harness adoption
- auto-harness PR #73 — the composition contribution that enables this fork's posture
