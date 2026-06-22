# mudguard

> Versions 0.1.0–0.2.0 shipped under the project's former name, `ralph-architecture-sweep` (see [0.3.0](#030) for the rename). Historical entries below are left as-shipped.

## 0.5.0

The receipt **read-path** — the increment deferred in 0.4.0 (Inc-2). 0.4.0 made every area *write* a SHA-anchored receipt; 0.5.0 makes the next delta sweep *consume* it, so the sweep finally **compounds across runs** instead of re-doing work every time. This was the riskiest part for delta correctness, so it shipped on its own and was built **fail-open** by design: any uncertainty re-sweeps rather than silently suppress a now-real seam.

### Minor Changes

- **Whole-area no-op skip.** In preflight, a delta sweep takes each area's newest receipt and tests `git log <last_base>..origin/<branch> -- <area paths>`; if the base is reachable, an ancestor of the tip, every path still resolves, and the log is empty, the area hasn't changed since it was last swept → it is **skipped** (no proposer runs), writes a minimal no-op receipt (`proposed: 0`, `noop: no change since <last_base>`), and is reported as "swept clean @ base, skipped." ([SETUP.md](skills/mudguard/SETUP.md) §Delta read-path.)

- **Per-seam rejection memory.** For an area that *did* change, the proposer's exclusion map now also carries the prior sweep's **rejected seams**, **unioned across all generation receipts** (each receipt holds only its own generation's kills, so newest-only would forget older ones). Each is re-tested against its *own* anchor (`git log <rejection.base>..origin -- <rejection.paths>`): unchanged → excluded so it isn't re-proposed and re-killed full-freight; changed → re-evaluated fresh (a single-adapter hypothetical may have gained a second adapter). This is the negative-result memory the loop was missing. ([SETUP.md](skills/mudguard/SETUP.md) §Delta read-path.)

- **Fail-open prime directive.** Whenever the read-path cannot *confirm* an area or seam is unchanged — base SHA unreachable, not an ancestor (force-push / rewritten history), a path no longer resolves, or a receipt is missing / pre-v0.4.0 / unparseable — it neither skips nor excludes: it sweeps and re-evaluates, and logs what it couldn't use. Old epics with no v2 receipt fall back to the prior behaviour (epics + CONTEXT/ADR exclusions only).

- **Invariants preserved.** The receipt is still a **hint, never authority** (PRD/issues own filed/rejected); resume still reads only `git log -- .scratch/` + the `fix_plan.md` boxes and **never** a receipt (a no-op-skipped area is "done" via its commit + tick). The report gains the skip/exclude/re-evaluate counts.

## 0.4.0

The receipt stops being a bare delta marker and becomes the substrate that makes the sweep **compound across runs**. One artifact (`RECEIPT.md`) now does three jobs — survival accounting, negative-result memory, and a durability flag — and the verifier is hardened one level down. This is the **write-side** increment (Inc-1); the receipt **read-path** (Inc-2) is specced and flagged but deliberately landed separately.

### Minor Changes

- **Survival gate — scale *Strong* to the proposer's noise.** The `Strong = ≥ 3 call sites` bar was fixed regardless of how many candidates an area fired — the multiple-comparisons hole: an area that proposed 20 and kept 2 cleared the same bar as one that proposed 3 and kept 2. The verification pass now tallies `proposed` (the proposer's full output, including oracle-replay failures) and `survival_rate`, and when `proposed ≥ 8` raises the bar on noisy areas (`survival < 0.33` → `≥ 4` sites; `< 0.15` → `≥ 5`) and flags them `noisy_proposer`. Survivors that no longer clear the raised bar are **downgraded** to *Worth-exploring* — never rejected, never upgraded, so the rate can't feed back on itself. ([SWEEP.md](skills/mudguard/SWEEP.md) step 5.)

- **Churn — a per-area durability / collision-risk flag.** A Strong seam in a stable core and one in a package three people are rewriting this sprint are not the same finding. Each area now records `churn_30d` (commits + files touched under its paths in the 30 days before `base`) and a `durable` / `active` / `collision-risk` label — a short-half-life finding may be obsolete before it's triaged and is a merge-conflict risk for the implement phase. Distinct from the read-path's *drift-since-base* test (empty on a fresh sweep). The implement loop is now **durability-aware** (collision-risk areas first, or held). ([SWEEP.md](skills/mudguard/SWEEP.md) §Churn, [EXTENDING.md](skills/mudguard/EXTENDING.md).)

- **Verifier independent search (out-of-sample, one level down).** Step 1 replayed the proposer's *own* grep — which catches a fabricated count but not a proposer that quietly chose a narrow grep finding only what it wanted. The verifier now **derives the call-site set with its own canonical search** and corrects a cherry-picked count to its own. The candidate no longer picks the evidence its own gate runs on. ([SWEEP.md](skills/mudguard/SWEEP.md) step 1.)

- **Receipt schema v2 — negative-result memory + survival + churn, still pointer-authority.** `RECEIPT.md` gains `paths`, `proposed`/`strong`/`worth_exploring`/`survival_rate`/`noisy_proposer`, `churn_30d`, and a SHA-anchored `rejected[]` list (each entry: `seam` + `paths` + `oracle_at_base` + a **pointer** to the PRD for the prose reason). Every field is a tally, a git stat, or a pointer — all regenerable — so the **authority rule is unchanged**: `PRD.md` + `issues/` stay the sole record of what was filed/rejected and *why*; the receipt is never authoritative and never read on resume. The report table gains `Proposed` / `Survival` / `Durability` columns. ([SWEEP.md](skills/mudguard/SWEEP.md) §RECEIPT.md.)

