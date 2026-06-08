---
name: ralph-architecture-sweep
description: Drive the ralph autonomous loop to run an architecture-deepening sweep (the "deletion test" methodology) and file the findings as vertical-slice issues, over a whole codebase or a chosen part. Use when you want ralph to find refactoring/deepening opportunities and turn them into independently-grabbable issues, repo-wide or for one subsystem.
---

# Ralph Architecture Sweep

Drive **ralph** ([frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code)) to sweep a codebase for **architecture-deepening opportunities** and file them as **vertical-slice issues** — over the **whole codebase or a user-chosen part**. Optionally chain ralph to implement + deploy the issues (project-specific — see [EXTENDING.md](EXTENDING.md)).

Requires ralph installed in the repo (`ralph-claude-code/`, `.ralphrc`, `.ralph/`) and Claude Code. The deepening vocabulary (deep vs shallow modules, the deletion test, seams) and the vertical-slice issue format are the methodology this skill drives ralph through — from Matt Pocock's `improve-codebase-architecture` + `to-issues` skills ([mattpocock/skills](https://github.com/mattpocock/skills); see the repo README for full credits).

## Non-negotiable guardrails

- **Base every sweep off the remote default branch, not local refs.** Local refs can lag the remote by many commits; a stale-base sweep re-finds already-shipped seams. `git fetch origin <default-branch>` first; fork from the remote ref.
- **Run in a dedicated worktree on a `ralph/*` branch, OUTSIDE the repo.** When multiple agent sessions share a checkout, a worktree git-locks the branch so it can't be flipped under you. Never run ralph on the default branch.
- **No push by the loop.** `.ralphrc` `ALLOWED_TOOLS` should omit `git push`; pushing a deploy branch may ship to an environment.
- **The sweep is analysis-only** — writes ONLY under `.scratch/<area>-deepening*/`, zero source edits.
- **Delta-aware.** If `.scratch/*-deepening*` epics already exist for an area, exclude already-filed/shipped seams and write new candidates to `…-delta` (bump the suffix). "Zero new candidates" is a valid, honest result.

## Pipeline

### Phase 0 — Scope & preflight  → [SETUP.md](SETUP.md)
1. **Ask the user the scope** (the core choice): the whole codebase or a chosen part (a subsystem/package/directory). Map it to *areas* — one area per ralph loop.
2. `git fetch origin <default-branch>`; note the remote tip and how far the local checkout lags. Detect existing `.scratch/*-deepening*` epics → if an area was already swept, propose a **delta** sweep and surface "already swept / delta vs fresh re-sweep" to the user.
3. Confirm ralph infra: `ralph-claude-code/ralph_loop.sh`, `.ralphrc`, a per-call timeout tool (`timeout`/`gtimeout`), `claude` CLI on PATH.

### Phase 1 — Worktree + backlog  → [SETUP.md](SETUP.md)
Fork a worktree off the remote default branch on `ralph/<slug>`; copy the untracked ralph tooling in; write `.ralph/PROMPT.md` + `fix_plan.md` that **inline the methodology** (deletion test + deep/shallow/seam vocab; vertical-slice issue template), one area per loop, analysis-only, with the exclusion map.

### Phase 2 — Sweep (analysis-only) → issues  → [SWEEP.md](SWEEP.md)
Drive the sweep **robustly**: default to one short sub-agent per area (headless ralph commits only at the end of an iteration, so a long analysis call that drops mid-stream loses everything — sub-agents/inline don't). Verify every candidate against the remote tip. Write `.scratch/<area>-deepening[-delta]/` PRD + vertical-slice issues; commit per area (`docs(arch): … sweep — <area> (N candidate(s))`); no push.

**Stop here unless the user opted into implement.** Report per-area counts + branch + paths.

### Phase 3+ — (optional) Implement & deploy  → [EXTENDING.md](EXTENDING.md)
Project-specific. Chain ralph to implement the filed issues (one ticket per loop, **your** gates), then review and deploy through **your** pipeline. EXTENDING.md sketches the shape with placeholders — wire it to your stack. Never hardcode servers, SSH, secrets, domains, or auth-token recipes into a shared skill.
