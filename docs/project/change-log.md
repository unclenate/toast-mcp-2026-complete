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
