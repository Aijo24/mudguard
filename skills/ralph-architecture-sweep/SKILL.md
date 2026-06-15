---
name: ralph-architecture-sweep
description: Drive the ralph autonomous loop to run an architecture-deepening sweep (the "deletion test" methodology) and file the findings as vertical-slice issues, over a whole codebase or a chosen part. Use when you want ralph to find refactoring/deepening opportunities and turn them into independently-grabbable issues, repo-wide or for one subsystem.
---

# Ralph Architecture Sweep

Drive **ralph** — the autonomous loop by Frank Bria ([frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code), MIT) — to sweep a codebase for **architecture-deepening opportunities** and file them as **vertical-slice issues** — over the **whole codebase or a user-chosen part**. Optionally chain ralph to implement + deploy the issues (project-specific — see [EXTENDING.md](EXTENDING.md)).

Requires ralph installed in the repo (`ralph-claude-code/`, `.ralphrc`, `.ralph/`) and Claude Code. The deepening vocabulary (deep vs shallow modules, the deletion test, seams) and the vertical-slice issue format are the methodology this skill drives ralph through — from Matt Pocock's `improve-codebase-architecture` + `to-issues` skills ([mattpocock/skills](https://github.com/mattpocock/skills); see the repo README for full credits).

## Provenance & safety

This skill **downloads, installs, and fetches nothing.** The GitHub links above are **attribution**, not install sources — ralph is a separate, third-party MIT tool you install and audit yourself before using it. This skill only ever invokes `ralph-claude-code/ralph_loop.sh` when that script is **already present in your own repo**, and only on the **opt-in** headless path (see [SWEEP.md](SWEEP.md) → "Alternative: headless ralph loop"); the default sub-agent path runs no external script at all. The `cp -R <repo>/ralph-claude-code …` step in [SETUP.md](SETUP.md) copies *your* local checkout into a worktree — it does not pull from the network.

## Non-negotiable guardrails

- **Base every sweep off the remote default branch, not local refs.** Local refs can lag the remote by many commits; a stale-base sweep re-finds already-shipped seams. `git fetch origin <default-branch>` first; fork from the remote ref.
- **Run in a dedicated worktree on a `ralph/*` branch, OUTSIDE the repo.** When multiple agent sessions share a checkout, a worktree git-locks the branch so it can't be flipped under you. Never run ralph on the default branch.
- **No push by the loop.** `.ralphrc` `ALLOWED_TOOLS` should omit `git push`; pushing a deploy branch may ship to an environment.
- **The sweep is analysis-only** — writes ONLY under `.scratch/<area>-deepening*/`, zero source edits.
- **Delta-aware.** If `.scratch/*-deepening*` epics already exist for an area, exclude already-filed/shipped seams and write new candidates to `…-delta` (bump the suffix). "Zero new candidates" is a valid, honest result.
- **No candidate ships unverified.** Every candidate passes an independent verification pass (re-grep the evidence, reproduce the call-site count, re-argue the deletion test) before it becomes an issue — see [SWEEP.md](SWEEP.md). A candidate that can't be re-grounded is dropped, not "downgraded into the report anyway".
- **Resumable, never restart-from-zero.** Per-area commits + `fix_plan.md` checkboxes are the checkpoint state; an interrupted sweep resumes from the first unchecked area.

## Pipeline

### Phase 0 — Scope & preflight  → [SETUP.md](SETUP.md)
1. **Resolve the scope** (the core choice): the whole codebase or a chosen part (a subsystem/package/directory). If the user passed it with the invocation (`/ralph-architecture-sweep <path-or-subsystem>`) or already said it, **don't re-ask**; ask only when it's genuinely ambiguous, and when running unattended default to the whole codebase. Map the scope to *areas* — one area per ralph loop.
2. `git fetch origin <default-branch>`; note the remote tip and how far the local checkout lags. Detect existing `.scratch/*-deepening*` epics → if an area was already swept, default to a **delta** sweep (the only non-wasteful choice); only surface "delta vs fresh re-sweep" if the user is around to answer.
3. **Detect an interrupted sweep**: an existing `ralph/<slug>` worktree with partially-checked `fix_plan.md` → resume from the first unchecked area instead of starting over.
4. Confirm ralph infra: `ralph-claude-code/ralph_loop.sh`, `.ralphrc`, a per-call timeout tool (`timeout`/`gtimeout`), `claude` CLI on PATH. **Missing ralph is not fatal for Phases 0–2**: the default sub-agent path (SWEEP.md) doesn't invoke the loop — note it's absent (the optional headless and implement paths need it) and proceed.

### Phase 1 — Worktree + backlog  → [SETUP.md](SETUP.md)
Fork a worktree off the remote default branch on `ralph/<slug>`; copy the untracked ralph tooling in; write `.ralph/PROMPT.md` + `fix_plan.md` that **inline the methodology** (deletion test + deep/shallow/seam vocab; vertical-slice issue template), one area per loop, analysis-only, with the exclusion map.

### Phase 2 — Sweep (analysis-only) → verify → issues  → [SWEEP.md](SWEEP.md)
Drive the sweep **robustly**: default to one short sub-agent per area (headless ralph commits only at the end of an iteration, so a long analysis call that drops mid-stream loses everything — sub-agents/inline don't), with a **one-retry policy** for failed sub-agents. Then the **verification pass**: independently re-ground every candidate against the remote tip, dedupe seams found by multiple areas, and lint each issue against the template before it's written. Write `.scratch/<area>-deepening[-delta]/` PRD + vertical-slice issues; commit per area (`docs(arch): … sweep — <area> (N candidate(s))`); no push.

**Stop here unless the user opted into implement.** Report per-area counts + branch + paths.

### Phase 3+ — (optional) Implement & deploy  → [EXTENDING.md](EXTENDING.md)
Project-specific. Chain ralph to implement the filed issues (one ticket per loop, **your** gates), then review and deploy through **your** pipeline. EXTENDING.md sketches the shape with placeholders — wire it to your stack. Never hardcode servers, SSH, secrets, domains, or auth-token recipes into a shared skill.
