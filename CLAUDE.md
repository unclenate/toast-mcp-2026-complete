<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# CLAUDE.md — Toast MCP Server (hardened fork)

## Load order

Claude Code must read, in this order:

1. **This file** — toast-mcp project-local rules (authoritative for THIS repo)
2. `HARNESS.md` — active modules + governance artifacts (project root)
3. `AGENTS.md` — cross-agent operating manual (project root)
4. `.harness/AGENTS.md` — auto-harness framework's cross-agent manual (loaded as compiled fragment only)
5. Skills referenced in `AGENTS.md` — on demand

## Do NOT load

- `.harness/CLAUDE.md` — that file governs the auto-harness repo itself, not this consumer. Ignore it.
- `.harness/HARNESS.md` — same. The active `HARNESS.md` is this project's root one.

## Trust tiers in this repo

- **Tier 2 (workspace mutation only) on `src/`** — no autonomous git writes
- **Tier 3 (commit + push + PR) on `docs/` and root governance files**
- **Tier 4+ (env-altering / production)** — require explicit human direction every time

## Source-tree contract

- `src/clients/toast.ts:19-22` — outbound base URL is hardcoded; any change requires an ADR
- `src/server.ts:77-98` — read/write tool gating happens here; the current state is "all 21 write tools registered unconditionally" (RISK-006) — Track 3 will gate this behind an env flag
- No `eval`, no `child_process`, no dynamic require — current source discipline, codified

## Credential discipline

`TOAST_CLIENT_ID`, `TOAST_CLIENT_SECRET`, `TOAST_RESTAURANT_GUID` reach the process only via env vars. Never write them to tracked files. The README's `claude_desktop_config.json` example uses placeholder values — never replace them with real ones in a tracked commit.
