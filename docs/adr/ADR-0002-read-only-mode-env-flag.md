<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# ADR-0002: Read-Only Mode Default via `TOAST_READ_ONLY` Env Flag

**Status:** Accepted
**Date:** 2026-05-29
**Author:** @unclenate
**Milestone:** M2 (Track 3)
**Mitigates:** RISK-006

## Context

`src/server.ts:77-98` unconditionally registers all 21 write tools across 6 of 10 tool modules. There is no environment-level way to run the server in observe-only mode. For sandbox development, audit walkthroughs, and any deployment whose operator intent is read-only, the current default surface is wrong-by-default: a single Claude Desktop misconfiguration (wrong restaurant GUID, prod creds where sandbox was intended) can cause a write against real POS state.

Topology of writes — verified via `grep -nE 'client\.(post|put|patch|delete)' src/tools/*.ts` on 2026-05-28:

| Module | Write sites | Notes |
| --- | --- | --- |
| `cash.ts` | 85, 145, 187 | Cash entry, drawer delete, deposit |
| `employees.ts` | 65, 103, 121 | Create + 2 patches |
| `inventory.ts` | 44, 66, 145 | 3 patches |
| `menus.ts` | 103, 122, 242 | 3 patches |
| `orders.ts` | 91, 121, 164, 183, 203, 254 | 5 posts + 1 patch |
| `payments.ts` | 41, 66, 88 | Charge + refund + void |

Four modules (`customers.ts`, `labor.ts`, `reporting.ts`, `restaurant.ts`) are pure-read.

Mixed modules rule out module-level gating: cutting `cash.ts` entirely to gain read-only mode would also remove `toast_list_cash_drawers`, `toast_get_cash_drawer`, and `toast_list_cash_entries`, all of which are legitimate read use cases.

## Decision

1. **Per-tool `mutates` tag.** The tool record interface gains an optional field `mutates?: boolean`. Tools whose handler invokes any of `client.post`, `client.put`, `client.patch`, `client.delete` against Toast endpoints are tagged `mutates: true`. All others omit the field (default `false`).

2. **Env flag with safe default.** The server reads `process.env.TOAST_READ_ONLY` at constructor time. Parsing is strict:
   - Unset, empty, or literal `"true"` → read-only mode = true
   - Literal `"false"` → read-only mode = false
   - Any other value (`"1"`, `"yes"`, `"FALSE"`, etc.) → log a warning and default to read-only mode = true
   The strict parse prevents silent typo-acceptance; the safe default is *deny writes* unless the operator deliberately opts in.

3. **Registration loop honors the flag.** `registerAllTools()` skips any tool with `mutates: true` when read-only mode is on. The count of skipped tools is logged at startup.

4. **Startup log line.** The single `console.error` at `src/server.ts:97` is replaced with two lines: total registered tools, mode (`read-only` or `read-write`), and skipped count when applicable. Output goes to stderr per existing convention so it does not pollute the stdio MCP channel.

5. **No protocol-level mode broadcast in this ADR.** MCP does not currently have a standard capability for "read-only server"; surfacing the mode via the server name suffix (e.g. `[read-only]`) was considered and rejected for v0 because MCP clients sometimes key on the exact name. A future ADR may revisit this once MCP standardizes a capability flag.

## Consequences

### Positive

- Safe-by-default for sandbox, audit, and dev environments. Mirrors the `--dry-run`-by-default pattern from infra tooling (`terraform plan` vs `apply`, `kubectl --dry-run=client`).
- Operator opt-in to writes is explicit, auditable in the deployment env, and grep-able across configs.
- The mutation surface is now data-driven rather than scattered across import statements — easier to audit "which tools mutate Toast state" at a glance.
- Track 2 M5 release ships with a defensible safety posture out of the box.

### Negative

- 21 tool definitions across 6 files need a `mutates: true` line added (mechanical, but a real diff surface).
- One env read at startup; one Boolean branch in the registration loop. Negligible runtime cost.
- This is a **breaking change** for any existing deployment that relies on the current write-on-by-default behavior. Operators must add `TOAST_READ_ONLY=false` to retain pre-ADR behavior. Flagged for `CHANGELOG.md` (Track 2 M5).

### Neutral

- The interface change (`mutates?: boolean`) is additive. No callers of the tool registration functions need to change shape.
- Pure-read modules require zero edits.

## Implementation Notes

- The tool-record type change lives at whichever file defines the shape that every `registerXxxTools` function returns. If no shared interface exists today, this ADR also authorizes adding one (`src/types/tool.ts` or similar).
- The 21 sites to tag are enumerated in the Context table above and verifiable via the exact grep command shown there.
- Implementation lands as a single workspace edit reviewed under Tier 2 discipline (no autonomous git write to `src/`); the maintainer commits.
- Once landed, `docs/mcp/risk-register.md` updates RISK-006 row to reference this ADR as mitigation. `docs/mcp/tool-registry.md` already enumerates the 21 write tools (its top section explicitly notes "gated read-only-by-default in v0"); a follow-up Tier-3 doc commit after the implementation PR merges will add an explicit per-row `read-only mode: skipped` annotation.

## Companion Satisfiers

- `docs/mcp/risk-register.md` — RISK-006 row references this ADR as mitigation
- `docs/project/change-log.md` — 2026-05-29 row recording the acceptance
- `docs/project/milestones.md` — M2 row updated to "in progress" when implementation begins
- `docs/deployment/self-hosting-guide.md` — already references `TOAST_READ_ONLY=true` as default; semantics now backed by code

## References

- ADR-0001 — the fork rationale and RISK-006 source
- `src/server.ts:77-98` — the gating site
- `HARNESS.md` "Source-tree contract" section — codifies that this file is the read/write gating site
- `docs/mcp/risk-register.md` RISK-006 — the originating finding
