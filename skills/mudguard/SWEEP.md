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

1. **Replay the evidence — and independently re-derive it.** *This replay is the candidate's oracle.* First run the candidate's own grep/commands; the files, symbols and call-site count must reproduce. Then **derive the call-site set independently** — the verifier runs its *own* canonical/broad search for the symbol rather than trusting the proposer's pattern — and compares it to the claim. A replay catches a *fabricated* count; the independent search catches a *cherry-picked* one (a proposer that quietly chose a narrow grep finding only what it wanted). Proposer grep narrower than reality → correct to the verifier's own count, not the proposer's. "Can't reproduce at all" kills the candidate; off-by-a-couple is fine to correct in place. The oracle is **binary** — it replays or the candidate dies — and carries **no** strength threshold (that's step 4): a *Worth-exploring* candidate with < 3 sites still passes its oracle. *The candidate never picks the evidence its own gate runs on — out-of-sample, one level down.*
2. **Re-argue the deletion test** from the call sites found, not from the proposer's summary (the `codebase-design` vocabulary — depth, a *real* seam vs a single-adapter hypothetical — is the rubric for borderline verdicts). Verdict flips → drop.
3. **Re-check the exclusion list**: is this a re-proposal of a filed/shipped seam or a settled ADR under a new name?
4. **Strength is earned, not asserted**: *Strong* needs ≥ 3 independent call sites (or 2+ adapters over the same data) plus a deletion-test verdict that survives step 2; anything weaker is *Worth-exploring*. Downgrade silently; never upgrade.
5. **Scale the bar to the proposer's noise (survival gate).** Once every candidate in the area is judged at the default `≥ 3` bar, tally what the proposer fired: `proposed` = its **full** output for the area *including candidates that died at the oracle in step 1* (those are the noisiest), and `survival_rate` = (Strong + Worth-exploring) / `proposed`. An area that fired 20 and kept 2 is a noisy proposer; its 2 survivors deserve more scrutiny than survivors from an area that proposed 3 and kept 2 — yet a fixed bar clears them both. That's the multiple-comparisons hole. So when `proposed ≥ 8` (below that the rate is statistical noise — record it, don't act on it):
   - `survival_rate ≥ 0.33` → Strong bar stays `≥ 3` sites.
   - `survival_rate < 0.33` → Strong now needs `≥ 4` sites; flag the area `noisy_proposer`.
   - `survival_rate < 0.15` → Strong now needs `≥ 5` sites; flag the area `noisy_proposer`.

   Re-check each *Strong* survivor against the raised bar and **downgrade** the ones that no longer clear it to *Worth-exploring*. Only ever downgrade — never reject and never upgrade — so the rate can't feed back on itself (a downgrade leaves `filed` and `survival_rate` unchanged). The `noisy_proposer` flag and the `proposed`/`survival_rate` tally ride into the receipt (below) and the report.

Dropped candidates don't appear in issues; a one-line "rejected at verification: <why>" list in the PRD keeps the sweep honest, so at this point **`proposed = (strong + worth_exploring) + rejected count`**. Cross-area dedup (below) runs *after* this gate and may move a survivor out of this area into a `merged:` pointer — it still *survived*, so the receipt keeps it in the numerator: **`proposed = (strong + worth_exploring) + merged_out + rejected count`**, `survival_rate = (strong + worth_exploring + merged_out) / proposed`. It's all a tally of what the PRD already records, nothing new to author.

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

## Churn — the durability signal

A Strong seam in a stable core and a Strong seam in a package three people are rewriting this sprint are not the same finding: the second has a **short half-life** (it may be obsolete before the issue is triaged) and is a **merge-conflict risk** for the implement phase. Git already tells you which is which — you fetched the remote tip, so measure the area's recent velocity per `paths`, windowed to the 30 days **before `base`**. Anchor the window to `base`'s *own* commit date with epoch arithmetic — `--since="30 days ago"` would anchor to wall-clock *now* and mis-measure any sweep whose base isn't today (a delta or a resumed sweep), and git's approxidate does **not** evaluate `<iso-date> - 30 days`:

```
BD=$(git -C "$WT" show -s --format=%ct <base>)        # base's committer date, unix epoch
git -C "$WT" log --since="@$((BD - 2592000))" --until="@$BD" --oneline <base> -- <area paths> | wc -l                      # commits in the 30 days before base (2592000 = 30×86400)
git -C "$WT" log --since="@$((BD - 2592000))" --until="@$BD" --name-only --pretty=format: <base> -- <area paths> | sort -u | grep -c .   # distinct files
```

Classify into the receipt's `churn_30d` + the report's Durability column (the files clause **overrides** the commit bands — check it first):

- **collision-risk** if `> 15 commits` **OR** `> 8 files` (e.g. 3 commits across 12 files is still collision-risk) → short half-life; flag it so a human/orchestrator implements it first, or holds off.
- else **active** if `4–15 commits`.
- else **durable** (`≤ 3 commits` and `≤ 8 files`) → stable core; the finding will keep.

This *durability* measure is scoped to the 30 days **before `base`** — absolute velocity, the same for the area regardless of when it was last swept. Don't confuse it with the read-path's *drift-since-our-base* test (`git log <base>..origin -- <paths>`, §RECEIPT.md): that one is **empty on a fresh sweep** (base *is* the tip) and only becomes meaningful for a *later* sweep deciding whether a past rejection has expired. Same git, two different questions — "is this area hot right now?" vs "has it moved since we last looked?".

## Output + commit

Write `.scratch/<area>-deepening[-delta2]/PRD.md` + `issues/NN-<slug>.md` + `RECEIPT.md` (below) in the vertical-slice format. Commit per area, staging ONLY that directory (never `git add -A` — the worktree may hold untracked driver tooling / runtime state); the whole-dir add already carries the receipt:

```
git -C "$WT" add .scratch/<area>-deepening-delta2
git -C "$WT" commit -m "docs(arch): <delta-vN> sweep — <area> (N new candidate(s))"
```

Mark the area `[x]` in the area checklist **immediately after its commit** (that pair is the resume checkpoint — see SETUP.md). **Do not push.**

### RECEIPT.md — a compact, SHA-anchored proof per area

Each area writes one `RECEIPT.md` beside its `PRD.md`, **rewritten whole** each area-attempt (never appended — a re-swept area's receipt fully replaces any partial from an aborted attempt, exactly like `PRD.md`). It is a **derived digest, never a copy**: every field is a tally, a git stat, or a pointer — all regenerable from `PRD.md` + `issues/` + git. It records the base SHA the sweep was verified against, the survival accounting, the area's churn, and *points* at the authoritative artifacts for the prose — it **never re-types a rejection reason or a strength**.

```
# RECEIPT — <area> — gen N
base: <full 40-char SHA of origin/<default-branch>, captured at preflight>
generation: N            # bare epic = 1, -deltaN = N  (numeric, never lexical)
paths: [src/auth/, src/auth/scim/]      # the area's source paths — what the read-path's no-op + churn tests run against
proposed: 14             # the proposer's FULL output for the area (incl. oracle-replay failures — the noisiest)
strong: 3                # filed at Strong, after the survival gate (step 5)
worth_exploring: 2       # filed at Worth-exploring
survival_rate: 0.43      # survivors / proposed = (3 strong + 2 worth + 1 merged-out) / 14 — a merged-out candidate survived (filed elsewhere)
noisy_proposer: false    # true ONLY when the gate raised the bar (proposed ≥ 8 AND survival < 0.33); here 0.43 ≥ 0.33 → false
churn_30d: {commits: 41, files: 12}     # area velocity in the 30 days before base — here collision-risk (>15 commits / >8 files)
filed:    issues/01-<slug>.md, …         # the 5 authoritative issue files (3 strong + 2 worth)
rejected:                                # oracle-anchored rejections ONLY — a subset of the 8 (= proposed 14 − filed 5 − merged 1); the PRD owns the full list + the prose
  - seam: user-rule-dedup
    paths: [src/auth/]
    oracle_at_base: "1 call site @ <base>"   # a rejection whose evidence DID replay (single-adapter hypothetical) — the read-path can re-test it
    reason: see PRD.md §rejected             # pointer — prose stays in the PRD
  # … oracle-FAILURE rejections (unreproducible / cherry-picked counts) get NO entry here — no replayable oracle_at_base; they live only in PRD §rejected
merged:   <NN-slug> merged-into <other-area>/issues/NN   # cross-area survivor relocated; a pointer (not a filed candidate), but it counts toward survival_rate
```

- **base** = the single preflight `origin/<default-branch>` SHA (SETUP.md), the **same value for every area** in the sweep — never a per-area `HEAD`. Record the **full** 40-char SHA (a `--short` can go ambiguous on an old repo and break `git log <sha>..`). The area commit's own SHA is deliberately omitted: it's always recoverable via `git log -- .scratch/<area>-deepening*/`, whereas the fork-point base is not, once the worktree is removed.
- **paths** = the area's source path(s) (SETUP.md), the unit the read-path's no-op test (`git log <base>..origin -- <paths>`) and the churn measure both run against. Without them a later sweep can't tell whether a rejection has gone stale.
- **proposed / strong / worth_exploring / survival_rate / noisy_proposer** = the survival accounting (step 5). `proposed` is the proposer's full output; the survivors are `strong + worth_exploring` **plus any candidate merged out** to another area (cross-area dedup runs *after* the gate — a merged-out candidate survived, it's just filed elsewhere), so `survival_rate = (strong + worth_exploring + merged_out) / proposed` and `rejected count = proposed − (strong + worth_exploring + merged_out)`. These are tallies of what the PRD already records — the PRD stays authoritative; the receipt just makes the rate machine-readable, so a flood of candidates is visible without re-reading the PRD.
- **churn_30d** = commits and distinct files touched under `paths` in the 30 days **before** `base` (§Churn) — the durability / collision-risk signal. A Strong seam in a churning package is a short-half-life finding and a merge-conflict risk for the implement phase; a Strong seam in a stable core is durable.
- **rejected[]** = SHA-anchored negative-result memory — but **only the oracle-anchored rejections**: those whose evidence *replayed* (a single-adapter hypothetical, or a deletion-test / exclusion rejection that reproduced its call sites) and so carry a real `oracle_at_base`. A candidate that died *at* the oracle in step 1 (a fabricated or cherry-picked count that couldn't reproduce) gets **no** entry — there's nothing to re-test — so it counts toward `proposed` and the PRD's prose rejection list but not here. Hence `len(rejected[]) ≤ rejected count`; the scalar identity above uses the PRD's full count, never the array length. Each entry names the rejected `seam`, its `paths`, the `oracle_at_base` (the replayable fact at `base`, e.g. "1 call site"), and a **pointer** to the PRD for the prose reason — the seam + base + paths are exactly what a later sweep needs to decide whether the rejection has expired, *without* the receipt ever owning the reason. A single-adapter hypothetical rightly rejected at `base` becomes a real seam once a second adapter lands; that's why the revisit is anchored to whether `paths` changed since `base`, not to the reason text.
- **Authority rule (unchanged):** `PRD.md` + `issues/` are the **sole** record of what was filed and rejected and *why*; `RECEIPT.md` is a derived digest — **never authoritative**. On any conflict the PRD/issues win and the receipt is regenerated. It is **never read to decide resume** (resume = per-area commit + ticked `fix_plan.md` box) — only a *later delta sweep* reads it.
- A **zero-candidate** area still writes a receipt (base SHA, `paths`, `proposed`/`survival_rate`, `churn_30d`, empty `filed`). That's what lets a later sweep tell "swept clean @ this base" from "never swept".

> **Read-path (Inc-2, the delta payoff — not yet wired).** A later sweep consumes these receipts: newest generation per area by `max(N)`; load `rejected[].seam` into the exclusion map alongside the epics + CONTEXT/ADRs (so a killed seam isn't re-proposed and re-killed full-freight every run); then per rejection run the path-scoped `git log <base>..origin -- <paths>` no-op test — **unchanged → keep excluding; churned → the rejection may have expired, allow a re-propose**. This is the negative-result memory the loop is missing today. It lands as a **separate, independently-verified increment**; this section only **writes** the receipt that makes it possible.

## Report

End with a table the user can scan in ten seconds, then the details:

| Area | Proposed | Strong | Worth-exploring | Rejected | Survival | Durability | Notes |
|---|---|---|---|---|---|---|---|

…where **Proposed / Survival** expose the multiple-comparisons signal — a low survival rate over many proposals is a noisy proposer whose survivors had to clear the raised bar (step 5), tagged `noisy_proposer` in Notes — and **Durability** is `durable` / `active` / `collision-risk` from `churn_30d` (a collision-risk Strong is a short-half-life finding: implement it first or hold). Plus the branch, the worktree path, the `.scratch/` paths, any `[!] needs manual look` areas with why, and whether the base went stale mid-sweep. Then ask whether the user wants the optional implement phase ([EXTENDING.md](EXTENDING.md)).
