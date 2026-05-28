<!--
Copyright 2026 Nate DiNiro <nate@bdits.io>
SPDX-License-Identifier: MIT OR Apache-2.0
-->

# Design Spec — Toast-MCP auto-harness bootstrap (Track 1)

> Status: in-flight (Phase A merged; Phase B pending execution)
> Author: @unclenate
> Date: 2026-05-27 (drafted) / 2026-05-28 (Phase A merged)
> Project: `toast-mcp-2026-complete` — security-hardened fork of `@busybee3333/toast-mcp-server`
> Companion docs:
>   - `docs/toast_mcp_security_assessment.docx` — third-party security review (Yoko's Restaurant Group, 2026-05-27)
>   - auto-harness PR #73 (merged at SHA `b414c83`) — Phase A composition contribution
>   - auto-harness PR #74 (post-merge IA cleanup at SHA `4647a5f`) — absorbed into our submodule pointer

---

## Program context (why this exists)

The user is the **maintainer of `auto-harness`** *and* of this `toast-mcp-2026-complete` fork. The fork was created to:

1. Apply auto-harness governance to a real consumer project (dogfood the framework)
2. Harden the underlying MCP server against a 2026-05-27 security audit (8 findings beyond the audit, plus the audit's own list)
3. Release a security-hardened OSS variant since the upstream maintainer may not be active

This spec covers the **harness adoption work only** (Track 1). The security refactor of `src/` is **Track 3** and is out of scope here. The OSS release scaffolding is **Track 2** and is also out of scope.

### Three-track decomposition

| Track | Scope | Trust tier | This spec |
| ----- | ----- | ---------- | --------- |
| **1** | auto-harness composition contribution + toast-mcp harness bootstrap | Tier 3 on `docs/` and governance | **YES** (this doc) |
| **2** | OSS release scaffolding (SECURITY.md, npm provenance, CHANGELOG, CI workflow) | Tier 3 | Future spec |
| **3** | Source security refactor (read-only mode flag, input bounds, host binding, CORS, write-tool gating) | **Tier 2 on `src/`** (no autonomous git writes) | Future spec |

### Audit findings driving the work (8 beyond the .docx)

| ID | Severity | Finding | Evidence |
| -- | -------- | ------- | -------- |
| RISK-001 | high | `refundAmount` unbounded (no `.positive()`, `.int()`, `.max()`) | `src/tools/payments.ts:60` |
| RISK-002 | high | Cash entries have unbounded `amount` | `src/tools/cash.ts:77,181` |
| RISK-003 | high | HTTP server binds `0.0.0.0` (audit said "localhost") | `src/main.ts:105` |
| RISK-004 | medium | Wildcard CORS via `cors.default()` | `src/main.ts:72` |
| RISK-005 | medium | `/health` leaks version string | `src/main.ts:80` |
| RISK-006 | medium | All 21 write tools registered unconditionally (audit said "~40"; actual is 21 of 76 total) | `src/server.ts:77-98` |
| RISK-007 | medium | UI files use `innerHTML` — XSS-unsafe by construction | `order-detail.html:85,112,132`; `order-dashboard.html:182`; `order-grid.html:59` |
| RISK-008 | low | `package.json` `repository.url` provenance mismatch (points at `BusyBee3333/mcpengine`) | `package.json` |

---

## Section 1 — Cross-repo architecture

Track 1 spans **two git repositories**:

| Repo | Role | Trust scope |
| ---- | ---- | ----------- |
| `unclenate/auto-harness` (upstream) | Source of governance modules, validators, templates, skills | Maintainer-mode (we own it) |
| `unclenate/toast-mcp-2026-complete` (this repo) | Consumer: mounts auto-harness as `.harness/` submodule | Tier-2 on `src/`, Tier-3 on `docs/`/governance |

**Two phases, sequenced:**

- **Phase A — Upstream contribution:** Add a new composition `mcp-server-typescript-oss.yaml` to auto-harness. The existing `mcp-server-typescript.yaml` covers the *internal prototype* case but lacks the artifact discipline needed for a maintained OSS release. The new composition packages `delivery/self-hosted-oss + management/project-standard + management/knowledge-capture + agents/claude-code` alongside the existing `architectures/mcp-server` overlay.
- **Phase B — Consumer adoption:** Bootstrap toast-mcp using the new composition. Single commit lands `.gitmodules` + `.harness@<merge-SHA>` + all 15 required artifacts + the root governance triplet (`HARNESS.md`, `AGENTS.md`, `CLAUDE.md`).

**Submodule pointer policy:** the `.harness` submodule pointer in the toast-mcp superproject is recorded **exactly once**, in the Phase B commit, at the post-Phase-A `auto-harness:main` SHA. No intermediate bumps. As of Phase A merge + PR #74 sync, that SHA is **`4647a5f`**.

### Why a new composition and not "just configure brownfield-lite"

The existing `mcp-server-typescript.yaml` composition has `delivery/prototype + management/interview-driven + agents/base`. Composing it manually with the OSS-release modules is workable but:

1. Every consumer doing the same fork-and-harden pattern would repeat the same module list assembly
2. The compositions catalog should reflect intentional postures, not require consumers to derive them
3. The maintained-OSS posture is a distinct enough use case (npm provenance + change-log + dependency-log + distilled learnings) to deserve a first-class entry

### Cross-repo trust boundary

The auto-harness submodule auto-loads its own `.harness/CLAUDE.md` into agent context at session start (the dev-time supply-chain/injection vector identified during audit). The mitigation is **explicit load-order suppression** in the consumer's root `CLAUDE.md` (§3.7). This means: root `CLAUDE.md` is authoritative; `.harness/CLAUDE.md` is explicitly de-loaded by name; `.harness/AGENTS.md` is loaded only as a compiled fragment, never as a parallel root.

---

## Section 2 — Phase A spec (executed, merged)

**Status: ✅ Merged 2026-05-28 in auto-harness PR #73 at SHA `b414c83`.**

### 2.1 New file: `platform/compositions/mcp-server-typescript-oss.yaml`

```yaml
schemaVersion: 1
project:
  id: example-mcp-server-typescript-oss
  name: Example MCP Server (TypeScript, OSS)
  maturity: prototype
  criticality: low
modules:
  core:    [kernel/base]
  stacks:  [node-typescript]
  architectures: [mcp-server]
  delivery: [self-hosted-oss]
  management: [project-standard, knowledge-capture]
  agents:  [base, claude-code]
overrides:
  requiredArtifacts: []
  disabledValidations: []
```

### 2.2 Catalog rows added (per `validate-list-completeness.sh`)

- `platform/compositions/README.md` — row added after `mcp-server-typescript.yaml`
- root `README.md` — row added in the Starter Compositions table
- `SUMMARY.md` — bullet added in the Compositions section

### 2.3 Companion satisfier

- `docs/project/change-log.md` — Scope row dated 2026-05-28

### 2.4 Validators run on Phase A (all pass)

| Validator | Result |
| --------- | ------ |
| `validate-manifest` | ✅ |
| `validate-module-graph` | ✅ |
| `validate-list-completeness` | ✅ (163 assertions) |
| `validate-catalog-counts` | ✅ (24 assertions; compositions not count-tracked) |
| `validate-doc-references` | ✅ |
| `validate-placeholders` | ✅ |
| `validate-companions` | ✅ (post-commit, vs main) |

### 2.5 CI on PR #73

10/10 GitHub Actions checks pass: Shellcheck, Markdownlint, Bootstrap Tests × 2 OS, Self-Tests × 2 OS, Validators × 2 OS, Sample Project Validation, GitBook.

### 2.6 Merge

Admin-squash-merge of PR #73 by maintainer at commit `b414c839` on `auto-harness:main`. PR #74 (`[Wave 2a] ADR-0016`) landed shortly after and absorbed PR #73's downstream SUMMARY ripple; the local `.harness` submodule was fast-forwarded to PR #74's SHA `4647a5f` to capture that ripple in a single Phase B commit.

### 2.7 Sample project decision (no entry under `platform/examples/sample-projects/`)

`mcp-server-typescript.yaml` has no sample project either; `toast-mcp-2026-complete` itself serves as the demonstration. Keeps the contribution narrow and matches existing repo discipline.

---

## Section 3 — Phase B spec (pending execution)

### 3.1 Trust-tier reaffirmation

- **Tier 3** — `/docs`, root governance files, `.harness/` submodule pointer commits, `.gitmodules`, ADRs. Commit + push + PR-open authorized.
- **Tier 2** — all of `src/`. Workspace edits only; no autonomous git writes. The security refactor lives in Track 3.
- **`.harness/CLAUDE.md` precedence** is real and addressed in §3.7.

### 3.2 Pre-install state (verified clean)

```
toast-mcp-2026-complete/
├── .gitmodules                          # staged (.harness ↦ unclenate/auto-harness)
├── .harness/                            # submodule, working at 4647a5f
├── docs/
│   ├── toast_mcp_security_assessment.docx
│   └── superpowers/specs/2026-05-27-harness-bootstrap-design.md   # this file
├── src/                                 # untouched (Track 3 surface)
├── README.md, package.json, ...         # busybee3333 fork heritage
└── (no CLAUDE.md, AGENTS.md, HARNESS.md, .claude/ — clean greenfield)
```

### 3.3 `install.sh` invocation

```bash
/opt/homebrew/bin/bash .harness/platform/bootstrap/install.sh \
  --composition mcp-server-typescript-oss \
  --skills harness-governance,harness-onboarding,harness-mcp \
  --dry-run
```

**Run `--dry-run` first**, inspect output, then re-run without `--dry-run`.

Expected actions (per `install.sh` brownfield-safe semantics):

- **Create** `harness.manifest.yaml` at root from the composition, with the `project:` block edited:
  ```yaml
  project:
    id: toast-mcp-2026
    name: Toast MCP Server (hardened fork)
    maturity: prototype
    criticality: medium
  ```
- **Create** `HARNESS.md`, `AGENTS.md`, `CLAUDE.md` at root
- **Create** `.claude/settings.json`
- **Symlink-install** the three skills under `.agents/skills/` and `.claude/skills/`
- **No touch** to `src/`, `README.md`, or the existing `.docx`

### 3.4 Required-artifact creation (15 files)

| Artifact | Source template | Content strategy |
| -------- | --------------- | ---------------- |
| `HARNESS.md` | install.sh built-in | Auto-generated, edited per §3.5 |
| `AGENTS.md` | install.sh built-in | Auto-generated, edited per §3.5 |
| `docs/operating-principles.md` | `.harness/platform/templates/operating-principles.md` | Fill per §3.5 |
| `docs/mcp/server-spec.md` | `.harness/platform/templates/mcp/server-spec.md` | Fill from `src/server.ts` + transport modes |
| `docs/mcp/tool-registry.md` | `.harness/platform/templates/mcp/tool-registry.md` | Fill from 76 tools (21 write / 55 read) |
| `docs/mcp/risk-register.md` | `.harness/platform/templates/mcp/risk-register.md` | Fill with 8 audit findings (RISK-001..008) |
| `docs/deployment/self-hosting-guide.md` | `.harness/platform/templates/self-hosted-oss/self-hosting-guide.md` | Fill from README install steps + creds discipline |
| `docs/project/scope-plan.md` | `.harness/platform/templates/project/scope-plan.md` | Fill: fork goals (hardening, OSS release) |
| `docs/project/dependency-log.md` | `.harness/platform/templates/project/dependency-log.md` | Fill: SDK + axios + zod + express + cors versions + pinning |
| `docs/project/milestones.md` | `.harness/platform/templates/project/milestones.md` | Fill: M1 bootstrap, M2 read-only flag, M3 input bounds, M4 OSS release |
| `docs/project/change-log.md` | `.harness/platform/templates/project/change-log.md` | Initialize with Phase B entry |
| `docs/project/revision-tracker.md` | `.harness/platform/templates/project/revision-tracker.md` | Initialize empty table |
| `docs/knowledge/README.md` | `.harness/platform/templates/knowledge/README.md` | Fill: observation policy for this project |
| `docs/knowledge/shared-observations.md` | `.harness/platform/templates/knowledge/shared-observations.md` | Initialize with 8 audit observations |
| `.claude/settings.json` | install.sh built-in | Auto-generated; narrow permissions before commit |

**First Phase B action:** `ls .harness/platform/templates/` to verify the layout. If any template path is wrong, downgrade that artifact to a hand-written stub that satisfies the validator (no unresolved placeholder tokens) but is honestly marked incomplete.

### 3.5 Kernel artifact customization

**`HARNESS.md`** — declares active modules and points at source-of-truth files. Keep thin; refer everything else into `.harness/`. Must include:

- Active modules block (copy from manifest as checklist)
- Required artifacts table with link to each (mostly cross-links into `docs/`)
- Trust tier policy: **Tier 2 on `src/`, Tier 3 on `docs/` and governance**
- Stop condition: "do not modify `src/` without explicit user direction"
- Pointer to `docs/mcp/risk-register.md`

**`AGENTS.md`** — cross-agent operating manual. Project-specific additions:

- Toast OAuth credential discipline (`TOAST_CLIENT_SECRET` never in tracked files)
- Restaurant GUID handling (per-request, never hardcoded)
- Test sandbox vs prod endpoint distinction (the existing hardcoded base URLs at `src/clients/toast.ts:19-22`)

**`docs/operating-principles.md`** — five project-specific principles on top of kernel defaults:

1. **Read-only by default in v0** — until Track 3 lands env-flag-gated writes, OSS release ships only the 55 read tools
2. **Credential locality** — `TOAST_CLIENT_SECRET` and `TOAST_RESTAURANT_GUID` arrive only via env vars; no config files, no plaintext in `claude_desktop_config.json` recommendations
3. **Input bounds at the Zod boundary** — monetary fields are `z.number().int().positive().max(...)`; no unbounded `z.number()` for money
4. **Outbound base URL is hardcoded** — existing `ws-api.toasttab.com` / `ws-sandbox-api.eng.toasttab.com` at `src/clients/toast.ts:19-22` is canonical; changes require an ADR
5. **No `eval`, no `child_process`, no dynamic require** — codifies existing source discipline

### 3.6 Seed contents — ADR-0001, change-log, risk-register

**`docs/adr/ADR-0001-security-hardened-fork.md`** — sections:

- **Context** — busybee3333 posture (provenance mismatch, no SECURITY.md, write tools default-on, unbounded monetary fields, plaintext creds in setup docs)
- **Decision** — fork from busybee3333 at original commit, harden under auto-harness governance, target separate npm package name for the hardened release
- **Consequences** — independent provenance chain; release cadence decoupled; users get a hardened drop-in
- **Status** — accepted at Phase B commit time (the fork's existence IS the decision)
- **Companion** — `docs/project/change-log.md` first row + `docs/mcp/risk-register.md` first 8 entries

**`docs/project/change-log.md` initial row** —

```
| 2026-05-28 | Scope | Adopted auto-harness under composition mcp-server-typescript-oss (.harness@4647a5f). Manifest pinned, kernel artifacts created, MCP module artifacts seeded from 2026-05-27 security audit. | Phase B of fork rationale (ADR-0001). | @unclenate | ADR-0001 |
```

**`docs/mcp/risk-register.md`** — seeded with the 8 audit findings from the Program context table (RISK-001..008). Each entry: ID, severity, status (open / mitigated / accepted), description, evidence file:line, mitigation owner, Track-3 target deadline. Risk-register *existing* as a tracked file is the audit-trail satisfier; fixes ship in Track 3 ADRs.

### 3.7 `.harness/CLAUDE.md` precedence handling (mitigation for trust-boundary concern)

Root `CLAUDE.md` content must:

```markdown
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
- `.harness/HARNESS.md` — same. The active HARNESS.md is this project's root one.

## Trust tiers in this repo

- Tier 2 (workspace mutation only) on `src/` — no autonomous git writes
- Tier 3 (commit + push + PR) on `docs/` and root governance files
- Tier 4+ (env-altering / production) — require explicit human direction every time
```

This eliminates the submodule-trust-boundary ambiguity at the load-order level.

### 3.8 Validator chain (run from toast-mcp root)

```bash
bash .harness/platform/validators/validate-manifest.sh harness.manifest.yaml
bash .harness/platform/validators/validate-module-graph.sh harness.manifest.yaml
bash .harness/platform/validators/validate-required-artifacts.sh harness.manifest.yaml .
bash .harness/platform/validators/validate-placeholders.sh .
bash .harness/platform/validators/validate-agent-pack.sh harness.manifest.yaml .
bash .harness/platform/validators/validate-doc-references.sh .
```

**Failure budget:** placeholder violations are expected on first iterations. Loop: fill template → re-run placeholders → repeat until clean. Required-artifacts must pass before any commit.

### 3.9 Commit strategy

Single Phase-B commit (Tier 3). Current superproject state has `A .gitmodules` + `AM .harness` staged. Those plus all Phase-B writes go into one commit at `.harness@4647a5f`:

```
git add .gitmodules .harness \
        harness.manifest.yaml HARNESS.md AGENTS.md CLAUDE.md \
        .claude/ .agents/ \
        docs/operating-principles.md \
        docs/mcp/ docs/deployment/ docs/project/ docs/knowledge/ \
        docs/adr/ docs/superpowers/

git commit -m "feat(governance): adopt auto-harness under mcp-server-typescript-oss

Pins .harness submodule at 4647a5f; manifest declares kernel/base +
node-typescript + mcp-server + self-hosted-oss + project-standard +
knowledge-capture + agents/{base,claude-code}. Kernel artifacts seeded;
ADR-0001 records fork rationale; risk register seeded with 8 findings
from 2026-05-27 audit.

src/ left untouched — Track 3 will land the security refactor under
separate ADRs (read-only mode, input bounds, host binding, CORS, write
tool gating)."
```

Push as a feature branch and open a self-PR for the record (recommended over direct-to-main push).

### 3.10 Acceptance criteria for Phase B "done"

- [ ] `harness.manifest.yaml` exists; `validate-manifest` + `validate-module-graph` pass
- [ ] All 15 required artifacts exist on disk
- [ ] `validate-required-artifacts` passes
- [ ] `validate-placeholders` passes (no unresolved placeholder tokens in tracked files)
- [ ] `validate-agent-pack` passes
- [ ] `validate-doc-references` passes
- [ ] Root `CLAUDE.md` explicitly de-loads `.harness/CLAUDE.md`
- [ ] ADR-0001 exists, status `accepted`
- [ ] `docs/mcp/risk-register.md` has all 8 audit findings
- [ ] No edits to `src/`
- [ ] Single commit on `main` (or one merged PR) recording `.harness@4647a5f`

### 3.11 Out of scope (deferred)

| Item | Why deferred | Goes where |
| ---- | ------------ | ---------- |
| Source security refactor (read-only mode flag, input bounds, host binding fix, CORS lock-down, write-tool gating) | Tier 2 on `src/`; per-change user direction required | **Track 3** |
| OSS release scaffolding (`SECURITY.md`, npm provenance config, `CHANGELOG.md`, semver discipline) | Needs Track 3 source changes to land first | **Track 2** |
| CI workflow (`.github/workflows/harness.yml`) | Per earlier "Defer CI to Track 2" direction | **Track 2** |
| Consumer-side MCP composition (for projects that *consume* MCP servers) | Different problem; producer-side is what Phase A shipped | **Future PR to auto-harness** |
| Converting audit `.docx` to markdown | Cosmetic; `.docx` is fine as a source artifact | **Optional, Track 2** |

### 3.12 Risks specific to Phase B execution

| Risk | Mitigation |
| ---- | ---------- |
| Template body drift — assumed paths in §3.4 don't match upstream | First action: `ls .harness/platform/templates/`. Downgrade missing-template artifacts to hand-written stubs that satisfy validators. |
| Placeholder loop on first run (15 templates × multiple placeholders each) | Use TaskCreate per artifact; work in dependency order (kernel → project-standard → mcp-server → self-hosted-oss → knowledge-capture). |
| `agents/claude-code` auto-generated `.claude/settings.json` is too broad for this threat model | Inspect post-install; narrow permissions before commit. |
| Submodule pointer drift if `.harness` is updated mid-Phase-B | Pin `.harness` at `4647a5f` for the duration of Phase B; only re-fetch after Phase B commits. |

---

## Open questions (none blocking)

- Whether toast-mcp should also adopt the `harness-mcp` skill explicitly in `AGENTS.md` (in addition to symlinking it via `install.sh --skills`). Recommended: yes, since it's the producer-side skill our composition activates.
- Whether to file a courtesy PR to `BusyBee3333/mcpengine` referencing this fork (for upstream awareness). Not blocking; can wait until Track 3 is well underway and we have something concrete to offer.

---

## References

- auto-harness PR #73 — `feat(compositions): add mcp-server-typescript-oss starter` (merged 2026-05-28 at `b414c83`)
- auto-harness PR #74 — `[Wave 2a] ADR-0016 — Documentation IA Phase 3–4 Target Structure` (merged 2026-05-28 at `4647a5f`)
- Security assessment — `docs/toast_mcp_security_assessment.docx` (dated 2026-05-27)
- auto-harness module documentation:
  - `.harness/platform/profiles/architectures/mcp-server/README.md`
  - `.harness/platform/profiles/delivery/self-hosted-oss/README.md`
  - `.harness/platform/profiles/management/project-standard/module.yaml`
  - `.harness/platform/profiles/management/knowledge-capture/module.yaml`
  - `.harness/platform/agents/claude-code/module.yaml`
  - `.harness/platform/workflow/mcp-server-build.md`
  - `.harness/docs/adr/ADR-0008-mcp-awareness.md`
