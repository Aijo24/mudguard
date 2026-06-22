# Setup — scope, worktree, backlog (Phases 0–1)

## Scope → areas

Resolve the scope: **whole codebase** or a **chosen part**? Take it from the invocation argument or the conversation if it's already there — ask only when genuinely ambiguous, and default to the whole codebase when running unattended. Map it to **areas**, one area per loop iteration, each diffable against an existing epic. Pick areas that are coherent subsystems (a package, a layer, a directory) so each iteration has a tractable, self-contained scope. **Record each area's source path(s)** (the directories/globs it covers): they become the area's `paths` in the receipt and the unit the churn measure and the delta no-op test both run against ([SWEEP.md](SWEEP.md)).

**Size areas for quality, not convenience.** A sub-agent that has to skim hundreds of files returns shallow candidates. Keep an area to roughly ≤ 50 source files / one coherent subsystem; split anything bigger along its natural seams (sub-packages, layers) into separate areas. Tiny leftovers (a stray `utils/`, config dirs) fold into the nearest neighbour rather than getting their own iteration.

## Base off the remote default branch (refs lag!)

```
git fetch origin <default-branch>                                    # e.g. main
git rev-parse origin/<default-branch>                                # the base — record the FULL 40-char SHA (the receipt's `base`; never --short, it can go ambiguous and break `git log <sha>..`)
git rev-list --left-right --count origin/<default-branch>...HEAD     # how far local lags
```

Always fork from the **remote** ref, never the local checkout (which may be far behind, missing shipped refactors). A stale-base sweep re-finds seams that are already shipped.

## Detect prior sweeps → delta

```
git ls-tree -r origin/<default-branch> --name-only -- .scratch/ | grep deepening
```

If an area already has a `…-deepening` (± `…-deepening-delta`) epic, run a **delta** sweep: the worktree (off the remote tip) sees the shipped refactors, so it can EXCLUDE them; write to `…-deepening-delta2` (bump the suffix). **Delta is the default** — a fresh re-sweep re-finds shipped seams (waste + false candidates) — so only offer "delta vs fresh re-sweep" when the user is around to answer; unattended, just run delta and say so in the report. Then **consume the prior receipts** (below) — that's what turns "delta" from "doesn't re-file shipped seams" into "doesn't re-do work at all".

## Delta read-path — consume prior receipts

A delta sweep doesn't just avoid re-filing shipped seams; it **remembers what it already rejected** and **skips what hasn't moved**, so nothing is re-litigated full-freight every run. This is the payoff the `RECEIPT.md` write-path ([SWEEP.md](SWEEP.md) §RECEIPT.md) exists for.

**When it runs.** Per area, **after the worktree is forked** (§Worktree + tooling — so `$WT` and its committed `.scratch/` exist) but **before proposers fan out**. The read-only *tests* below need only the fetched `origin/<default-branch>` ref + the committed receipt blobs, so they can equally run in the main clone right after `git fetch` (then read `$WT` as the main repo); only the skip *action* — writing/committing the no-op receipt + ticking the checklist — needs the worktree and the area checklist.

For each area that has prior `.scratch/<area>-deepening*/` epics:

1. **Load the receipts (as hints, never authority).** Glob `.scratch/<area>-deepening*/RECEIPT.md` (the bare epic + every `-deltaN`); parse each one's `generation`, `base`, `paths`, `rejected[]`. Two binding rules: **`paths` must be plain directory/file pathspecs** — git matches a literal `*` in a pathspec, so a recorded glob makes the no-op tests silently match nothing (prefix `:(glob)` on the `git` calls if you must use globs); and **a rejection's anchor base is its containing receipt's top-level `base`** — each receipt holds only its own generation's kills, so every rejection in it shares that `base` (there is no per-entry base). The receipt is read here only to build the exclusion map — **never** as the record of what was filed/rejected (PRD/issues own that) and **never** to decide resume.

