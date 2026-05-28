<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Dependency Log — Toast MCP Server

## Runtime dependencies

| Package | Version | Purpose | Pin policy |
| ------- | ------- | ------- | ---------- |
| `@modelcontextprotocol/sdk` | ^1.0.4 | MCP protocol implementation | Track upstream stable releases; pin exact in published releases |
| `axios` | ^1.7.9 | HTTP client for Toast API | Track patch updates within 1.7.x; major bumps via ADR |
| `zod` | ^3.24.1 | Runtime schema validation for tool inputs | Track minor updates within 3.x; major bumps via ADR |
| `express` | ^4.18.2 | HTTP transport server | Conservative; major bumps via ADR |
| `cors` | ^2.8.5 | CORS middleware for HTTP transport | RISK-004 mitigation lives in Track 3 (CORS lock-down ADR) |

## Dev dependencies

See `package.json` for the dev tree. Type definitions, build tools, and test harness — no security-relevant runtime impact.

## Upstream API dependency

- **Toast Web Services API** — `https://ws-api.toasttab.com` (prod), `https://ws-sandbox-api.eng.toasttab.com` (sandbox)
- API version pinning happens per-endpoint (e.g., `/cashmgmt/v1/`, `/orders/v2/`); we follow Toast's documented stable versions
- OAuth 2.0 client-credentials grant

## Update policy

- Patch updates can be applied via Dependabot or manual bump; commit message records the changelog highlight
- Minor updates require manual review and one validator-chain pass
- Major updates require an ADR with breaking-change inventory
