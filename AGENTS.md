# AGENTS.md

Cross-agent operating rules for this project. This file is read by Claude Code,
Cursor, Windsurf, GitHub Copilot, OpenAI Codex, and any other agent that
respects the AGENTS.md cross-client convention.

<!-- harness-managed-section -->

<!-- This section is maintained by .harness/platform/bootstrap/install.sh.
     Edits between the markers will be overwritten on re-bootstrap.
     See docs/adr/ADR-0003-submodule-integration.md for rationale. -->

## Harness governance

This repo adopts auto-harness for governance, mounted at `.harness/`.

- Active manifest: `harness.manifest.yaml`
- Governance rules: derived from active modules declared in the manifest
- Validators: `.harness/platform/validators/*.sh` (require Ruby 3.0+)
- Skills available: `.agents/skills/` (cross-client) and `.claude/skills/` (Claude Code)

Cross-agent operating rules come from the kernel trust model and active agent
packs declared in `harness.manifest.yaml`.

### Keeping the harness up to date

Periodically run `git submodule update --remote .harness` to pick up harness
improvements (new modules, validator fixes, new compositions). Review the
diff and commit. See `.harness/platform/workflow/maintenance-operations.md`
for the full upgrade workflow.

<!-- /harness-managed-section -->

---

## Project-specific operating notes (Toast MCP Server)

### Credential discipline

- `TOAST_CLIENT_ID`, `TOAST_CLIENT_SECRET`, `TOAST_RESTAURANT_GUID` reach the process only via env vars
- Never embed real credentials in any tracked file (config examples, tests, README, settings.json)
- The `claude_desktop_config.json` recommendation in `README.md` uses placeholder strings — keep them placeholder

### Restaurant GUID handling

- Restaurant GUID is **per-request**, never module-scoped or hardcoded
- The client surface accepts `restaurantGuid` as an optional argument on every tool that needs it
- Default lookup: `client.getRestaurantGuid()` reads `TOAST_RESTAURANT_GUID` at request time

### Sandbox vs production endpoint

- `src/clients/toast.ts:19-22` hardcodes the base URL: `ws-api.toasttab.com` (prod) or `ws-sandbox-api.eng.toasttab.com` (sandbox), selected by `TOAST_ENVIRONMENT`
- This is the only place outbound HTTP base URLs live; any change requires an ADR
- The hardcoding is intentional — defends against credential exfiltration via injection

### Producer-side MCP overlay

- This repo ships an MCP server (it is the *producer*, not the consumer)
- `harness-mcp` skill applies (already symlinked to `.claude/skills/`)
- Three-mode map: 76 total tools, 21 write, 55 read — see `docs/mcp/tool-registry.md`

### Active risks (do not regress)

- See `docs/mcp/risk-register.md` for the 8 audit findings from 2026-05-27
- Any change that would expand the attack surface (new write tool, new transport, new auth path) must update the risk register in the same PR
