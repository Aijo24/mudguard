# Drivers — how you run the loop (optional)

mudguard's pipeline (Phases 0–2) is **engine-neutral**. *How* you actually run the per-area loop is a swappable **driver**. The methodology, the propose/verify split, delta-awareness, and ADR closure don't change between drivers — only the runner does.

## Default: sub-agents (no external engine)

The default needs **no driver at all**: mudguard drives the sweep itself by fanning out one short sub-agent per area (the agent tool), then a fresh verifier per area (see [SWEEP.md](SWEEP.md)). This is the most robust path — short calls don't lose work on a drop — and it's what runs unless you opt into a hands-off loop. If you only want the analysis sweep, you can stop reading here.

For a **literal hands-off autonomous loop** (especially the optional implement phase, [EXTENDING.md](EXTENDING.md)), pick one of the drivers below. Each maps the same per-iteration spec + area checklist + per-area commits onto its own runner; all keep the analysis-only / no-push / worktree guardrails from [SKILL.md](SKILL.md).

## ralph (reference driver)

[frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code) (MIT) — the autonomous loop mudguard was first built on, and the most battle-tested driver.

- **Install** (yours to audit, mudguard fetches nothing): `ralph-claude-code/`, `.ralphrc`, `.ralph/` present in the repo.
- **Tooling into the worktree** (local copy, nothing downloaded):
  ```
  cp -R <repo>/ralph-claude-code "$WT"/ && cp <repo>/.ralphrc "$WT"/
  ```
- **Backlog files**: the per-iteration spec is `.ralph/PROMPT.md`, the area checklist is `.ralph/fix_plan.md` (ralph logs "Remaining tasks: N" at startup — confirms scoping). Overwrite them per epic.
- **Config guardrail**: `.ralphrc` `ALLOWED_TOOLS` should omit `git push`.
- **Run the hands-off loop** (analysis sweep, if the API is calm):
  ```
  # reset a stale session FIRST, in a SEPARATE invocation (it exits without looping):
  bash ralph-claude-code/ralph_loop.sh --reset-session
  # then run:
  bash ralph-claude-code/ralph_loop.sh --live --verbose --auto-reset-circuit
  ```
  Monitor `.ralph/live.log` + `.ralph/status.json` (`status:"completed"`).
- **Caveat — commit-at-end**: headless ralph (`claude -p`, JSON mode) commits only at the END of a successful iteration, so a long call that drops mid-stream discards the whole iteration and its spend, and auto-reset re-burns long calls until the circuit breaker. Prefer sub-agents for the analysis sweep; watch for dropped long calls and stop rather than letting auto-reset churn.
- **Caveat — per-call timeout (implement phase)**: `CLAUDE_TIMEOUT_MINUTES` in `.ralphrc`. ralph is not strictly one-ticket-per-iteration — a session can power through several tickets and get **cut mid-edit** on a later one (the iteration times out; not a crash or a drop, and `status.json` may still read `running`). **Finish the cut tail inline**, re-gate, commit — don't relaunch into a dirty tree.

## Claude Code native `/loop` (sketch)

Claude Code ships a built-in `/loop` that runs a prompt or command on a recurring cadence (or self-paced). To use it as a driver:

- Put the per-iteration spec (the inlined methodology + the one-area brief) in the `/loop` prompt; keep the area checklist as a plain `fix_plan.md` in the worktree.
- One iteration = one area: the prompt picks the first unchecked area, sweeps it, writes `.scratch/<area>-deepening*/`, commits, ticks the box. Per-area commits + the checklist are the same resume checkpoint.
- No external tooling to copy, no `.ralphrc`. The analysis-only / no-push / worktree guardrails are enforced in the prompt itself.
- Because `/loop` iterations are ordinary turns (not one long headless call), they avoid ralph's commit-at-end failure mode — but still keep each iteration to one area so a drop costs at most one area.

## Codex (sketch)

Codex's agentic automations converge on the same shape — a repeated, self-checkpointing loop:

- Encode the per-iteration spec as the Codex task prompt; track areas in the same `fix_plan.md` checklist + per-area commits.
- Map "one area per iteration" onto a Codex run; gate each iteration on the analysis-only / no-push guardrails.
- Keep the propose/verify split: a separate verification pass per area (a second Codex step or a sub-agent) re-grounds candidates before issues are written.

## Adding a driver

A driver only has to: (1) run one area per iteration off the per-iteration spec, (2) commit per area and tick the checklist (the resume checkpoint), (3) honour the analysis-only / no-push / worktree guardrails. Anything that can do that — a CI loop, a cron agent, a future native primitive — is a valid driver. The mudguard layer (methodology + propose/verify + delta + ADR closure) is unchanged.
