<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Project Change Log — Toast MCP Server (hardened fork)

This log records material changes to project scope, plan, timeline, or technical direction.
It is not a git commit log — it captures decisions and their rationale, not code diffs.

| Date | Type | Change | Reason | Owner | ADR/PRD |
| ---- | ---- | ------ | ------ | ----- | ------- |
| 2026-05-28 | Scope | Adopted auto-harness governance under composition `mcp-server-typescript-oss` (.harness@4647a5f). Manifest pinned; kernel artifacts created; MCP module artifacts seeded from 2026-05-27 security audit; risk register populated with 8 findings; ADR-0001 records fork rationale. | Phase B of the harness adoption track (Track 1). The fork existing (vs. accepting upstream `@busybee3333/toast-mcp-server` posture) requires explicit governance to prevent us inheriting upstream's drift. | @unclenate | ADR-0001 |
| 2026-05-29 | Direction | ADR-0002 accepted: read-only mode becomes the default via `TOAST_READ_ONLY` env flag, gated by a per-tool `mutates: boolean` tag. Mitigates RISK-006. M2 moves to in progress; implementation lands as a separate Tier-2 workspace edit reviewed by the maintainer. | Operational target is local stdio against Toast sandbox; safe-by-default write suppression is a prerequisite before any credentials reach the process. Also unblocks M5 release scaffolding. | @unclenate | ADR-0002 |
| 2026-05-29 | Risk | RISK-009 (lockfile drift) added to docs/mcp/risk-register.md. Discovered while preparing the stdio dev path: upstream lockfile resolved express 5.x while package.json declares ^4.18.2, causing `npm ci` to fail with EUSAGE. Mitigation deferred to Track 2 (M5 CI verifies the lock). | Documenting the finding under the same companion-rule discipline as RISK-001..008 so the v0 release scaffolding can address it deterministically. | @unclenate | (no ADR — Track 2 housekeeping) |
