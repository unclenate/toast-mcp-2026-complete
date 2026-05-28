<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Toast-MCP Harness Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap auto-harness governance on `toast-mcp-2026-complete` using composition `mcp-server-typescript-oss` (Phase B of the design spec at `docs/superpowers/specs/2026-05-27-harness-bootstrap-design.md`).

**Architecture:** Run `install.sh` from the merged-Phase-A `.harness@4647a5f` submodule, then fill 15 required artifacts with project-specific content sourced from the 2026-05-27 security audit and source-tree inspection. Single commit at end on a feature branch, self-PR, admin-merge.

**Tech Stack:** Bash 4+ (via Homebrew on macOS), the auto-harness validator chain (manifest, module-graph, required-artifacts, placeholders, agent-pack, doc-references), git, gh CLI.

**Trust tier policy (from spec §3.1):**
- Tier 3 (commit + push + PR) on `docs/`, root governance files, `.gitmodules`, `.harness` submodule pointer
- Tier 2 (workspace edits only, **no autonomous git writes**) on `src/`
- Do not modify `src/` during this plan

**Working directory for all steps:** `/Users/unclenate/toast-mcp-2026-complete` unless explicitly stated otherwise. Each command block specifies its `cwd` when ambiguous.

---

## Task 1: Pre-flight verification

**Files:** (no writes)

- [ ] **Step 1: Verify `.harness` submodule SHA**

```bash
cd /Users/unclenate/toast-mcp-2026-complete
git -C .harness rev-parse HEAD
```

Expected output: `4647a5f5821af42fe3b56b97368460cb09f1457a`

If the SHA differs, stop. Either we drifted post-spec or someone pulled. Reconcile before proceeding.

- [ ] **Step 2: Verify clean greenfield**

```bash
ls -la CLAUDE.md AGENTS.md HARNESS.md .claude/ 2>&1
```

Expected output: every entry reports "No such file or directory". If any exists, stop — the install will treat them as foreign files and skip them, leaving you in a broken half-state. Reconcile first.

- [ ] **Step 3: Verify Bash 4+ is available**

```bash
/opt/homebrew/bin/bash --version 2>&1 | head -1
```

Expected: a version string starting with `GNU bash, version 4.` or higher (5.x is common). If Apple Silicon path isn't right, try `/usr/local/bin/bash --version`. If neither exists, run `brew install bash` first.

- [ ] **Step 4: Verify required templates exist**

```bash
ls .harness/platform/templates/operating-principles.md \
   .harness/platform/templates/adr.md \
   .harness/platform/templates/deployment/self-hosting-guide.md \
   .harness/platform/templates/mcp/server-spec.md \
   .harness/platform/templates/mcp/tool-registry.md \
   .harness/platform/templates/mcp/risk-register.md \
   .harness/platform/templates/project/scope-plan.md \
   .harness/platform/templates/project/dependency-log.md \
   .harness/platform/templates/project/milestones.md \
   .harness/platform/templates/project/change-log.md \
   .harness/platform/templates/project/revision-tracker.md \
   .harness/platform/templates/knowledge/README.md \
   .harness/platform/templates/knowledge/shared-observations.md \
   2>&1 | grep -v "No such" | wc -l
```

Expected: `13` (every template exists). If any missing, stop and reconcile.

- [ ] **Step 5: Cut feature branch**

```bash
git checkout -b feature/harness-bootstrap
git status --short
```

Expected: `A  .gitmodules`, `AM .harness`, `??  docs/` (with the spec inside).

---

## Task 2: Install dry-run

**Files:** (none yet — inspection only)

- [ ] **Step 1: Run install.sh in dry-run mode**

```bash
/opt/homebrew/bin/bash .harness/platform/bootstrap/install.sh \
  --composition mcp-server-typescript-oss \
  --skills harness-governance,harness-onboarding,harness-mcp \
  --dry-run 2>&1 | tee /tmp/install-dryrun.txt
```

Expected: a report of files that would be created. No file changes on disk. Exit code 0.

- [ ] **Step 2: Inspect the file plan**

```bash
grep -E "^(WOULD CREATE|WOULD MERGE|WOULD SKIP|WOULD LINK)" /tmp/install-dryrun.txt
```

You should see:
- `WOULD CREATE` for `harness.manifest.yaml`, `HARNESS.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`
- `WOULD LINK` for three skills under `.agents/skills/` and `.claude/skills/`

If you see `WOULD SKIP` against anything kernel-related, that means a foreign file was detected — go back to Task 1 Step 2.

- [ ] **Step 3: Inspect manifest-target shape**

```bash
grep -A 5 "WOULD CREATE harness.manifest.yaml" /tmp/install-dryrun.txt
```

Note the project block defaults. We'll customize it in Task 3 Step 3.

---

## Task 3: Install for real and customize manifest

**Files:**
- Create: `harness.manifest.yaml`
- Create: `HARNESS.md`, `AGENTS.md`, `CLAUDE.md`
- Create: `.claude/settings.json`
- Create: `.agents/skills/` and `.claude/skills/` (symlinks)

- [ ] **Step 1: Run install.sh for real**

```bash
/opt/homebrew/bin/bash .harness/platform/bootstrap/install.sh \
  --composition mcp-server-typescript-oss \
  --skills harness-governance,harness-onboarding,harness-mcp 2>&1 | tee /tmp/install-real.txt
```

Expected: exit code 0. The same set of `CREATE`/`LINK` actions reported, this time effected.

- [ ] **Step 2: Verify the files were created**

```bash
ls -la harness.manifest.yaml HARNESS.md AGENTS.md CLAUDE.md .claude/settings.json
ls -la .agents/skills/ .claude/skills/ 2>&1
```

Expected: every file exists and is non-empty. Skills directories contain three symlink entries each pointing into `.harness/platform/skills/`.

