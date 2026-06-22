---
name: mudguard
description: Autonomous, independently-verified architecture deepening — sweep a codebase (whole or a chosen part) for deep-module/deletion-test opportunities and file them as vertical-slice issues, headless and delta-aware. Run it when you explicitly want a refactoring/deepening backlog, repo-wide or for one subsystem.
disable-model-invocation: true
argument-hint: "[path-or-subsystem]"
---

# mudguard — autonomous architecture deepening

The headless, **autonomous**, delta-aware, **independently-verified** counterpart of the now-interactive architecture skills. mudguard sweeps a codebase — the **whole thing or a chosen part** — for **architecture-deepening opportunities** (deep vs shallow modules, the deletion test, seams), **verifies every candidate independently**, and files the survivors as ready-to-grab **vertical-slice issues**. Analysis-only. Optionally chain a loop to implement + deploy them (project-specific — see [EXTENDING.md](EXTENDING.md)).

**The engine is interchangeable; the layer is the value.** mudguard's durable core is the *layer* — the inlined methodology, the propose/verify split, delta-awareness, and ADR closure. *How* you run the loop is a swappable **driver**: by default mudguard drives the sweep itself via short sub-agents (no external engine); for a literal hands-off loop, pick a driver — ralph (the reference), Claude Code's native `/loop`, or Codex — see [DRIVERS.md](DRIVERS.md).

The methodology comes from Matt Pocock's skills ([mattpocock/skills](https://github.com/mattpocock/skills); see the repo README for full credits): the deepening vocabulary (deep vs shallow modules, the deletion test, seams) from `codebase-design`, the vertical-slice issue format from `to-issues`, and the scan-and-deepen workflow as the headless analogue of `improve-codebase-architecture`. Those upstream skills are now interactive and **user-invoked**, so mudguard **inlines the methodology and runs it headlessly** rather than calling them.

## Provenance & safety

mudguard **downloads, installs, and fetches nothing.** The GitHub links here are **attribution**, not install sources. The default path drives the sweep via sub-agents and runs **no external script at all**. Loop drivers (ralph, `/loop`, Codex) are separate tools you install and audit yourself; mudguard only ever invokes a driver's runner (e.g. `ralph-claude-code/ralph_loop.sh`) when it is **already present in your own repo**, on the **opt-in** hands-off path (see [DRIVERS.md](DRIVERS.md)). Any tooling copy (e.g. `cp -R <repo>/ralph-claude-code …`) is a **local file copy** — nothing is pulled from the network.

## Non-negotiable guardrails

- **Base every sweep off the remote default branch, not local refs.** Local refs can lag the remote by many commits; a stale-base sweep re-finds already-shipped seams. `git fetch origin <default-branch>` first; fork from the remote ref.
- **Run in a dedicated worktree on a `mudguard/*` branch, OUTSIDE the repo.** When multiple agent sessions share a checkout, a worktree git-locks the branch so it can't be flipped under you. Never run on the default branch.
- **No push by the loop.** Your driver's config (for ralph, `.ralphrc` `ALLOWED_TOOLS`) should omit `git push`; pushing a deploy branch may ship to an environment.
- **The sweep is analysis-only** — writes ONLY under `.scratch/<area>-deepening*/`, zero source edits.
- **Delta-aware.** If `.scratch/*-deepening*` epics already exist for an area, exclude already-filed/shipped seams and write new candidates to `…-delta` (bump the suffix). "Zero new candidates" is a valid, honest result. Each area leaves a SHA-anchored `RECEIPT.md` (see [SWEEP.md](SWEEP.md)) — the base it was verified against + the area paths, the survival accounting (`proposed`/`survival_rate`), the 30-day churn (a durability / collision-risk flag), and a SHA-anchored list of *rejected* seams — so a later sweep can anchor its exclusions, **and its memory of what it already killed**, on a commit instead of on prose. (The receipt stays a derived digest — the PRD/issues remain the sole authority for what was filed and rejected.)
- **No candidate ships unverified — every issue carries a replayable *oracle*.** A candidate's **oracle** is its replayable evidence (the exact grep/command + the files/symbols/call-site count it must reproduce) **plus** its deletion-test verdict — the observable signal the proposer records *before* an issue is shaped. An independent verification pass *replays* that oracle (re-grep the evidence, reproduce the call-site count, re-argue the deletion test) before the candidate becomes an issue — see [SWEEP.md](SWEEP.md). Naming it adds **no step**: the oracle is a binary "does the evidence replay?" gate carrying **no** strength threshold (*strength* still owns that — SWEEP.md step 4), the deletion test is still re-argued *independently by the verifier*, and the exclusion re-check stays a separate gate. A candidate whose oracle can't be replayed is dropped, not "downgraded into the report anyway".
- **Resumable, never restart-from-zero.** Per-area commits + an area checklist (`fix_plan.md`) are the checkpoint state; an interrupted sweep resumes from the first unchecked area. The per-area `RECEIPT.md` is a delta/exclusion artifact, **never resume authority** — resume reads only `git log -- .scratch/` and the `[ ]`/`[x]` boxes, never the receipt.

