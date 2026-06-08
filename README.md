# ralph-architecture-sweep

A [Claude Code](https://docs.claude.com/en/docs/claude-code) **skill** that drives [**ralph**](https://github.com/frankbria/ralph-claude-code) through an **architecture-deepening sweep** and files the findings as **vertical-slice issues** — over your whole codebase or a chosen part.

It runs the "deepening" methodology — deep vs shallow modules, the **deletion test**, seams — as an **analysis-only** pass, **delta-aware** (skips already-filed/shipped seams), and writes ready-to-grab issues under `.scratch/`. Optionally chain ralph to implement them.

## Requires

- **ralph** — [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code) (MIT), installed in your repo (`ralph-claude-code/`, `.ralphrc`, `.ralph/`).
- **Claude Code**.

## Install

**With `npx` (recommended)** — run from your project root:

```bash
npx github:Aijo24/ralph-architecture-sweep            # → ./.claude/skills/ralph-architecture-sweep
npx github:Aijo24/ralph-architecture-sweep --global   # → ~/.claude/skills/ (all projects)
```

Once it's published to the npm registry, the short form also works:

```bash
npx ralph-architecture-sweep
```

**Manual** — copy the skill folder yourself:

```bash
cp -R skills/ralph-architecture-sweep <your-repo>/.claude/skills/
```

Reload the session so the skill is picked up, then invoke `/ralph-architecture-sweep`.

## Use

`/ralph-architecture-sweep` — it:

1. **asks the scope** — the whole codebase or a chosen part (a subsystem / package / directory),
2. forks a `ralph/*` **worktree off your remote default branch** (so it sees shipped refactors and won't re-find them),
3. **sweeps** for deepening candidates (analysis-only, delta-aware) — robustly, via one sub-agent per area,
4. writes **vertical-slice issues** + a per-area PRD under `.scratch/`, committing per area.

Nothing is pushed — you review the issues before merging or implementing.

See [`SKILL.md`](skills/ralph-architecture-sweep/SKILL.md) for the full pipeline + guardrails, and [`EXTENDING.md`](skills/ralph-architecture-sweep/EXTENDING.md) for the optional, project-specific implement & deploy phases.

## Configure for your project

The skill uses generic placeholders — adapt:

- your **remote default branch** (e.g. `main`),
- your **area split** (subsystems / packages / directories — one ralph loop each),
- your **gates** (typecheck / test / lint) for the optional implement phase,
- your **ADRs** (decisions the sweep must not re-propose).

Keep infrastructure (servers, SSH, secrets, domains, deploy commands) **out of the skill** — those live in your own project.

## How it works

- **Deletion test** — imagine deleting a module: if complexity vanishes it was a pass-through (don't extract it); if complexity reappears across N callers it earns its keep (candidate).
- **Seam** — one rule across N call sites, or 2+ adapters over the same data.
- **Vertical-slice issue** — the deep module + every call site repointed + tests at the new interface + the old copies deleted, as one independently-grabbable ticket.
- **Robust driving** — headless ralph commits only at the end of an iteration, so a long analysis call that drops loses everything; this skill drives the sweep via short sub-agents instead.

## Credits

Built on **ralph** by Frank Bria — [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code) (MIT). This skill packages the architecture-deepening + issue-filing methodology as a ralph-driven pipeline.

## License

MIT — see [LICENSE](LICENSE).
