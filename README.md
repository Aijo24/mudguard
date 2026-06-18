# mudguard

[![Skills](https://skills.sh/b/Aijo24/mudguard)](https://skills.sh/Aijo24/mudguard)
[![npm version](https://img.shields.io/npm/v/mudguard.svg)](https://www.npmjs.com/package/mudguard)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Autonomous, independently-verified architecture deepening** — the headless counterpart of the now-interactive architecture skills.

mudguard is a [Claude Code](https://docs.claude.com/en/docs/claude-code) **skill**: an **orchestration + verification layer** that runs the deep-module / **deletion-test** methodology over your codebase — the **whole thing or a chosen part** — **headlessly**, **delta-aware** (skips already-filed/shipped seams), with an **independent propose/verify pass** on every candidate, and files the survivors as ready-to-grab **vertical-slice issues** under `.scratch/`. It keeps your architecture from silting up with shallow, duplicated seams.

**The engine is interchangeable; the layer is the value.** The durable part is mudguard's layer — inlined methodology + propose/verify + delta-awareness + ADR closure. *How* the loop runs is a swappable **driver**: by default mudguard drives the sweep itself via short sub-agents (no external engine); for a hands-off loop, plug in [ralph](https://github.com/frankbria/ralph-claude-code), Claude Code's native `/loop`, or Codex — see [`DRIVERS.md`](skills/mudguard/DRIVERS.md).

## Requires

- **Claude Code**.
- A loop **driver** is *optional* — the default drives via sub-agents and needs none. For a hands-off loop: [ralph](https://github.com/frankbria/ralph-claude-code) (the reference driver), the native `/loop`, or Codex. See [`DRIVERS.md`](skills/mudguard/DRIVERS.md).

## Install

**With the `skills` CLI (recommended)** — run from your project root:

```bash
npx skills add Aijo24/mudguard
```

Installs to `.claude/skills/mudguard/`, so you invoke it as `/mudguard`. This is the install path tracked by [skills.sh](https://skills.sh/Aijo24/mudguard).

**As a Claude Code plugin** — if you want `/plugin` version tracking + updates:

```text
/plugin marketplace add Aijo24/mudguard
/plugin install mudguard@aijo24
```

Plugin-installed skills are **namespaced by the plugin**, so you invoke this one as `/mudguard:mudguard` (vs the plain `/mudguard` from every other path). The trade-off buys you `/plugin update` and marketplace discoverability.

**Fallback: npx installer** — for setups without the `skills` CLI or plugin support:

```bash
npx mudguard            # → ./.claude/skills/mudguard
npx mudguard --global   # → ~/.claude/skills/ (all projects)
npx github:Aijo24/mudguard   # straight from GitHub, no npm account needed
```

**Manual** — copy the skill folder yourself:

```bash
cp -R skills/mudguard <your-repo>/.claude/skills/
```

Reload the session so the skill is picked up, then invoke `/mudguard` (or `/mudguard:mudguard` if you went the plugin route).

## Use

`/mudguard` (or `/mudguard <path-or-subsystem>` to skip the scope question) — it:

1. **resolves the scope** — the whole codebase or a chosen part (a subsystem / package / directory); asks only if ambiguous, defaults to the whole codebase unattended,
2. forks a `mudguard/*` **worktree off your remote default branch** (so it sees shipped refactors and won't re-find them) — or **resumes** an interrupted sweep from its per-area checkpoints,
3. **sweeps** for deepening candidates (analysis-only, delta-aware) — robustly, via one sub-agent per area with a one-retry policy,
4. **verifies every candidate independently** — replays the evidence, re-argues the deletion test, dedupes seams across areas; unverifiable candidates are dropped, not filed,
5. writes **vertical-slice issues** + a per-area PRD under `.scratch/`, lint-checked against the issue template, committing per area.

Nothing is pushed — you review the issues before merging or implementing.

See [`SKILL.md`](skills/mudguard/SKILL.md) for the full pipeline + guardrails, [`DRIVERS.md`](skills/mudguard/DRIVERS.md) for running it on ralph / native `/loop` / Codex, and [`EXTENDING.md`](skills/mudguard/EXTENDING.md) for the optional, project-specific implement & deploy phases.

## Configure for your project

The skill uses generic placeholders — adapt:

- your **remote default branch** (e.g. `main`),
- your **area split** (subsystems / packages / directories — one loop iteration each),
- your **driver** (sub-agents by default; ralph / `/loop` / Codex for a hands-off loop — see [`DRIVERS.md`](skills/mudguard/DRIVERS.md)),
- your **gates** (typecheck / test / lint) for the optional implement phase,
- your **decision record** — a `CONTEXT.md` and/or ADR log of decisions the sweep must not re-propose (no record yet? Matt Pocock's `domain-modeling` skill writes one inline; until you have one the guardrail is a no-op).

Keep infrastructure (servers, SSH, secrets, domains, deploy commands) **out of the skill** — those live in your own project.

## How it works

- **Deletion test** — imagine deleting a module: if complexity vanishes it was a pass-through (don't extract it); if complexity reappears across N callers it earns its keep (candidate).
- **Seam** — a place you can change behaviour without editing there; a *real* one is one rule across N call sites, or 2+ adapters over the same data (a single adapter is only a hypothetical seam).
- **Vertical-slice issue** — the deep module + every call site repointed + tests at the new interface + the old copies deleted, as one independently-grabbable ticket.
- **Interchangeable engine** — the sweep drives via short sub-agents by default (a long loop call that drops loses everything); a hands-off loop runs on a swappable driver (ralph / native `/loop` / Codex). The layer is the value, not the engine.
- **Propose / verify split** — a fresh verifier (that never sees the proposer's reasoning, only its claims) replays each candidate's evidence and re-argues the deletion test; "Strong" must be earned (≥ 3 independent call sites, or 2+ adapters over the same data).

## Credits

- **ralph** by Frank Bria — [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code) (MIT): the reference loop driver mudguard was first built on (now one of several swappable engines).
- **Matt Pocock's skills** — [mattpocock/skills](https://github.com/mattpocock/skills): the methodology mudguard runs. The deepening vocabulary (deep vs shallow modules, the deletion test, seams) is from **`codebase-design`**; the vertical-slice issue format is from **`to-issues`**; the scan-and-deepen workflow is the headless analogue of **`improve-codebase-architecture`**; and the ADR / `CONTEXT.md` discipline behind the "respect your ADRs" guardrail mirrors **`domain-modeling`**. These upstream skills are now interactive and **user-invoked** (they present reports and grill you, and would hang under headless `claude`), so mudguard **inlines their methodology and runs it headlessly** rather than calling them.
- **John Ousterhout**, *A Philosophy of Software Design* — the underlying ideas (deep modules, the deletion test) the deepening vocabulary builds on.

This repo is original packaging that orchestrates the methodology through a loop driver; it does not redistribute either project's code.

## License

MIT — see [LICENSE](LICENSE).