## Pipeline

### Phase 0 — Scope & preflight  → [SETUP.md](SETUP.md)
1. **Resolve the scope** (the core choice): the whole codebase or a chosen part (a subsystem/package/directory). If the user passed it with the invocation (`/mudguard <path-or-subsystem>`) or already said it, **don't re-ask**; ask only when it's genuinely ambiguous, and when running unattended default to the whole codebase. Map the scope to *areas* — one area per loop iteration.
2. `git fetch origin <default-branch>`; note the remote tip and how far the local checkout lags. Detect existing `.scratch/*-deepening*` epics → if an area was already swept, default to a **delta** sweep (the only non-wasteful choice); only surface "delta vs fresh re-sweep" if the user is around to answer.
3. **Detect an interrupted sweep**: an existing `mudguard/<slug>` worktree with a partially-checked area checklist → resume from the first unchecked area instead of starting over.
4. **Pick the driver** (see [DRIVERS.md](DRIVERS.md)): the **default sub-agent path needs no external engine** — confirm only `claude` on PATH. A hands-off driver (ralph / `/loop` / Codex) is optional and only needed for the opt-in headless and implement paths; note if it's absent and proceed.

### Phase 1 — Worktree + backlog  → [SETUP.md](SETUP.md)
Fork a worktree off the remote default branch on `mudguard/<slug>`; if you're using a hands-off driver, copy its tooling in ([DRIVERS.md](DRIVERS.md)). Write the per-iteration spec + area checklist that **inline the methodology** (deletion test + deep/shallow/seam vocab; vertical-slice issue template), one area per iteration, analysis-only, with the exclusion map.

### Phase 2 — Sweep (analysis-only) → verify → issues  → [SWEEP.md](SWEEP.md)
Drive the sweep **robustly**: default to one short sub-agent per area (a long analysis call that drops mid-stream loses everything; short sub-agents/inline don't), with a **one-retry policy** for failed sub-agents. Then the **verification pass**: independently re-ground every candidate against the remote tip (the verifier re-derives the call-site set with its *own* search, not the proposer's grep — so a cherry-picked count can't sneak through), **scale the *Strong* bar to the area's survival rate** (a noisy proposer earns Strong harder — the multiple-comparisons guard), dedupe seams found by multiple areas, and lint each issue against the template before it's written. Write `.scratch/<area>-deepening[-delta]/` PRD + vertical-slice issues; commit per area (`docs(arch): … sweep — <area> (N candidate(s))`); no push.

**Stop here unless the user opted into implement.** Report per-area counts + branch + paths.

### Phase 3+ — (optional) Implement & deploy  → [EXTENDING.md](EXTENDING.md)
Project-specific. Chain a loop to implement the filed issues (one ticket per iteration, **your** gates), then review and deploy through **your** pipeline. EXTENDING.md sketches the shape with placeholders — wire it to your stack. Never hardcode servers, SSH, secrets, domains, or auth-token recipes into a shared skill.
