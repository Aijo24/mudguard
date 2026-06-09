# Setup — scope, worktree, backlog (Phases 0–1)

## Scope → areas

Resolve the scope: **whole codebase** or a **chosen part**? Take it from the invocation argument or the conversation if it's already there — ask only when genuinely ambiguous, and default to the whole codebase when running unattended. Map it to **areas**, one area per ralph loop, each diffable against an existing epic. Pick areas that are coherent subsystems (a package, a layer, a directory) so each loop has a tractable, self-contained scope.

**Size areas for quality, not convenience.** A sub-agent that has to skim hundreds of files returns shallow candidates. Keep an area to roughly ≤ 50 source files / one coherent subsystem; split anything bigger along its natural seams (sub-packages, layers) into separate areas. Tiny leftovers (a stray `utils/`, config dirs) fold into the nearest neighbour rather than getting their own loop.

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

The checkpoint state is already on disk: per-area commits + `fix_plan.md` checkboxes. If a `ralph/<slug>` worktree exists with some areas `[x]` and some `[ ]`:

```
git -C "$WT" log --oneline -- .scratch/    # which areas committed
grep -c '\[ \]' "$WT"/.ralph/fix_plan.md   # how many remain
```

Re-fetch and check the remote tip hasn't moved (`git rev-parse origin/<default-branch>` vs the worktree's base). Same tip → **resume from the first unchecked area**; committed areas are done, don't redo them. Tip moved → finish remaining areas off the old base, then flag in the report that the base is stale (a later delta sweep covers the gap). Never restart a sweep from zero when checkpoints exist.

## Worktree + tooling

```
WT=<repo-parent>/ralph-<slug>-wt
git worktree add "$WT" -b ralph/<slug> origin/<default-branch>
# if ralph's tooling is untracked, copy it into the worktree:
cp -R <repo>/ralph-claude-code "$WT"/ && cp <repo>/.ralphrc "$WT"/
```

If `.ralph/PROMPT.md` + `fix_plan.md` are tracked they come with the worktree — overwrite them for this epic. An analysis-only sweep needs **no** install/deps. Clean up after with `git worktree remove --force "$WT"`.

## Backlog: inline the methodology

Interactive deepening/issue skills hang in headless `claude`, so **inline** their methodology into `.ralph/PROMPT.md` (per-iteration spec) + `.ralph/fix_plan.md` (the checkbox area list).

**Deepening:** deep vs shallow modules; a **seam** is one rule across N call sites, or 2+ adapters over the same data; the **deletion test** — delete the proposed module: complexity *vanishes* = pass-through (reject); *reappears across N callers* = earns its keep (propose). Behaviour-preserving.

**Issues (vertical slice):** one issue per candidate — *What to build* (the deep module/seam + every call site repointed + tests at the new interface + old copies deleted) / *Acceptance criteria* / *Deletion-test verdict* / *Strength* (Strong / Worth-exploring) / *Blocked by*. Plus a per-area `PRD.md` (Problem / Candidates / Out of scope).

`fix_plan.md` = one `- [ ]` per area (ralph logs "Remaining tasks: N" at startup — confirms scoping). Bake the guardrails into PROMPT.md: analysis-only (writes only under `.scratch/<area>-deepening*/`), no push, **respect your ADRs** (never re-propose a settled decision — flag, don't fork), and **re-verify every candidate against the remote tip**.

If your repo already has `.scratch/*-deepening*` epics, use them as the template — they show the proven output shape.
