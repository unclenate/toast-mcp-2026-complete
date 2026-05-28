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
