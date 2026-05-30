<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Milestones — Toast MCP Server (hardened fork)

| ID | Milestone | Target | Status | Track |
| -- | --------- | ------ | ------ | ----- |
| M1 | Harness bootstrap complete (Phase B) | 2026-05-28 | complete (PR #1 merged b913e19, 2026-05-28) | Track 1 |
| M2 | Read-only mode env flag (`TOAST_READ_ONLY=true` default) gates all 21 write tools at `src/server.ts:77-98` | 2026-06-15 | complete (ADR-0002 PR #2 `ab10399` + impl PR #3 `467e164`, both 2026-05-29) | Track 3 |
| M3 | Monetary input bounds (`z.number().int().positive().max(N)`) on `refundAmount`, cash `amount`, and any other unbounded number | 2026-06-15 | in progress (ADR-0003 accepted 2026-05-29; implementation pending) | Track 3 |
| M4 | HTTP server bound to `127.0.0.1` by default (env opt-in to bind elsewhere); explicit CORS allow-list replacing wildcard | 2026-06-22 | pending | Track 3 |
| M5 | `SECURITY.md`, npm provenance, `CHANGELOG.md`, GitHub Actions CI with auto-harness validator chain | 2026-06-29 | pending | Track 2 |
| M6 | First v0 OSS release on npm (hardened drop-in for `@busybee3333/toast-mcp-server`) | 2026-07-06 | pending | Track 2 |

## Dependencies

- M2 blocks M5 (no release with default-write tool registration)
- M3 blocks M5 (no release with unbounded monetary fields)
- M4 blocks M5 (no release with 0.0.0.0 default bind / wildcard CORS)
- M1 blocks M2, M3, M4 (harness must govern subsequent ADRs)

## Notes

Dates are targets, not contracts. The maintainer is solo; deslip is acceptable provided the dependency chain is preserved.
