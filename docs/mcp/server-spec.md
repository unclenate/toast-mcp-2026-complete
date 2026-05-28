<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# MCP Server Specification — Toast MCP Server

## Identity

- **Server name:** toast-mcp (fork of `@busybee3333/toast-mcp-server`)
- **Protocol:** Model Context Protocol (MCP), spec version per `@modelcontextprotocol/sdk` ^1.0.4
- **Implementation language:** TypeScript on Node.js
- **Entry point:** `src/main.ts`

## Transports

| Transport | Status | Default | Notes |
| --------- | ------ | ------- | ----- |
| stdio | supported | yes (CLI invocation) | Used by Claude Desktop, Claude Code. No auth at transport layer — trust derives from process boundary. |
| HTTP | supported | no (opt-in via env) | Currently binds `0.0.0.0` (RISK-003); Track 3 changes default to `127.0.0.1`. Wildcard CORS (RISK-004) lives here. |

## Authentication

- **Upstream (toward Toast):** OAuth 2.0 client credentials grant against Toast's identity endpoint, using `TOAST_CLIENT_ID` + `TOAST_CLIENT_SECRET` env vars
- **Downstream (toward MCP client):** none at protocol layer for stdio; HTTP transport currently has no auth (Track 3 addresses)

## State

Stateless except for the OAuth token cache in `src/clients/toast.ts`. Token refresh on 401, no persistent storage, no per-session state.

## Capabilities

- **Tools:** 76 total (see `tool-registry.md` for the full list). 21 are write/mutating; 55 are read.
- **Resources:** none
- **Prompts:** none
- **Sampling:** not used

## Outbound network surface

Hardcoded base URL in `src/clients/toast.ts:19-22`:

- Production: `https://ws-api.toasttab.com`
- Sandbox: `https://ws-sandbox-api.eng.toasttab.com`

No other outbound HTTP is performed.

## Operating modes (v0 target)

| Mode | Selector | Description |
| ---- | -------- | ----------- |
| Read-only (default in v0) | `TOAST_READ_ONLY=true` or unset | Only the 55 read tools are registered. Status: **planned**, lands with Track 3 M2. |
| Full (opt-in) | `TOAST_READ_ONLY=false` | All 76 tools registered. Recommended only for trusted deployments. |

## Open spec questions

- Should HTTP transport require an API key for client auth? Likely yes, defer to Track 3 ADR.
- Should the server log structured tool-call audit records? Currently no logging — adding it changes the operational story; defer to Track 2.

## References

- Tool registry: `docs/mcp/tool-registry.md`
- Risk register: `docs/mcp/risk-register.md`
- Capability schema (optional): not yet generated; produce from Zod via `zod-to-json-schema` if/when an external consumer needs it
- Transport and auth detail (optional): defer to Track 3 ADRs
- Prompt-injection test plan (optional): defer to Track 3 (the test plan and the mitigation co-evolve)