2. **`unchanged(base, paths)` — one shared test.** Both the area skip (step 3) and the per-seam exclude (step 4) decide on *this same* predicate, so their guards can't drift. It is `true` **only if every** check passes; **any** failure, error, or uncertainty is **not `unchanged`** → fail open (step 5). (Pseudocode; runs against the fetched ref + object store, no working tree needed.)

   ```
   [ -n "<paths>" ]                           || return UNCERTAIN   # (a) paths non-empty — empty/absent ⇒ unparseable ⇒ fail open
   git -C "$WT" cat-file -e <base> 2>/dev/null || return UNCERTAIN   # (b) base reachable
   git -C "$WT" merge-base --is-ancestor <base> origin/<default-branch> \
                                              || return UNCERTAIN   # (c) base is an ancestor of the tip (not a force-push / rewrite)
   for p in <paths>; do                                             # (d) every path still resolves
     [ -n "$(git -C "$WT" ls-tree -r --name-only origin/<default-branch> -- "$p")" ] || return UNCERTAIN
   done
   git -C "$WT" log <base>..origin/<default-branch> --oneline -- <paths> > /tmp/d; rc=$?
   [ $rc -eq 0 ]                              || return UNCERTAIN   # (e) a nonzero git exit is uncertainty, NOT "empty"
   [ -s /tmp/d ] && return CHANGED || return UNCHANGED              #     commits since base? changed : unchanged
   ```

3. **Area-level no-op → skip unchanged areas.** Take the receipt with the largest `generation` (compare the parsed **integer**, never lexically — gen 10 > gen 2) as the last-swept point: `last_base` = its `base`, `area_paths` = its `paths`. If `unchanged(last_base, area_paths)` → **skip the area**: write a no-op receipt into a **fresh `…-deepening-delta<N+1>/` dir** (the same suffix-bump a swept delta would use, but `RECEIPT.md` only — no PRD/issues): gen N+1, `base` = the current preflight base, `proposed: 0`, churn still computed, `noop: no change since <last_base>` (see [SWEEP.md](SWEEP.md) §RECEIPT.md). `git add` that dir, commit, tick the area `[x]`, report *"swept clean @ `<last_base>`, skipped"*. **No proposer runs.** A receipt-only `.scratch/` dir is a valid committed area — `git log -- .scratch/`, resume, and the next sweep's no-op test all see it.

4. **Per-seam exclusion → don't re-litigate what's still dead.** For an area you *are* sweeping, build its rejection memory by **unioning `rejected[]` across *all* generation receipts** (newest-only would forget a seam first killed in an earlier generation). For each unioned seam, evaluate `unchanged(<the seam's receipt base>, <seam.paths>)`:
   - **`UNCHANGED`** → **exclude it** ("don't propose `<seam>` — rejected @ `<base>` as `<oracle_at_base>`, scope unchanged"); the proposer won't spend a candidate on it.
   - **`CHANGED` *or* `UNCERTAIN`** → **do not exclude**; let the proposer re-propose and the verifier re-judge fresh (optionally hint "previously rejected @ `<base>` — re-evaluate").

   **Scope a seam's `paths` to its domain, not its first adapter.** A single-adapter hypothetical becomes real when a *second adapter* lands — often in a sibling directory (`src/pay/paypal/` beside `src/pay/stripe/`). If `seam.paths` were the narrow first-adapter dir, the test would miss that and wrongly exclude the seam exactly as it earns its keep. So an adapter-class rejection records `paths` as the seam's **parent/domain scope** (`src/pay/`), per [SWEEP.md](SWEEP.md) §RECEIPT.md; when in doubt about scope, fail open.

