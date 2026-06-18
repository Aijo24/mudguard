# mudguard

> Versions 0.1.0–0.2.0 shipped under the project's former name, `ralph-architecture-sweep` (see [0.3.0](#030) for the rename). Historical entries below are left as-shipped.

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