- [ ] **Step 3: Edit `harness.manifest.yaml` project block**

Open `harness.manifest.yaml` and replace the `project:` block with:

```yaml
project:
  id: toast-mcp-2026
  name: Toast MCP Server (hardened fork)
  maturity: prototype
  criticality: medium
```

Leave the `modules:` and `overrides:` blocks untouched.

- [ ] **Step 4: Validate the manifest immediately**

```bash
bash .harness/platform/validators/validate-manifest.sh harness.manifest.yaml
bash .harness/platform/validators/validate-module-graph.sh harness.manifest.yaml
```

Expected: both pass.

---

## Task 4: Customize root `CLAUDE.md` with explicit load order

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace `CLAUDE.md` body**

Overwrite the entire file with this content:

```markdown
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
```

- [ ] **Step 2: Verify no placeholder tokens**

```bash
grep -c "\[\[" CLAUDE.md
```

Expected: `0`.

---

## Task 5: Customize `HARNESS.md` for this project

**Files:**
- Modify: `HARNESS.md`

- [ ] **Step 1: Read what install.sh produced**

```bash
cat HARNESS.md
```

Note the structure — it should already declare active modules. We'll keep most of it but add project-specific sections.

- [ ] **Step 2: Append project-specific sections**

Append (don't replace) these sections at the end of `HARNESS.md`:

```markdown

---

## Required Artifacts (this project)

| Module | Artifact | Status |
| ------ | -------- | ------ |
| kernel/base | `HARNESS.md` | this file |
| kernel/base | `AGENTS.md` | created |
| kernel/base | `docs/operating-principles.md` | created in Task 7 |
| architectures/mcp-server | `docs/mcp/server-spec.md` | created in Task 15 |
| architectures/mcp-server | `docs/mcp/tool-registry.md` | created in Task 16 |
| architectures/mcp-server | `docs/mcp/risk-register.md` | created in Task 17 |
| delivery/self-hosted-oss | `docs/deployment/self-hosting-guide.md` | created in Task 18 |
| management/project-standard | `docs/project/scope-plan.md` | created in Task 8 |
| management/project-standard | `docs/project/dependency-log.md` | created in Task 9 |
| management/project-standard | `docs/project/milestones.md` | created in Task 10 |
| management/project-standard | `docs/project/change-log.md` | created in Task 11 |
| management/project-standard | `docs/project/revision-tracker.md` | created in Task 12 |
| management/knowledge-capture | `docs/knowledge/README.md` | created in Task 13 |
| management/knowledge-capture | `docs/knowledge/shared-observations.md` | created in Task 14 |
| agents/claude-code | `CLAUDE.md` | this repo's root CLAUDE.md |
| agents/claude-code | `.claude/settings.json` | created |

## Trust-Tier Policy (this project)

- Tier 2 on `src/` (no autonomous git writes)
- Tier 3 on `docs/` and root governance files
- See `CLAUDE.md` for full statement

## Stop Conditions

Do not modify `src/` without explicit user direction. Source security refactor is **Track 3** and gated by per-change ADRs (read-only mode flag, input bounds, host binding, CORS, write-tool gating).

## Pointer Files

- Active risks: `docs/mcp/risk-register.md`
- Architecture decisions: `docs/adr/`
- Fork rationale: `docs/adr/ADR-0001-security-hardened-fork.md`
```

- [ ] **Step 3: Verify no placeholder tokens**

```bash
grep -c "\[\[" HARNESS.md
```

Expected: `0`.

---

## Task 6: Customize `AGENTS.md` with project-specific addenda

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Append project-specific section**

Append this section at the end of `AGENTS.md`:

```markdown

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
```

- [ ] **Step 2: Verify**

```bash
grep -c "\[\[" AGENTS.md
```

Expected: `0`.

---

## Task 7: Fill `docs/operating-principles.md`

**Files:**
- Create: `docs/operating-principles.md`

- [ ] **Step 1: Inspect the template**

```bash
cat .harness/platform/templates/operating-principles.md
```

Note the placeholder tokens (the `[[...]]` pattern) used in the template body.

- [ ] **Step 2: Write the filled file**

Create `docs/operating-principles.md` with this content (copy-paste verbatim):

```markdown
<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Operating Principles — Toast MCP Server (hardened fork)

These principles describe how this project is built and evolved. They extend the kernel doctrine in `.harness/platform/core/kernel/base/doctrine.md` with five project-specific principles.

## 1. Read-only by default in v0

Until Track 3 lands an env-flag-gated write surface, the v0 OSS release ships only the 55 read tools (and even then, write registration in code remains conditional on the flag — never on a partial guard). The 21 write tools may still exist in source but must not be registered with the MCP server when `TOAST_READ_ONLY=true` (the default).

**Why:** The 2026-05-27 audit established that the upstream `busybee3333/toast-mcp-server` registers all 21 write tools unconditionally (RISK-006). For Yoko's and any downstream consumer, the safe default is read-only; opt-in writes are an explicit per-deployment risk acceptance.

**Where this lives:** `src/server.ts:77-98` (registration logic), Track 3 ADR defines the flag and gating semantics.

## 2. Credential locality

`TOAST_CLIENT_SECRET` and `TOAST_RESTAURANT_GUID` arrive at the process only via env vars. No config files, no plaintext in `claude_desktop_config.json` recommendations in `README.md`. No logging of credential values, including in error paths.

**Why:** Toast OAuth client credentials grant full access to the restaurant's POS data. Any tracked-file leak is unrecoverable (rotate-only mitigation). The upstream README steers users to embed `TOAST_CLIENT_SECRET` in their Claude Desktop config plaintext — we keep the same env-var shape but mark the README placeholder explicit.

**Where this lives:** `src/clients/toast.ts:77-94` (the only place credentials are sent), `README.md` install section.

## 3. Input bounds at the Zod boundary

Monetary fields are `z.number().int().positive().max(N)`. There is no unbounded `z.number()` for money in any new payment or cash tool. The bound `N` is `100_000_00` (one hundred thousand dollars, in cents) unless a deployment overrides it via env config — sized to comfortably exceed any legitimate single-check value while bounding worst-case prompt-injection abuse.

**Why:** RISK-001 and RISK-002 from the 2026-05-27 audit: unbounded `refundAmount` (`src/tools/payments.ts:60`) and unbounded cash entries (`src/tools/cash.ts:77,181`). The fix lives in the schema layer where it's structurally enforced by Zod's runtime validation, not in a separate "validate" function that could be bypassed.

**Where this lives:** `src/tools/payments.ts`, `src/tools/cash.ts`. Any new monetary tool follows the same pattern.

## 4. Outbound base URL is hardcoded

The existing `src/clients/toast.ts:19-22` discipline — `ws-api.toasttab.com` (prod) or `ws-sandbox-api.eng.toasttab.com` (sandbox) selected by `TOAST_ENVIRONMENT` — is canonical. The base URL is never derived from env, request input, or any other dynamic source. Any change to this discipline requires an ADR.

**Why:** This is the defense against credential exfiltration via prompt injection. An attacker who can inject tool-call arguments cannot redirect the outbound API call to their own endpoint as long as the base URL is structurally pinned in source.

**Where this lives:** `src/clients/toast.ts:19-22`.

## 5. No `eval`, no `child_process`, no dynamic require

The current source has none of these (verified via grep during audit). This principle codifies that as a hard rule. Any future addition requires an ADR.

**Why:** These three are the standard remote-code-execution gateways for MCP servers that process LLM-controlled input. Their absence today is what makes the server safe to host even with the auth surface concerns we're addressing in Tracks 2/3.

**Where this lives:** all of `src/`. Verify with `grep -rE "eval\(|child_process|require\(.*\)" src/` — must return no matches.
```

- [ ] **Step 3: Verify no placeholders remain**

```bash
grep -c "\[\[" docs/operating-principles.md
```

Expected: `0`.

---

## Task 8: Fill `docs/project/scope-plan.md`

**Files:**
- Create: `docs/project/scope-plan.md`

- [ ] **Step 1: Inspect the template**

```bash
cat .harness/platform/templates/project/scope-plan.md
```

Note the placeholder tokens.

- [ ] **Step 2: Write the filled file**

```markdown
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
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/project/scope-plan.md
```

Expected: `0`.

---

## Task 9: Fill `docs/project/dependency-log.md`

**Files:**
- Create: `docs/project/dependency-log.md`

- [ ] **Step 1: Inspect the template, then pull versions from package.json**

```bash
cat .harness/platform/templates/project/dependency-log.md
echo "---"
cat package.json | grep -E '"(@?[a-z]+)":\s*"\^?[0-9]' | head -20
```

- [ ] **Step 2: Write the filled file**

```markdown
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
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/project/dependency-log.md
```

Expected: `0`.

---

## Task 10: Fill `docs/project/milestones.md`

**Files:**
- Create: `docs/project/milestones.md`

- [ ] **Step 1: Write the filled file**

```markdown
<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Milestones — Toast MCP Server (hardened fork)

| ID | Milestone | Target | Status | Track |
| -- | --------- | ------ | ------ | ----- |
| M1 | Harness bootstrap complete (Phase B) | 2026-05-28 | in progress | Track 1 |
| M2 | Read-only mode env flag (`TOAST_READ_ONLY=true` default) gates all 21 write tools at `src/server.ts:77-98` | 2026-06-15 | pending | Track 3 |
| M3 | Monetary input bounds (`z.number().int().positive().max(N)`) on `refundAmount`, cash `amount`, and any other unbounded number | 2026-06-15 | pending | Track 3 |
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
```

- [ ] **Step 2: Verify**

```bash
grep -c "\[\[" docs/project/milestones.md
```

Expected: `0`.

---

## Task 11: Fill `docs/project/change-log.md`

**Files:**
- Create: `docs/project/change-log.md`

- [ ] **Step 1: Write the filled file**

```markdown
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
```

- [ ] **Step 2: Verify**

```bash
grep -c "\[\[" docs/project/change-log.md
```

Expected: `0`.

---

## Task 12: Fill `docs/project/revision-tracker.md`

**Files:**
- Create: `docs/project/revision-tracker.md`

- [ ] **Step 1: Inspect template**

```bash
cat .harness/platform/templates/project/revision-tracker.md
```

The revision tracker captures revision-level decisions (mid-flight changes to scope, plan, or technical direction that don't rise to ADR severity but should be auditable).

- [ ] **Step 2: Write the filled file**

```markdown
<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Revision Tracker — Toast MCP Server (hardened fork)

Records revision-level decisions: mid-flight changes too small to warrant an ADR but significant enough to need an audit trail.

## How to read this

Each row captures: when the decision was made, what changed, what artifacts were affected, and why we didn't escalate to an ADR. If an entry feels architecturally significant in hindsight, promote it to an ADR retroactively (and leave a row here linking to it).

## Entries

| Date | Revision | Affected artifacts | ADR-escalation rationale |
| ---- | -------- | ------------------ | ------------------------ |
| _(none yet)_ | | | |
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/project/revision-tracker.md
```

Expected: `0`.

---

## Task 13: Fill `docs/knowledge/README.md`

**Files:**
- Create: `docs/knowledge/README.md`

- [ ] **Step 1: Inspect the template**

```bash
cat .harness/platform/templates/knowledge/README.md
```

The knowledge module defines an "Observation Structure" choice (per-entry vs per-day vs per-thread). For a solo-maintainer fork with sporadic audit events, **per-entry** is appropriate.

- [ ] **Step 2: Write the filled file**

```markdown
<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Knowledge Capture — Toast MCP Server

## Observation Structure choice: per-entry

Each shared observation is a single entry in `shared-observations.md` with structured fields (date, severity, source, body, escalation). This fits a sporadic-audit-event project with one maintainer; if observations become high-frequency (multiple per week), revisit and migrate to per-day.

## Write policy

- Any audit, security review, or significant architectural surprise produces a row in `shared-observations.md`
- Companion rule: each row must be paired with either a daily-memory log entry or a `docs/project/change-log.md` row in the same commit (auto-harness's knowledge-capture module enforces this via `validate-companions.sh`)
- Higher-severity observations escalate per the table below

## Escalation table

| Severity | Required additional artifact |
| -------- | ---------------------------- |
| informational | none |
| low | none (single row is sufficient) |
| medium | `docs/project/change-log.md` entry referencing this observation |
| high | `docs/adr/` ADR + `docs/mcp/risk-register.md` row in the same commit |
| critical | All of the above + security disclosure check (no public ADR until rotation/mitigation lands) |

## Cadences

- Solo maintainer: no scheduled cadence; observations land event-driven
- If contributors join, revisit and set a weekly review cadence here

## Distilled learnings

Distilled learnings (cross-observation patterns) live in `docs/knowledge/distilled-learnings.md` if/when they accumulate. Not required for v0 — populate only when there's enough material to distill.
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/knowledge/README.md
```

Expected: `0`.

---

## Task 14: Fill `docs/knowledge/shared-observations.md`

**Files:**
- Create: `docs/knowledge/shared-observations.md`

- [ ] **Step 1: Write the filled file**

```markdown
<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Shared Observations — Toast MCP Server

Per-entry structure. Each observation is one section below.

---

## OBS-001 — 2026-05-27 — high — Unbounded `refundAmount` on `toast_refund_payment`

**Source:** 2026-05-27 source audit (independent verification of `docs/toast_mcp_security_assessment.docx`)
**Evidence:** `src/tools/payments.ts:60` — `refundAmount: z.number()` with no `.positive()`, `.int()`, `.max()` modifiers.
**Impact:** A prompt-injection or hostile-tool-call scenario could submit arbitrary refund amounts (including negative or absurdly large), routed straight to Toast's `/orders/v2/payments/{guid}/refund` endpoint.
**Escalation applied:** ADR-0001 + `docs/mcp/risk-register.md` RISK-001 + this row.

---

## OBS-002 — 2026-05-27 — high — Cash entries with unbounded `amount`

**Source:** 2026-05-27 source audit
**Evidence:** `src/tools/cash.ts:77` (PAID_IN/PAID_OUT entries), `src/tools/cash.ts:181` (cash deposits).
**Impact:** Same shape as OBS-001 — unbounded monetary write on a stateful POS resource. Cash deposits cannot be voided without a paper trail.
**Escalation applied:** ADR-0001 + risk-register RISK-002 + this row.

---

## OBS-003 — 2026-05-27 — high — HTTP server binds 0.0.0.0 by default

**Source:** 2026-05-27 source audit (correction to `.docx` assessment which assumed localhost)
**Evidence:** `src/main.ts:105` — `app.listen(port, () => {...})` with no host argument, which defaults to `0.0.0.0/::`.
**Impact:** When run in HTTP mode on any machine with a routable IP, the server is exposed to the local network with no auth. A Yoko's-style on-premise deployment would expose the entire Toast tool surface to other hosts on the LAN.
**Escalation applied:** ADR-0001 + risk-register RISK-003 + this row.

---

## OBS-004 — 2026-05-27 — medium — Wildcard CORS

**Source:** 2026-05-27 source audit
**Evidence:** `src/main.ts:72` — `app.use(cors.default())` enables wildcard `Access-Control-Allow-Origin: *`.
**Impact:** Any web page in the browser can issue cross-origin requests to the local server when HTTP mode is enabled. Combined with OBS-003, this turns the local server into a network-reachable, browser-callable endpoint.
**Escalation applied:** risk-register RISK-004 + this row.

---

## OBS-005 — 2026-05-27 — medium — `/health` leaks version string

**Source:** 2026-05-27 source audit
**Evidence:** `src/main.ts:80` — `/health` endpoint returns `{ status: 'ok', version: ... }`.
**Impact:** Version disclosure narrows attacker's vulnerability search. Low blast radius (this is widely considered minor), but combined with OBS-003+OBS-004 it removes a reconnaissance friction point.
**Escalation applied:** risk-register RISK-005 + this row.

---

## OBS-006 — 2026-05-27 — medium — All 21 write tools registered unconditionally

**Source:** 2026-05-27 source audit (the `.docx` estimated "~40 write tools"; verified actual is 21 of 76)
**Evidence:** `src/server.ts:77-98` — `registerAllTools()` registers every tool in every module unconditionally. No read-only gate.
**Impact:** Default deployment exposes 21 mutating endpoints (cash, employees, items, orders, payments) to whatever can call the MCP server. For a fork targeting maintained-OSS release, default-write is the wrong posture.
**Escalation applied:** ADR-0001 + risk-register RISK-006 + this row. Track 3 milestone M2 fixes this.

---

## OBS-007 — 2026-05-27 — medium — UI files use innerHTML

**Source:** 2026-05-27 source audit
**Evidence:** `order-detail.html:85,112,132`; `order-dashboard.html:182`; `order-grid.html:59` — innerHTML assignments built from order/item fields.
**Impact:** XSS-unsafe by construction. Safe today because demo data is curated, but any future use against real Toast data exposes the UI surface to whatever content the POS records hold.
**Escalation applied:** risk-register RISK-007 + this row.

---

## OBS-008 — 2026-05-27 — low — `package.json` provenance mismatch

**Source:** 2026-05-27 source audit
**Evidence:** `package.json` `repository.url` field points at `https://github.com/BusyBee3333/mcpengine.git` — a different repo than the one the published package was built from.
**Impact:** npm provenance / SLSA-style chain-of-custody is broken at the manifest level. Track 2 fixes this when we cut our first npm release under the hardened-fork name.
**Escalation applied:** risk-register RISK-008 + this row.
```

- [ ] **Step 2: Verify**

```bash
grep -c "\[\[" docs/knowledge/shared-observations.md
```

Expected: `0`.

---

## Task 15: Fill `docs/mcp/server-spec.md`

**Files:**
- Create: `docs/mcp/server-spec.md`

- [ ] **Step 1: Inspect the template**

```bash
cat .harness/platform/templates/mcp/server-spec.md
```

Note the template's section structure.

- [ ] **Step 2: Write the filled file**

```markdown
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
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/mcp/server-spec.md
```

Expected: `0`.

---

## Task 16: Fill `docs/mcp/tool-registry.md`

**Files:**
- Create: `docs/mcp/tool-registry.md`

- [ ] **Step 1: Inspect the template**

```bash
cat .harness/platform/templates/mcp/tool-registry.md
```

- [ ] **Step 2: Write the filled file**

```markdown
<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Tool Registry — Toast MCP Server

**Total tools:** 76 (21 write/mutating, 55 read)
**Source of truth:** `src/tools/*.ts` files, registered via `src/server.ts:77-98`.

## Write tools (21) — gated read-only-by-default in v0

These tools call non-idempotent Toast endpoints (POST/PUT/PATCH/DELETE). They must not be registered when `TOAST_READ_ONLY=true` (Track 3 M2).

| Tool | Module | Toast endpoint shape | Risks |
| ---- | ------ | -------------------- | ----- |
| `toast_create_cash_entry` | cash | POST `/cashmgmt/v1/entries` | RISK-002 (unbounded amount) |
| `toast_void_cash_entry` | cash | DELETE `/cashmgmt/v1/entries/{guid}` | |
| `toast_create_cash_deposit` | cash | POST `/cashmgmt/v1/deposits` | RISK-002 (unbounded amount) |
| `toast_create_employee` | employees | POST employee | PII surface |
| `toast_update_employee` | employees | PATCH employee | PII surface |
| `toast_disable_employee` | employees | PATCH employee status | |
| `toast_update_stock_quantity` | items | PATCH inventory | |
| `toast_set_infinite_quantity` | items | PATCH inventory | |
| `toast_bulk_update_stock` | items | bulk PATCH inventory | blast radius |
| `toast_update_item_price` | items | PATCH item | menu/pricing surface |
| `toast_set_item_86` | items | PATCH item availability | |
| `toast_bulk_86_items` | items | bulk PATCH item availability | blast radius |
| `toast_create_order` | orders | POST `/orders/v2/orders` | |
| `toast_void_order` | orders | POST `/orders/v2/orders/{guid}/void` | |
| `toast_add_selections` | orders | POST line items on check | |
| `toast_void_selection` | orders | POST void selection | |
| `toast_apply_discount` | orders | POST discount on check | |
| `toast_update_order_promised_time` | orders | PATCH order | |
| `toast_add_payment` | payments | POST `/orders/v2/checks/{guid}/payments` | RISK-001 (unbounded amount via downstream) |
| `toast_refund_payment` | payments | POST `/orders/v2/payments/{guid}/refund` | **RISK-001 (unbounded `refundAmount`)** |
| `toast_void_payment` | payments | POST `/orders/v2/payments/{guid}/void` | |

## Read tools (55)

These tools call idempotent Toast endpoints (GET). Safe to register in all modes.

By module, totals:
- **cash:** 5 (`toast_list_cash_drawers`, `toast_get_cash_drawer`, `toast_list_cash_entries`, `toast_get_cash_drawer_summary`, `toast_list_cash_deposits`)
- **payments:** 3 (`toast_get_payment`, `toast_get_check_payments`, `toast_get_payment_summary`)
- **orders, employees, items, configuration, inventory, reporting:** remainder

For the canonical list, generate from source:

```bash
grep -hoE "name: '[a-z0-9_]+'" src/tools/*.ts | sort -u
```

(The list is intentionally not duplicated verbatim here because it changes when Track 3 adds gating; the regex above is the durable source of truth.)

## Tool input validation

All tools use Zod schemas registered at the `inputSchema` field. Runtime validation happens at `src/server.ts:151` via `tool.inputSchema.parse(...)`. This is real validation, not type-decoration.

**Known gaps (Track 3 fixes):**
- Monetary fields use `z.number()` without `.positive()`, `.int()`, `.max(N)` (RISK-001, RISK-002)
- Restaurant GUID is `z.string()` without UUID-shape validation — low risk, since the underlying API rejects malformed GUIDs

## Schema generation

The current implementation in `src/server.ts:107-136` is a hand-rolled, lossy Zod-to-JSON-Schema translation. For external publication of the tool schemas, swap to `zod-to-json-schema` — but for MCP wire protocol, the hand-rolled version is sufficient because the MCP SDK does its own marshalling.
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/mcp/tool-registry.md
```

Expected: `0`.

---

## Task 17: Fill `docs/mcp/risk-register.md`

**Files:**
- Create: `docs/mcp/risk-register.md`

- [ ] **Step 1: Inspect the template**

```bash
cat .harness/platform/templates/mcp/risk-register.md
```

- [ ] **Step 2: Write the filled file**

```markdown
<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# MCP Risk Register — Toast MCP Server

**Source:** 2026-05-27 security audit (`docs/toast_mcp_security_assessment.docx` + independent source examination).
**Status convention:** open / mitigated / accepted / superseded.

| ID | Severity | Status | Description | Evidence | Mitigation target | Owner |
| -- | -------- | ------ | ----------- | -------- | ----------------- | ----- |
| RISK-001 | high | open | `refundAmount` on `toast_refund_payment` is `z.number()` with no `.positive()`, `.int()`, `.max()` modifiers — unbounded monetary write. | `src/tools/payments.ts:60` | Track 3 M3 (input bounds at Zod boundary, per operating principle 3) | @unclenate |
| RISK-002 | high | open | Cash entries have unbounded `amount` (PAID_IN/PAID_OUT and cash deposits both affected). | `src/tools/cash.ts:77` and `src/tools/cash.ts:181` | Track 3 M3 | @unclenate |
| RISK-003 | high | open | HTTP server binds `0.0.0.0` by default (audit said "localhost"; actual is the wildcard interface). Exposes server to LAN. | `src/main.ts:105` — `app.listen(port, () => {...})` with no host arg | Track 3 M4 (default `127.0.0.1`, env opt-in to bind elsewhere) | @unclenate |
| RISK-004 | medium | open | Wildcard CORS via `cors.default()` — any browser-origin can issue cross-origin requests when HTTP transport is enabled. | `src/main.ts:72` | Track 3 M4 (explicit allow-list) | @unclenate |
| RISK-005 | medium | open | `/health` endpoint returns version string — reconnaissance disclosure. | `src/main.ts:80` | Track 3 M4 (omit version, return only `{status: 'ok'}`) | @unclenate |
| RISK-006 | medium | open | All 21 write tools registered unconditionally — no read-only mode. Audit estimated "~40 write tools"; verified actual = 21 of 76. | `src/server.ts:77-98` (`registerAllTools()`) | Track 3 M2 (env-flag-gated registration; `TOAST_READ_ONLY=true` default) | @unclenate |
| RISK-007 | medium | open | UI files use `innerHTML` built from order/item fields — XSS-unsafe by construction. Safe today (demo data), unsafe by design. | `order-detail.html:85,112,132`; `order-dashboard.html:182`; `order-grid.html:59` | Track 3 (replace with `textContent` or sanitized template) | @unclenate |
| RISK-008 | low | open | `package.json` `repository.url` points at `BusyBee3333/mcpengine` — provenance mismatch with the published package. | `package.json` | Track 2 (npm provenance + repo URL fix at first hardened release) | @unclenate |

## Companion-rule note

Per the auto-harness knowledge-capture module: each `high` severity risk has a paired entry in `docs/knowledge/shared-observations.md` (OBS-001..OBS-006) plus ADR-0001 mentions. Each `medium` and `low` has a paired observation row. The escalation table in `docs/knowledge/README.md` defines the policy.

## Active risks summary

- 3 high, 4 medium, 1 low — all open as of 2026-05-28
- All targeted for resolution in Track 3 (M2, M3, M4) or Track 2 (M5, M6)
- None require security disclosure handling (no credentials leaked, no production users yet)
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/mcp/risk-register.md
```

Expected: `0`.

---

## Task 18: Fill `docs/deployment/self-hosting-guide.md`

**Files:**
- Create: `docs/deployment/self-hosting-guide.md`

- [ ] **Step 1: Inspect the template**

```bash
cat .harness/platform/templates/deployment/self-hosting-guide.md
```

- [ ] **Step 2: Write the filled file**

```markdown
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

Set the following environment variables (e.g., in `.env` for local development; in Claude Desktop config for production use):

```bash
TOAST_CLIENT_ID=<your-toast-partner-client-id>
TOAST_CLIENT_SECRET=<your-toast-partner-client-secret>
TOAST_RESTAURANT_GUID=<target-restaurant-guid>
TOAST_ENVIRONMENT=sandbox    # or 'production'
TOAST_READ_ONLY=true         # default in v0; opt-in to writes once Track 3 lands
```

**Never commit any of these values.** They are credential-grade. See `docs/operating-principles.md` principle 2.

## Running

### stdio mode (Claude Desktop / Claude Code)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "toast": {
      "command": "node",
      "args": ["/absolute/path/to/toast-mcp-2026-complete/dist/main.js"],
      "env": {
        "TOAST_CLIENT_ID": "your-client-id",
        "TOAST_CLIENT_SECRET": "your-client-secret",
        "TOAST_RESTAURANT_GUID": "your-restaurant-guid",
        "TOAST_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

(The placeholder strings are literal — do not paste real credentials into your Claude Desktop config if you ever sync that config to any device or service.)

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
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/deployment/self-hosting-guide.md
```

Expected: `0`.

---

## Task 19: Write ADR-0001

**Files:**
- Create: `docs/adr/ADR-0001-security-hardened-fork.md`

- [ ] **Step 1: Inspect the template**

```bash
cat .harness/platform/templates/adr.md
```

Note the placeholder tokens — every ADR uses the same shape.

- [ ] **Step 2: Write the filled file**

```markdown
<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# ADR-0001: Security-Hardened Fork of `@busybee3333/toast-mcp-server`

**Status:** Accepted
**Date:** 2026-05-28
**Author:** @unclenate

## Context

`@busybee3333/toast-mcp-server` is the original npm-published MCP server for Toast Restaurant POS. As of the 2026-05-27 audit, it has the following posture issues that make it unsuitable for production use without modification:

1. **Provenance mismatch** — `package.json` `repository.url` points at `BusyBee3333/mcpengine`, a different repo than where the package lives. (RISK-008)
2. **No `SECURITY.md`, no disclosure policy.**
3. **All 21 write tools registered unconditionally** at `src/server.ts:77-98` — no read-only mode. (RISK-006)
4. **Unbounded monetary fields** at the Zod schema layer:
   - `refundAmount` on `toast_refund_payment` (`src/tools/payments.ts:60`) — RISK-001
   - Cash entry / cash deposit `amount` (`src/tools/cash.ts:77,181`) — RISK-002
5. **HTTP server binds `0.0.0.0`** by default (`src/main.ts:105`) — RISK-003
6. **Wildcard CORS** via `cors.default()` (`src/main.ts:72`) — RISK-004
7. **`/health` leaks version string** (`src/main.ts:80`) — RISK-005
8. **UI files use `innerHTML`** built from POS fields — XSS-unsafe by construction. (RISK-007)

Plaintext-credential install pattern in the README compounds these (steers users to embed `TOAST_CLIENT_SECRET` in `claude_desktop_config.json` which is then synced via OS file-sync mechanisms).

Upstream maintainer activity is sporadic; a contributed PR addressing all eight items at once would be unlikely to land on a timeline that matches Yoko's Restaurant Group's deployment needs.

## Decision

Fork `@busybee3333/toast-mcp-server` into `unclenate/toast-mcp-2026-complete` and:

1. **Govern under auto-harness** using composition `mcp-server-typescript-oss` (the composition itself was contributed upstream as auto-harness PR #73)
2. **Address the eight risks** under separate ADRs per the Track 3 plan (`docs/project/milestones.md` M2/M3/M4)
3. **Re-publish to npm under a different package name** at v0.x once Track 3 lands and Track 2 ships release scaffolding (M5/M6)
4. **Retain the option** to contribute the fixes back as upstream PRs once they're proven in the hardened fork

## Consequences

### Positive

- Independent provenance chain (correct `repository.url`, npm provenance attestations)
- Release cadence decoupled from upstream's maintainer availability
- Yoko's and other downstream consumers gain a hardened drop-in option
- Each risk lands under its own ADR with explicit before/after — easier to audit
- `auto-harness` gets a real consumer dogfood project, surfacing framework gaps (PR #73 was driven by this need)

### Negative

- We carry the maintenance burden for the fork — security patches, dependency updates, Toast API changes
- Fork divergence makes a future upstream merge harder; we mitigate by keeping ADR-mapped changes minimal and well-documented
- Users now have two npm packages to choose from; some confusion is unavoidable until the hardened fork demonstrates clear value

### Neutral

- `src/` remains structurally similar to upstream — most ADRs add gates and bounds, not new features

## Companion satisfiers

- `docs/project/change-log.md` — 2026-05-28 row references this ADR
- `docs/mcp/risk-register.md` — RISK-001..RISK-008 reference this ADR as their authorizing record
- `docs/knowledge/shared-observations.md` — OBS-001..OBS-008 are the underlying observations

## References

- `docs/toast_mcp_security_assessment.docx` — the third-party assessment that prompted this fork
- `docs/superpowers/specs/2026-05-27-harness-bootstrap-design.md` — the design for the harness adoption
- auto-harness PR #73 — the composition contribution that enables this fork's posture
```

- [ ] **Step 3: Verify**

```bash
grep -c "\[\[" docs/adr/ADR-0001-security-hardened-fork.md
```

Expected: `0`.

---

## Task 20: Narrow `.claude/settings.json` permissions

**Files:**
- Modify: `.claude/settings.json`

- [ ] **Step 1: Inspect what install.sh produced**

```bash
cat .claude/settings.json
```

Note the permissions list and any defaults that look too broad for this repo's threat model.

- [ ] **Step 2: Decide and edit**

The auto-harness default may include broad bash allows. For this repo:

- **Allow** read-only inspection commands (`ls`, `cat`, `grep`, `find`, `git status`, `git log`, `git diff`, `gh pr view`, `gh pr checks`)
- **Allow** the auto-harness validator chain (any `bash .harness/platform/validators/validate-*.sh ...`)
- **Allow** `npm run build`, `npm install` (no run-as-root, no global installs)
- **Deny** any tool call that would touch `src/` git state without explicit user direction (Tier 2 boundary)

If `.claude/settings.json` already enforces these, leave it. If not, add `allow:` and `deny:` blocks that match. Apply the principle of least privilege.

If the file shape doesn't include a permissions section yet, append one — the schema is in `.harness/platform/agents/claude-code/`.

- [ ] **Step 3: Verify the file is valid JSON**

```bash
python3 -c "import json; json.load(open('.claude/settings.json')); print('valid')"
```

Expected: `valid`.

---

## Task 21: Run full validator chain

**Files:** (no writes — inspection only)

- [ ] **Step 1: Manifest validators**

```bash
bash .harness/platform/validators/validate-manifest.sh harness.manifest.yaml
bash .harness/platform/validators/validate-module-graph.sh harness.manifest.yaml
```

Expected: both pass.

- [ ] **Step 2: Required artifacts**

```bash
bash .harness/platform/validators/validate-required-artifacts.sh harness.manifest.yaml .
```

Expected: pass. If it lists missing files, return to the corresponding Task above.

- [ ] **Step 3: Placeholders**

```bash
bash .harness/platform/validators/validate-placeholders.sh .
```

Expected: pass. If it lists files with placeholder tokens, return to the corresponding Task above. (`docs/superpowers/specs/` and `docs/superpowers/plans/` may need a `.placeholder-ignore` entry — see Step 4.)

- [ ] **Step 4: Add `.placeholder-ignore` if needed**

If Step 3 flagged `docs/superpowers/**` (the spec and plan files), add a `.placeholder-ignore` at toast-mcp root:

```bash
cat > .placeholder-ignore <<'EOF'
docs/superpowers/specs/
docs/superpowers/plans/
EOF
```

Then re-run Step 3 to confirm it now passes.

- [ ] **Step 5: Agent pack**

```bash
bash .harness/platform/validators/validate-agent-pack.sh harness.manifest.yaml .
```

Expected: pass.

- [ ] **Step 6: Doc references**

```bash
bash .harness/platform/validators/validate-doc-references.sh .
```

Expected: pass. If it flags broken markdown links, return to the file with the bad link and fix.

- [ ] **Step 7: Confirm `src/` is untouched**

```bash
git diff --stat HEAD -- src/
```

Expected: no output (no changes to `src/`). If there are any changes, stop — Tier 2 boundary violated. Reconcile (likely you accidentally modified a tool file when grepping; restore with `git checkout HEAD -- src/`).

---

## Task 22: Commit, push, open PR, merge

**Files:**
- Commit: all Phase B artifacts as a single commit

- [ ] **Step 1: Stage everything**

```bash
git add .gitmodules .harness \
        harness.manifest.yaml HARNESS.md AGENTS.md CLAUDE.md \
        .claude/ .agents/ \
        docs/operating-principles.md \
        docs/mcp/ docs/deployment/ docs/project/ docs/knowledge/ \
        docs/adr/ docs/superpowers/ \
        .placeholder-ignore 2>/dev/null || true

git status --short
```

Verify the staged set:
- `A  .gitmodules`
- `A  .harness` (or similar — the submodule pointer)
- `A  harness.manifest.yaml`, `HARNESS.md`, `AGENTS.md`, `CLAUDE.md`
- `A` on every file under `docs/` we created
- `A  .claude/settings.json` (and optionally hooks)

No `M` or `A` against any `src/` path.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(governance): adopt auto-harness under mcp-server-typescript-oss

Pins .harness submodule at 4647a5f; manifest declares kernel/base +
node-typescript + mcp-server + self-hosted-oss + project-standard +
knowledge-capture + agents/{base,claude-code}. Kernel artifacts seeded;
ADR-0001 records fork rationale; risk register seeded with 8 findings
from 2026-05-27 audit.

src/ left untouched — Track 3 will land the security refactor under
separate ADRs (read-only mode flag, input bounds, host binding, CORS,
write-tool gating, version-string disclosure).

Companion to design spec at docs/superpowers/specs/2026-05-27-harness-bootstrap-design.md
and implementation plan at docs/superpowers/plans/2026-05-27-harness-bootstrap-plan.md.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Push the feature branch**

```bash
git push -u origin feature/harness-bootstrap
```

- [ ] **Step 4: Open self-PR**

```bash
gh pr create --base main --head feature/harness-bootstrap \
  --title "feat(governance): adopt auto-harness under mcp-server-typescript-oss" \
  --body "$(cat <<'EOF'
## Summary

Phase B of the auto-harness adoption track (Track 1). Bootstraps governance on this repo using the `mcp-server-typescript-oss` composition contributed upstream in auto-harness PR #73.

## What landed

- `.harness` submodule pinned at `4647a5f`
- `harness.manifest.yaml` declaring kernel/base + node-typescript + mcp-server + self-hosted-oss + project-standard + knowledge-capture + agents/{base,claude-code}
- Root governance triplet: `HARNESS.md`, `AGENTS.md`, `CLAUDE.md`
- `.claude/settings.json` narrowed to project-appropriate permissions
- `docs/operating-principles.md` with five project-specific principles
- `docs/mcp/{server-spec,tool-registry,risk-register}.md` — risk register seeded with 8 audit findings
- `docs/deployment/self-hosting-guide.md`
- `docs/project/{scope-plan,dependency-log,milestones,change-log,revision-tracker}.md`
- `docs/knowledge/{README,shared-observations}.md`
- `docs/adr/ADR-0001-security-hardened-fork.md`

## What did NOT land

`src/` is untouched. Track 3 will land the security refactor (read-only mode flag, input bounds, host binding fix, CORS lock-down, write-tool gating, /health version-string omission) under separate ADRs.

## Validators

All pass locally:

- [x] `validate-manifest`
- [x] `validate-module-graph`
- [x] `validate-required-artifacts`
- [x] `validate-placeholders`
- [x] `validate-agent-pack`
- [x] `validate-doc-references`

## References

- Design spec: `docs/superpowers/specs/2026-05-27-harness-bootstrap-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-27-harness-bootstrap-plan.md`
- Upstream composition PR: https://github.com/unclenate/auto-harness/pull/73

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Check PR mergeability**

```bash
gh pr view --json state,mergeable,mergeStateStatus
```

Expected: `state: OPEN`, `mergeable: MERGEABLE`. If `BLOCKED`, check branch protection and proceed to Step 6.

- [ ] **Step 6: Admin-merge**

```bash
gh pr merge --admin --squash --delete-branch
```

- [ ] **Step 7: Sync local main**

```bash
git checkout main
git pull --ff-only origin main
git log --oneline -3
```

Expected: the squash commit is the new HEAD on `main`.

- [ ] **Step 8: Final verification**

```bash
# Re-run validators one more time on main
bash .harness/platform/validators/validate-manifest.sh harness.manifest.yaml
bash .harness/platform/validators/validate-required-artifacts.sh harness.manifest.yaml .
bash .harness/platform/validators/validate-placeholders.sh .
git status --short
```

Expected: all validators pass; `git status` is clean.

---

## Done — what you have when this plan completes

- Toast MCP server is governed by auto-harness under composition `mcp-server-typescript-oss`
- 8 audit findings tracked in `docs/mcp/risk-register.md` and `docs/knowledge/shared-observations.md`
- ADR-0001 records the fork rationale
- Trust tier policy explicitly stated and enforced by root `CLAUDE.md`
- `src/` is untouched — Track 3 is the next chapter
- Single clean commit on `main` recording `.harness@4647a5f`

## What this plan does NOT do

- Does not modify `src/` — Track 3 handles that
- Does not produce a release-ready artifact — Track 2 (SECURITY.md, npm provenance, CHANGELOG, CI workflow) is separate
- Does not contribute fixes back to upstream `@busybee3333/toast-mcp-server` — optional later