5. **Fail open — the read-path's prime directive.** Every `UNCERTAIN` above, and anything not *positively* confirmed `UNCHANGED` — unreachable base, not an ancestor (force-push / rewritten history), empty/absent or non-resolving `paths`, a nonzero `git` exit, or a receipt missing / pre-v0.4.0 / unparseable — means **do not skip and do not exclude**: sweep and re-evaluate. Re-working a dead seam costs a little; silently dropping a seam that has since become real defeats the sweep. Old epics with no v2 receipt fall back to today's behaviour (epics + CONTEXT/ADR exclusions only). **Log every skip and every receipt you couldn't use**, so a flood of "couldn't use" is visible, not silent.

So a proposer's exclusion map is: filed/shipped seams (epics) + settled decisions (CONTEXT/ADR) + **unchanged rejected seams (this read-path)**. Resume is untouched — still `git log -- .scratch/` + the `fix_plan.md` boxes, never a receipt; a no-op-skipped area is "done" via its commit + tick like any other.

## Resume an interrupted sweep

The checkpoint state is already on disk: per-area commits + an area checklist (`fix_plan.md`) with `[ ]`/`[x]` boxes. If a `mudguard/<slug>` worktree exists with some areas `[x]` and some `[ ]`:

```
git -C "$WT" log --oneline -- .scratch/    # which areas committed
grep -c '\[ \]' "$WT"/fix_plan.md          # how many remain (ralph driver: .ralph/fix_plan.md)
```

Re-fetch and check the remote tip hasn't moved (`git rev-parse origin/<default-branch>` vs the worktree's base). Same tip → **resume from the first unchecked area**; committed areas are done, don't redo them. Tip moved → finish remaining areas off the old base, then flag in the report that the base is stale (a later delta sweep covers the gap). Never restart a sweep from zero when checkpoints exist.

**Resume reads only `git log -- .scratch/` + the `fix_plan.md` boxes — never `RECEIPT.md`** (the receipt is a delta-exclusion artifact for a *later* sweep, not resume state). The authoritative done-signal is *a per-area commit exists for the area*; the `[x]` box is a convenience mirror. In the commit-before-tick window the `git log` check wins — re-tick the box, don't re-sweep the area, and never treat a receipt's mere presence as done-ness.

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
- **Oracle** — a candidate's replayable signal: the exact grep/command + the files/symbols/call-site count it must reproduce, **plus** its deletion-test verdict. The proposer records it *before* an issue is shaped; the verifier files the issue only if it can **replay** the oracle. Binary (reproduce-or-die) — *strength* owns the call-site threshold, the oracle never does.
- **Behaviour-preserving** — a deepening never changes observable behaviour; it relocates it behind a better interface.

**Issues (vertical slice):** one issue per candidate — *What to build* (the deep module/seam + every call site repointed + tests at the new interface + old copies deleted) / *Acceptance criteria* / *Oracle* (the replayable command + counts **and** the deletion-test verdict) / *Strength* (Strong / Worth-exploring) / *Blocked by*. Tests assert observable behaviour **through** the new interface — a test that has to reach past the interface means the module is the wrong shape. Plus a per-area `PRD.md` (Problem / Candidates / Out of scope).

The area checklist = one `- [ ]` per area (a driver may log progress from it — ralph logs "Remaining tasks: N" at startup — confirming the scoping). Bake the guardrails into the per-iteration spec: analysis-only (writes only under `.scratch/<area>-deepening*/`), no push, **respect your ADRs** (never re-propose a settled decision — flag, don't fork), and **re-verify every candidate against the remote tip**. If you keep a decision record — a `CONTEXT.md` and/or an ADR log, e.g. the ones Matt Pocock's `domain-modeling` skill writes inline — feed it into the exclusion map alongside the existing epics, so the sweep treats those settled decisions as out of scope. No record yet? The guardrail is simply a no-op; the sweep still runs. The exclusion map also carries a prior sweep's **rejected seams** via the delta read-path (above): an unchanged rejection is excluded so it isn't re-proposed and re-killed full-freight every run, a changed one is re-evaluated fresh — that's the negative-result memory that makes the sweep compound across runs.

If your repo already has `.scratch/*-deepening*` epics, use them as the template — they show the proven output shape.
