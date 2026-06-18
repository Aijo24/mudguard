# Setup — scope, worktree, backlog (Phases 0–1)

## Scope → areas

Resolve the scope: **whole codebase** or a **chosen part**? Take it from the invocation argument or the conversation if it's already there — ask only when genuinely ambiguous, and default to the whole codebase when running unattended. Map it to **areas**, one area per loop iteration, each diffable against an existing epic. Pick areas that are coherent subsystems (a package, a layer, a directory) so each iteration has a tractable, self-contained scope.

**Size areas for quality, not convenience.** A sub-agent that has to skim hundreds of files returns shallow candidates. Keep an area to roughly ≤ 50 source files / one coherent subsystem; split anything bigger along its natural seams (sub-packages, layers) into separate areas. Tiny leftovers (a stray `utils/`, config dirs) fold into the nearest neighbour rather than getting their own iteration.

## Base off the remote default branch (refs lag!)

```
git fetch origin <default-branch>                                    # e.g. main
git rev-parse --short origin/<default-branch>                        # the base
git rev-list --left-right --count origin/<default-branch>...HEAD     # how far local lags
```

Always fork from the **remote** ref, never the local checkout (which may be far behind, missing shipped refactors). A stale-base sweep re-finds seams that are already shipped.

## Detect prior sweeps → delta

```
git ls-tree -r origin/<default-branch> --name-only -- .scratch/ | grep deepening
```

If an area already has a `…-deepening` (± `…-deepening-delta`) epic, run a **delta** sweep: the worktree (off the remote tip) sees the shipped refactors, so it can EXCLUDE them; write to `…-deepening-delta2` (bump the suffix). **Delta is the default** — a fresh re-sweep re-finds shipped seams (waste + false candidates) — so only offer "delta vs fresh re-sweep" when the user is around to answer; unattended, just run delta and say so in the report.

## Resume an interrupted sweep

The checkpoint state is already on disk: per-area commits + an area checklist (`fix_plan.md`) with `[ ]`/`[x]` boxes. If a `mudguard/<slug>` worktree exists with some areas `[x]` and some `[ ]`:

```
git -C "$WT" log --oneline -- .scratch/    # which areas committed
grep -c '\[ \]' "$WT"/fix_plan.md          # how many remain (ralph driver: .ralph/fix_plan.md)
```

Re-fetch and check the remote tip hasn't moved (`git rev-parse origin/<default-branch>` vs the worktree's base). Same tip → **resume from the first unchecked area**; committed areas are done, don't redo them. Tip moved → finish remaining areas off the old base, then flag in the report that the base is stale (a later delta sweep covers the gap). Never restart a sweep from zero when checkpoints exist.

## Worktree + tooling

```
WT=<repo-parent>/mudguard-<slug>-wt
git worktree add "$WT" -b mudguard/<slug> origin/<default-branch>
```

The default sub-agent path needs **no** install/deps — the worktree is enough. If you're running a hands-off driver, copy its tooling into the worktree now (a local file copy, nothing downloaded; for ralph: `cp -R <repo>/ralph-claude-code "$WT"/ && cp <repo>/.ralphrc "$WT"/`) — see [DRIVERS.md](DRIVERS.md). If the driver's backlog files are tracked they come with the worktree — overwrite them for this epic. Clean up after with `git worktree remove --force "$WT"`.

## Backlog: inline the methodology

`improve-codebase-architecture` now scans, presents a visual report, and *grills* you on the candidate you pick, and `to-issues` quizzes you interactively — both are **user-invoked** and hang in headless `claude`. So mudguard deliberately **inlines their methodology** into the per-iteration spec + the area checklist (for the ralph driver, `.ralph/PROMPT.md` + `.ralph/fix_plan.md` — see [DRIVERS.md](DRIVERS.md)) and runs it headlessly, rather than calling them. This is a deliberate, now-validated design choice — don't "just call `/improve-codebase-architecture`" from the loop; it will block forever. The vocabulary below mirrors the model-invoked `codebase-design` skill — keep this inlined copy in sync with it, and let the verifier lean on `/codebase-design` for borderline verdicts.

**Deepening vocabulary** (the loop's only criterion, so state it in full):
- **Deep vs shallow module** — a *deep* module packs a lot of behaviour behind a small interface; a *shallow* module's interface is nearly as complex as its implementation (little leverage for the cost of learning it).
- **Seam** — a place you can change behaviour without editing there. A *real* seam is one rule duplicated across N call sites, or 2+ real adapters over the same data; a single adapter is only a hypothetical seam (don't extract for it).
- **Adapter** — a concrete implementation satisfying an interface at a seam. **Depth** — how much behaviour a module hides behind its interface (the leverage you buy for the interface you pay for).
- **Deletion test** — imagine deleting the proposed module: complexity *vanishes* = it was a pass-through (reject); complexity *reappears across N callers* = it earns its keep (propose).
- **Behaviour-preserving** — a deepening never changes observable behaviour; it relocates it behind a better interface.

**Issues (vertical slice):** one issue per candidate — *What to build* (the deep module/seam + every call site repointed + tests at the new interface + old copies deleted) / *Acceptance criteria* / *Deletion-test verdict* / *Strength* (Strong / Worth-exploring) / *Blocked by*. Tests assert observable behaviour **through** the new interface — a test that has to reach past the interface means the module is the wrong shape. Plus a per-area `PRD.md` (Problem / Candidates / Out of scope).

The area checklist = one `- [ ]` per area (a driver may log progress from it — ralph logs "Remaining tasks: N" at startup — confirming the scoping). Bake the guardrails into the per-iteration spec: analysis-only (writes only under `.scratch/<area>-deepening*/`), no push, **respect your ADRs** (never re-propose a settled decision — flag, don't fork), and **re-verify every candidate against the remote tip**. If you keep a decision record — a `CONTEXT.md` and/or an ADR log, e.g. the ones Matt Pocock's `domain-modeling` skill writes inline — feed it into the exclusion map alongside the existing epics, so the sweep treats those settled decisions as out of scope. No record yet? The guardrail is simply a no-op; the sweep still runs.

If your repo already has `.scratch/*-deepening*` epics, use them as the template — they show the proven output shape.
