# Sweep — drive analysis-only, robustly (Phase 2)

## Why sub-agents are the default

A single area's sweep is one long call (minutes). If you run it as one long headless loop iteration and it drops mid-stream (e.g. an API socket-drop), the whole iteration and its spend can be discarded — and some drivers (ralph) only commit at the *end* of an iteration, so the work is lost. Short sub-agent / interactive calls don't have this failure mode. **So drive the analysis-only sweep via short sub-agents, not one long headless call** — regardless of which loop driver you'd use for the hands-off variant ([DRIVERS.md](DRIVERS.md)).

## Default: fan out sub-agents (one per area)

Run the areas in parallel via the agent tool. Each sub-agent:

- operates in the **worktree** (absolute paths — it's at the remote tip, so it sees the shipped refactors),
- **reads the area's existing epic(s) first — plus any `CONTEXT.md` / ADR log** (the settled-decision record, e.g. the one `domain-modeling` writes) — to build the exclusion list,
- applies the **deletion test** + deep/shallow/seam vocab,
- returns ONLY genuinely-new candidates (or an explicit "zero"), each with: title, strength, **evidence** (files + symbols + call-site count, **with the exact grep/command that produced the count** so it can be replayed), proposed seam, deletion-test verdict, and an exclusion check ("not a re-proposal of `<epic/issue>` because …"). That replayable evidence **plus** the deletion-test verdict is the candidate's **oracle** — the observable, reproducible signal the verifier tests against; a candidate with no replayable oracle can't be filed.

**Retry policy** — a sub-agent that errors out, times out, or returns ungrounded hand-waving gets **one retry with a narrower brief** (fewer directories, or "evidence-first: list call sites before naming a seam"). Still bad after the retry → mark the area `[!] needs manual look` in the area checklist and move on; never stall the whole sweep on one area, and never pad the report with its ungrounded output.

## Verification pass — no candidate ships unverified

After the proposal fan-out, **independently re-ground every candidate** against the remote tip before writing anything (a fresh verifier sub-agent per area works well — it must not see the proposer's reasoning, only its claims):

1. **Replay the evidence** — *this replay is the candidate's oracle*: run the candidate's own grep/commands; the files, symbols and call-site count must reproduce. Off-by-a-couple is fine to correct in place; "can't reproduce" kills the candidate. The oracle is **binary** — it replays or the candidate dies — and carries **no** strength threshold (that's step 4): a *Worth-exploring* candidate with < 3 sites still passes its oracle.
2. **Re-argue the deletion test** from the call sites found, not from the proposer's summary (the `codebase-design` vocabulary — depth, a *real* seam vs a single-adapter hypothetical — is the rubric for borderline verdicts). Verdict flips → drop.
3. **Re-check the exclusion list**: is this a re-proposal of a filed/shipped seam or a settled ADR under a new name?
4. **Strength is earned, not asserted**: *Strong* needs ≥ 3 independent call sites (or 2+ adapters over the same data) plus a deletion-test verdict that survives step 2; anything weaker is *Worth-exploring*. Downgrade silently; never upgrade.

Dropped candidates don't appear in issues; a one-line "rejected at verification: <why>" list in the PRD keeps the sweep honest.

## Cross-area dedup

The same seam often surfaces from two areas (each sees its own call sites). Before writing issues, compare candidates **across** areas: same rule / same data adapters → merge into **one** issue in the area owning the proposed module, with the other area's call sites added to the slice and a pointer left in that area's PRD. Two half-issues for one seam is how you get conflicting implementations later.

## Issue lint — before commit

Every issue file must pass this checklist; fix or drop, don't commit a partial:

- [ ] *What to build* names the deep module/seam **and** lists every call site to repoint (paths, not "etc.")
- [ ] *Acceptance criteria* are checkable — tests at the new interface (asserting behaviour **through** it, not reaching past it), old copies deleted
- [ ] The **oracle** is present and replayable — the exact command(s) + counts reproduce **and** the *deletion-test verdict* is stated with its reasoning (not just "passes")
- [ ] *Strength* matches the verification rubric above
- [ ] *Blocked by* names a real issue file or "none"
- [ ] The issue is a **vertical slice** — independently grabbable, no "part 1 of 3"

## Alternative: a hands-off loop driver

If you want the literal hands-off loop instead of driving via sub-agents, run it through a driver — ralph (reference), Claude Code's native `/loop`, or Codex — see [DRIVERS.md](DRIVERS.md) for the exact commands and the per-driver caveats. Watch for dropped long calls and switch back to sub-agents if a driver churns.

## Output + commit

Write `.scratch/<area>-deepening[-delta2]/PRD.md` + `issues/NN-<slug>.md` + `RECEIPT.md` (below) in the vertical-slice format. Commit per area, staging ONLY that directory (never `git add -A` — the worktree may hold untracked driver tooling / runtime state); the whole-dir add already carries the receipt:

```
git -C "$WT" add .scratch/<area>-deepening-delta2
git -C "$WT" commit -m "docs(arch): <delta-vN> sweep — <area> (N new candidate(s))"
```

Mark the area `[x]` in the area checklist **immediately after its commit** (that pair is the resume checkpoint — see SETUP.md). **Do not push.**

### RECEIPT.md — a compact, SHA-anchored proof per area

Each area writes one `RECEIPT.md` beside its `PRD.md`, **rewritten whole** each area-attempt (never appended — a re-swept area's receipt fully replaces any partial from an aborted attempt, exactly like `PRD.md`). It is a **derived digest of pointers, never a copy**: it records the base SHA the sweep was verified against and *points* at the authoritative artifacts — it never re-types a rejection reason or a strength.

```
# RECEIPT — <area> — gen N
base: <full 40-char SHA of origin/<default-branch>, captured at preflight>
generation: N            # bare epic = 1, -deltaN = N  (numeric, never lexical)
filed:    issues/01-<slug>.md, issues/02-<slug>.md       # the authoritative issue files
rejected: see PRD.md §rejected (<count>)                 # the PRD owns the reasons
merged:   <NN-slug> merged-into <other-area>/issues/NN   # cross-area pointer, mirrors the PRD — a pointer, not a filed candidate
```

- **base** = the single preflight `origin/<default-branch>` SHA (SETUP.md), the **same value for every area** in the sweep — never a per-area `HEAD`. Record the **full** 40-char SHA (a `--short` can go ambiguous on an old repo and break `git log <sha>..`). The area commit's own SHA is deliberately omitted: it's always recoverable via `git log -- .scratch/<area>-deepening*/`, whereas the fork-point base is not, once the worktree is removed.
- **Authority rule:** `PRD.md` + `issues/` are the **sole** record of what was filed and rejected; `RECEIPT.md` is a derived digest — **never authoritative**. On any conflict the PRD/issues win and the receipt is regenerated. It is **never read to decide resume** (resume = per-area commit + ticked `fix_plan.md` box) — only a *later delta sweep* reads it.
- A **zero-candidate** area still writes a receipt (base SHA, empty `filed`, the rejected count). That's what lets a later sweep tell "swept clean @ this base" from "never swept".

> The *read* path — a later sweep consuming these receipts (newest generation by `max(N)`, a path-scoped `git log <base>..origin -- <area paths>` no-op test, loading the pointers as an exclusion map) — is the delta payoff and lands as a **separate** increment; this section only **writes** the receipt.

## Report

End with a table the user can scan in ten seconds, then the details:

| Area | Strong | Worth-exploring | Rejected at verification | Notes |
|---|---|---|---|---|

…plus the branch, the worktree path, the `.scratch/` paths, any `[!] needs manual look` areas with why, and whether the base went stale mid-sweep. Then ask whether the user wants the optional implement phase ([EXTENDING.md](EXTENDING.md)).
