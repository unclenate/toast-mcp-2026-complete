<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Self-Hosting Guide — Toast MCP Server (hardened fork)

> **Status note (2026-05-28):** This guide describes the *current state* of the hardened-fork in-development. The v0 OSS release ships after Track 3 (security refactor) and Track 2 (release scaffolding) complete. Until then, the install paths below mirror upstream but inherit upstream's known risks — see `docs/mcp/risk-register.md`.

## Prerequisites

- Node.js 20.x or later
- A Toast partner account with API credentials (`TOAST_CLIENT_ID`, `TOAST_CLIENT_SECRET`) and a target restaurant GUID (`TOAST_RESTAURANT_GUID`) — see "Acquiring sandbox credentials" below
- Either Claude Desktop, Claude Code, or another MCP-compatible client

## Acquiring sandbox credentials

The hardened-fork in-development assumes you bring your own Toast partner credentials. Sandbox credentials are recommended for any first-run, audit, or development setup; production credentials should only be used after the Track 3 hardening lands and you have read the risk register in full.

The acquisition path is owned by Toast, not by this project. At a high level:

1. Obtain a Toast partner-tier account via your Toast account manager or via Toast's developer-portal signup (refer to Toast's own current documentation — URLs change).
2. From the partner portal, provision a sandbox client (`TOAST_CLIENT_ID` + `TOAST_CLIENT_SECRET`) and select a sandbox restaurant (gives you `TOAST_RESTAURANT_GUID`).
3. Confirm the credentials work against Toast's sandbox API surface independently of this server before pointing this server at them — use Toast's own test endpoints or a `curl` against the OAuth token endpoint.

If you cannot obtain sandbox credentials, do not point this server at a production restaurant to "just try it" — RISK-006 (write tools enabled by default) means tool invocations can mutate real POS state. Wait until ADR-0002 lands (`TOAST_READ_ONLY=true` enforced in code).

## Installation (development, current state)

```bash
git clone https://github.com/unclenate/toast-mcp-2026-complete
cd toast-mcp-2026-complete
git submodule update --init --recursive
npm install
npm run build
```

> **Note (2026-05-28):** The upstream lockfile has drift against `package.json` (RISK-009 — see `docs/mcp/risk-register.md`). If `npm ci` fails on a clean clone with `EUSAGE`, use `npm install` to regenerate the lock. This will be permanently resolved once Track 2 M5 ships with a CI-verified lock.

## Configuration

Set the following environment variables. **In stdio mode** (Claude Desktop / Claude Code), set them under the server's `env` block in `claude_desktop_config.json` — see the sample below. **In HTTP mode**, set them in your shell or process supervisor; never use a tracked `.env` file (a `.env.example` may be tracked, but the real values never are).

- `TOAST_CLIENT_ID` — your Toast partner client id (placeholder until set)
- `TOAST_CLIENT_SECRET` — your Toast partner client secret (placeholder until set)
- `TOAST_RESTAURANT_GUID` — target restaurant GUID (placeholder until set)
- `TOAST_ENVIRONMENT` — `sandbox` or `production` (default: `production` in the current upstream code; will be revisited under a future ADR)
- `TOAST_READ_ONLY` — `true` (default in v0 once ADR-0002 lands); explicit `false` opts into the 21 write tools
- `TOAST_MAX_MONETARY_CENTS` — upper bound for monetary inputs, in cents (default `10000000` = $100,000). Plain positive integer only; malformed values warn and fall back to the default (ADR-0003).
- `TOAST_MCP_HOST` — *(HTTP mode only)* interface to bind (default `127.0.0.1`, loopback). Set to `0.0.0.0` to expose on all interfaces — only on a trusted network (ADR-0004).
- `TOAST_CORS_ORIGINS` — *(HTTP mode only)* comma-separated list of allowed browser origins. Unset (default) means no cross-origin requests are allowed; the bundled same-origin UI is unaffected (ADR-0004).

**Never commit any of these values.** They are credential-grade. See `docs/operating-principles.md` principle 2.

## Running

### stdio mode (Claude Desktop / Claude Code)

Add the following entry to your `claude_desktop_config.json` under `mcpServers`. Replace `/ABSOLUTE/PATH/TO/` with the on-disk path to your clone, and replace each `REPLACE_ME` with the credential value from your password manager (never edit these into a tracked copy of this file):

```json
{
  "mcpServers": {
    "toast": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/toast-mcp-2026-complete/dist/main.js"],
      "env": {
        "TOAST_CLIENT_ID": "REPLACE_ME",
        "TOAST_CLIENT_SECRET": "REPLACE_ME",
        "TOAST_RESTAURANT_GUID": "REPLACE_ME",
        "TOAST_ENVIRONMENT": "sandbox",
        "TOAST_READ_ONLY": "true"
      }
    }
  }
}
```

Restart Claude Desktop after editing. The server's startup log line (visible in Claude Desktop's MCP debug pane) will report tool count and mode — confirm it shows `read-only` for sandbox runs once ADR-0002 lands.

### HTTP mode

Still not recommended in v0 — the `/api/tools/:toolName` endpoint is a stub that returns "not yet implemented", so there is nothing functional to reach over HTTP yet. But as of ADR-0004 (M4) the transport defaults are now safe-by-construction rather than wrong-by-construction:

- **Bind:** loopback `127.0.0.1` by default. The server is not reachable from the LAN unless you explicitly set `TOAST_MCP_HOST=0.0.0.0` (or a specific interface IP) — and only do that on a trusted network.
- **CORS:** deny-all by default. No `Access-Control-Allow-Origin` header is emitted at all unless you set `TOAST_CORS_ORIGINS` to a comma-separated allow-list. The bundled same-origin `/apps` UI is unaffected, because same-origin requests do not use CORS.
- **`/health`:** returns only `{ "status": "ok" }` — no service name or version string, so anonymous probes learn only that the process is alive.

To opt into LAN exposure with a specific browser origin allowed:

```bash
TOAST_MCP_MODE=http \
TOAST_MCP_PORT=3000 \
TOAST_MCP_HOST=0.0.0.0 \
TOAST_CORS_ORIGINS="https://your-trusted-app.example" \
node dist/main.js
```

The startup log line names the resolved host so the binding is visible at a glance. See `docs/adr/ADR-0004-http-transport-hardening.md` for the full rationale (mitigates RISK-003, RISK-004, RISK-005).

## Upgrading

- Patch and minor versions: `git pull && npm install && npm run build`
- Major versions: review the `CHANGELOG.md` (added in Track 2 M5) for breaking changes
- The auto-harness submodule pointer (`.harness`) updates with the project; do not pull it manually unless you understand the harness contract

## Backup and disaster recovery

This server is **stateless**. There is nothing to back up. All state lives in Toast itself; if the server dies, restart it.

## Security disclosure

Found a security issue? Open a GitHub Security Advisory (private), not a public issue. Until Track 2 M5 ships a formal `SECURITY.md`, treat the maintainer email at `nate@bdits.io` as the disclosure channel.

## Known risks (do not deploy in production without reading)

See `docs/mcp/risk-register.md` — 5 open risks as of 2026-05-31, 1 of which is high-severity (RISK-003, HTTP `0.0.0.0` bind — design accepted in ADR-0004, implementation pending). Track 3 is the mitigation path; until it fully ships, this server should run only in trusted environments against sandbox credentials.
