<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Self-Hosting Guide — Toast MCP Server (hardened fork)

> **Status note (2026-05-28):** This guide describes the *current state* of the hardened-fork in-development. The v0 OSS release ships after Track 3 (security refactor) and Track 2 (release scaffolding) complete. Until then, the install paths below mirror upstream but inherit upstream's known risks — see `docs/mcp/risk-register.md`.

## Prerequisites

- Node.js 20.x or later
- A Toast partner account with API credentials (`TOAST_CLIENT_ID`, `TOAST_CLIENT_SECRET`) and a target restaurant GUID (`TOAST_RESTAURANT_GUID`)
- Either Claude Desktop, Claude Code, or another MCP-compatible client

## Installation (development, current state)

```bash
git clone https://github.com/unclenate/toast-mcp-2026-complete
cd toast-mcp-2026-complete
git submodule update --init --recursive
npm install
npm run build
```

## Configuration

Set the following environment variables (e.g., in a local `.env` file for development; in Claude Desktop config for production use):

- `TOAST_CLIENT_ID` — your Toast partner client id (placeholder until set)
- `TOAST_CLIENT_SECRET` — your Toast partner client secret (placeholder until set)
- `TOAST_RESTAURANT_GUID` — target restaurant GUID (placeholder until set)
- `TOAST_ENVIRONMENT` — `sandbox` or `production`
- `TOAST_READ_ONLY` — `true` (default in v0); opt-in to writes once Track 3 lands

**Never commit any of these values.** They are credential-grade. See `docs/operating-principles.md` principle 2.

## Running

### stdio mode (Claude Desktop / Claude Code)

Add an entry to your `claude_desktop_config.json` under `mcpServers` named `toast`. The `command` is `node`, `args` is a one-element array pointing at the absolute path of `dist/main.js`, and `env` holds your Toast credentials in placeholder form — never substitute real credential values into a tracked file.

### HTTP mode

Not recommended in v0. The current `0.0.0.0` default bind (RISK-003) and wildcard CORS (RISK-004) make this unsuitable for production. Track 3 M4 changes the defaults.

## Upgrading

- Patch and minor versions: `git pull && npm install && npm run build`
- Major versions: review the `CHANGELOG.md` (added in Track 2 M5) for breaking changes
- The auto-harness submodule pointer (`.harness`) updates with the project; do not pull it manually unless you understand the harness contract

## Backup and disaster recovery

This server is **stateless**. There is nothing to back up. All state lives in Toast itself; if the server dies, restart it.

## Security disclosure

Found a security issue? Open a GitHub Security Advisory (private), not a public issue. Until Track 2 M5 ships a formal `SECURITY.md`, treat the maintainer email at `nate@bdits.io` as the disclosure channel.

## Known risks (do not deploy in production without reading)

See `docs/mcp/risk-register.md` — 8 open risks as of 2026-05-28, 3 of which are high-severity. Track 3 is the mitigation path; until that ships, this server should run only in trusted environments against sandbox credentials.
