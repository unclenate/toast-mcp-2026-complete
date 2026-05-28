# HARNESS.md

This project uses the modular harness manifest at `harness.manifest.yaml`.
Auto-harness is mounted at `.harness/` as a git submodule.

- Governance: `.harness/platform/workflow/submodule-integration.md`
- Validators: `.harness/platform/validators/`
- Skills (symlinked): `.agents/skills/` and `.claude/skills/`

Update the submodule to pull in upstream improvements:

```
git submodule update --remote .harness
```

---

## Required Artifacts (this project)

| Module | Artifact | Status |
| ------ | -------- | ------ |
| kernel/base | `HARNESS.md` | this file |
| kernel/base | `AGENTS.md` | created |
| kernel/base | `docs/operating-principles.md` | created |
| architectures/mcp-server | `docs/mcp/server-spec.md` | created |
| architectures/mcp-server | `docs/mcp/tool-registry.md` | created |
| architectures/mcp-server | `docs/mcp/risk-register.md` | created |
| delivery/self-hosted-oss | `docs/deployment/self-hosting-guide.md` | created |
| management/project-standard | `docs/project/scope-plan.md` | created |
| management/project-standard | `docs/project/dependency-log.md` | created |
| management/project-standard | `docs/project/milestones.md` | created |
| management/project-standard | `docs/project/change-log.md` | created |
| management/project-standard | `docs/project/revision-tracker.md` | created |
| management/knowledge-capture | `docs/knowledge/README.md` | created |
| management/knowledge-capture | `docs/knowledge/shared-observations.md` | created |
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