### Deferred (Inc-2, next)

- **Receipt read-path** — a later sweep consuming receipts: load `rejected[].seam` into the exclusion map (so a killed seam isn't re-proposed and re-killed full-freight every run), then run the path-scoped `git log <base>..origin -- <paths>` no-op test per rejection — unchanged → keep excluding; churned → the rejection may have expired (a single-adapter hypothetical becomes a real seam once a second adapter lands), allow a re-propose. Specced in [SWEEP.md](skills/mudguard/SWEEP.md) §RECEIPT.md and [SETUP.md](skills/mudguard/SETUP.md); lands as its own independently-verified increment because it's the riskiest part for delta correctness.

## 0.3.0

### Minor Changes

- **Breaking — renamed `ralph-architecture-sweep` → `mudguard`.** Command `/ralph-architecture-sweep` → `/mudguard` (plugin: `/mudguard:mudguard`); npm package `mudguard` (the old `ralph-architecture-sweep` package is deprecated and points here); plugin install `/plugin marketplace add Aijo24/mudguard` + `/plugin install mudguard@aijo24`; worktree branches `mudguard/*`. The project is no longer "a ralph sweep" — it's an orchestration + verification layer for architecture deepening, and the name reflects that.

- **Decouple the loop engine.** The pipeline is now engine-neutral: the default drives the sweep via short sub-agents (no external engine), and a new `DRIVERS.md` covers running the hands-off loop on a swappable driver — ralph (the reference), Claude Code's native `/loop`, or Codex. ralph-specific mechanics (tooling copy, commit-at-end caveat, `ralph_loop.sh`, `.ralphrc`, per-call timeout) moved out of the core narrative into the ralph driver section.

- **Reposition the README around the differentiator** — lead with "autonomous, independently-verified architecture deepening, the headless counterpart of the now-interactive architecture skills" rather than "drives ralph through a sweep"; the engine is framed as interchangeable.

## 0.2.0

### Minor Changes

- **Breaking:** the skill is now **user-invoked only** (`disable-model-invocation: true`). Claude no longer auto-fires it mid-conversation — you trigger the sweep explicitly with `/ralph-architecture-sweep`. It forks a worktree and runs a long, expensive loop, so manual-only invocation matches its real cost profile. Adds an `argument-hint` for the optional `[path-or-subsystem]` argument.

- Ship as a **Claude Code plugin**. Adds `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`, so you can install with `/plugin marketplace add Aijo24/ralph-architecture-sweep` then `/plugin install ralph-architecture-sweep@aijo24`, and get `/plugin update` + marketplace discoverability. Plugin installs are **namespaced** (`/ralph-architecture-sweep:ralph-architecture-sweep`); the `skills` CLI (recommended) and manual copy still give the plain `/ralph-architecture-sweep`.

- Re-attribute the methodology to its current upstream homes after [mattpocock/skills](https://github.com/mattpocock/skills) reorganised into user- vs model-invoked skills. The deepening vocabulary (deep vs shallow modules, the deletion test, seams) now comes from **`codebase-design`**; the vertical-slice issue format stays with **`to-issues`**; the scan-and-deepen workflow is the headless analogue of **`improve-codebase-architecture`** (now an interactive, user-invoked tool this skill deliberately does **not** call); and the ADR / `CONTEXT.md` discipline behind the "respect your ADRs" guardrail mirrors **`domain-modeling`**. The pipeline **inlines** that methodology and runs it headlessly via ralph rather than invoking the now-interactive skills (which would hang under headless `claude`).

- Wire the new **model-invoked, loop-safe** skills into the optional implement path: drive each ticket through **`/tdd`**, root-cause non-baseline gate failures with **`/diagnosing-bugs`**, and record hard-to-reverse decisions with **`/domain-modeling`** so the next sweep excludes them. The analysis-only sweep still writes zero source edits and no ADRs.

- Consume an optional **decision record** (`CONTEXT.md` / ADR log) in the sweep's exclusion map, closing the producer→consumer loop with `domain-modeling`. With no record present the guardrail is simply a no-op.

- Sharpen the inlined deepening vocabulary to match `codebase-design`: **define deep vs shallow modules** (previously named but never defined), state the canonical **seam** definition (a place you can change behaviour without editing there; a single adapter is only a hypothetical seam), and add **adapter** / **depth** glosses. Add the "tests assert behaviour **through** the new interface" principle to the issue template and the issue-lint checklist.

### Patch Changes

- Make the "inline the methodology rather than call the interactive skills" decision explicit and vindicated in the docs, guarding against a future "just call `/improve-codebase-architecture`" regression. Demote the bespoke npx installer to a clearly-labelled fallback behind the `skills` CLI and the plugin, and keep `package.json` and `plugin.json` versions in sync.

## 0.1.0

### Minor Changes

- Initial release. Drive **ralph** (Frank Bria's autonomous loop) through an architecture-deepening sweep and file the findings as **vertical-slice issues**, over a whole codebase or a chosen part. Analysis-only and delta-aware, with an independent **propose/verify split** (a fresh verifier replays each candidate's evidence and re-argues the deletion test), cross-area dedup, issue linting, and per-area resumable checkpoints. Ships the skill (`SKILL.md` + `SETUP.md` / `SWEEP.md` / `EXTENDING.md`) and an npx installer.
