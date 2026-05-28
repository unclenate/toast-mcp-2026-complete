<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Scope Plan — Toast MCP Server (hardened fork)

## In scope (this fork)

- Security-hardened drop-in for `@busybee3333/toast-mcp-server`
- Producer-side MCP server in TypeScript exposing Toast Restaurant POS data
- OAuth 2.0 client-credentials flow against Toast Web Services API
- stdio transport for Claude Desktop / Claude Code, HTTP transport for hosted scenarios
- 55 read tools across cash, payments, orders, employees, items, configuration, inventory
- 21 write tools, default-off in v0; opt-in via `TOAST_READ_ONLY=false` after Track 3 lands the env-flag-gated registration path
- Auto-harness governance throughout

## Out of scope (this fork)

- Toast Online Ordering, Toast Capital, Toast Loyalty, Toast Marketing — not supported by upstream and not in scope here
- Multi-tenant hosting infrastructure
- A Toast OAuth UI / token-exchange flow for end users
- Real-time POS event subscriptions (Toast doesn't expose them via Web Services)
- Webhook receivers
- Persistent state (this server is stateless)

## Owners

- **Primary:** @unclenate
- **Secondary:** (none — solo maintainer; escalate via GitHub Issues)

## Release intent

- **v0.x** — read-only OSS release after Track 3 lands input bounds, host binding fix, CORS lock-down
- **v1.0** — write-tool gating proven in production deployment; SECURITY.md + provenance + CHANGELOG complete

## Dependencies

See `docs/project/dependency-log.md`.
