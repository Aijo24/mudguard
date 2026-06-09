# Sweep — drive analysis-only, robustly (Phase 2)

## Why not just launch headless ralph

Headless ralph (`claude -p`, JSON mode) **commits only at the END of a successful iteration**. A single area's sweep is one long call (minutes); if it drops mid-stream (e.g. an API socket-drop), the whole iteration AND its spend are discarded, and auto-reset just re-burns long calls until the circuit breaker. Short interactive calls don't have this failure mode. **So for an analysis-only sweep, drive it from the interactive session, not headless.**

## Default: fan out sub-agents (one per area)

Run the areas in parallel via the agent tool. Each sub-agent:

- operates in the **worktree** (absolute paths — it's at the remote tip, so it sees the shipped refactors),
- **reads the area's existing epic(s) first** to build the exclusion list,
- applies the **deletion test** + deep/shallow/seam vocab,
- returns ONLY genuinely-new candidates (or an explicit "zero"), each with: title, strength, **evidence** (files + symbols + call-site count, **with the exact grep/command that produced the count** so it can be replayed), proposed seam, deletion-test verdict, and an exclusion check ("not a re-proposal of `<epic/issue>` because …").

**Retry policy** — a sub-agent that errors out, times out, or returns ungrounded hand-waving gets **one retry with a narrower brief** (fewer directories, or "evidence-first: list call sites before naming a seam"). Still bad after the retry → mark the area `[!] needs manual look` in `fix_plan.md` and move on; never stall the whole sweep on one area, and never pad the report with its ungrounded output.

## Verification pass — no candidate ships unverified

After the proposal fan-out, **independently re-ground every candidate** against the remote tip before writing anything (a fresh verifier sub-agent per area works well — it must not see the proposer's reasoning, only its claims):

1. **Replay the evidence**: run the candidate's own grep/commands; the files, symbols and call-site count must reproduce. Off-by-a-couple is fine to correct in place; "can't reproduce" kills the candidate.
2. **Re-argue the deletion test** from the call sites found, not from the proposer's summary. Verdict flips → drop.
3. **Re-check the exclusion list**: is this a re-proposal of a filed/shipped seam or a settled ADR under a new name?
4. **Strength is earned, not asserted**: *Strong* needs ≥ 3 independent call sites (or 2+ adapters over the same data) plus a deletion-test verdict that survives step 2; anything weaker is *Worth-exploring*. Downgrade silently; never upgrade.

Dropped candidates don't appear in issues; a one-line "rejected at verification: <why>" list in the PRD keeps the sweep honest.

## Cross-area dedup

The same seam often surfaces from two areas (each sees its own call sites). Before writing issues, compare candidates **across** areas: same rule / same data adapters → merge into **one** issue in the area owning the proposed module, with the other area's call sites added to the slice and a pointer left in that area's PRD. Two half-issues for one seam is how you get conflicting implementations later.

## Issue lint — before commit

Every issue file must pass this checklist; fix or drop, don't commit a partial:

- [ ] *What to build* names the deep module/seam **and** lists every call site to repoint (paths, not "etc.")
- [ ] *Acceptance criteria* are checkable (tests at the new interface, old copies deleted)
- [ ] *Deletion-test verdict* is stated with the reasoning, not just "passes"
- [ ] *Strength* matches the verification rubric above
- [ ] *Blocked by* names a real issue file or "none"
- [ ] Evidence includes the replayable command(s) + counts
- [ ] The issue is a **vertical slice** — independently grabbable, no "part 1 of 3"

## Alternative: headless ralph loop

If you want the literal hands-off loop and the API is calm:

```
# reset a stale session FIRST, in a SEPARATE invocation (it exits without looping):
bash ralph-claude-code/ralph_loop.sh --reset-session
# then run:
bash ralph-claude-code/ralph_loop.sh --live --verbose --auto-reset-circuit
```

Monitor `.ralph/live.log` + `.ralph/status.json` (`status:"completed"`). Watch for dropped long calls — stop the loop and switch to sub-agents rather than letting auto-reset churn.

## Output + commit

Write `.scratch/<area>-deepening[-delta2]/PRD.md` + `issues/NN-<slug>.md` in the vertical-slice format. Commit per area, staging ONLY those files (never `git add -A` — the worktree has untracked tooling / runtime state):

```
git -C "$WT" add .scratch/<area>-deepening-delta2
git -C "$WT" commit -m "docs(arch): <delta-vN> sweep — <area> (N new candidate(s))"
```

Mark the area `[x]` in `fix_plan.md` **immediately after its commit** (that pair is the resume checkpoint — see SETUP.md). **Do not push.**

## Report

End with a table the user can scan in ten seconds, then the details:

| Area | Strong | Worth-exploring | Rejected at verification | Notes |
|---|---|---|---|---|

…plus the branch, the worktree path, the `.scratch/` paths, any `[!] needs manual look` areas with why, and whether the base went stale mid-sweep. Then ask whether the user wants the optional implement phase ([EXTENDING.md](EXTENDING.md)).
