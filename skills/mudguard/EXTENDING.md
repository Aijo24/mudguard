# Extending — implement & deploy (optional, project-specific)

The sweep (Phases 0–2) is portable. Implementing the filed issues and shipping them is **specific to your stack** — wire these with your own commands. The shapes below are sketches, not recipes.

> **Do not hardcode infrastructure into a shared skill** — no server addresses, SSH details, secrets, internal domains, ports, or auth-token recipes. Keep all of that in your own (private) project config.

## Implement loop

After you review the filed issues, you can chain a loop to implement them:

- Fork an impl worktree off the sweep branch (so it has the issues), bootstrap your deps.
- Write the implement per-iteration spec + area checklist (for the ralph driver, `.ralph/PROMPT.md` / `.ralph/fix_plan.md` — see [DRIVERS.md](DRIVERS.md)): **one ticket per iteration**, **Strong-first**, behaviour-preserving (deletion test), each a vertical slice (the deep module + every call site repointed + tests at the new interface + the old inline copies deleted), then **your gates**, a changelog entry, and a conventional commit staging only changed files (never `git add -A`).
- Drive each ticket through Matt Pocock's `/tdd` skill (it's **model-invoked**, so — unlike the interactive sweep skills — it's loop-safe to reference): one tracer test red, then green, one slice at a time. Let the loop inherit that discipline instead of re-deriving red-green-refactor in the prompt; the vertical-slice contract above stays the definition of done.
- When a shipped slice encodes a **hard-to-reverse design decision**, have the loop run `/domain-modeling` (model-invoked, loop-safe) to record an ADR / update `CONTEXT.md`, so the *next* sweep excludes it via the respect-your-ADRs guardrail — closing the producer→consumer loop end to end. Implement-side only: the analysis-only sweep never writes ADRs.
- Launch your driver's loop (for ralph: `ralph-claude-code/ralph_loop.sh --live --verbose --auto-reset-circuit` — see [DRIVERS.md](DRIVERS.md)); monitor per-ticket commits (`git log` / the driver's live log).
- **Per-iteration timeout:** a loop driver may power through several tickets and get **cut mid-edit** on a later one when its iteration times out (for ralph, `CLAUDE_TIMEOUT_MINUTES` in `.ralphrc`; this is NOT a crash or a drop, and the driver status may still read `running`). **Finish the cut tail inline**, re-gate, commit — do NOT relaunch into a dirty tree. See [DRIVERS.md](DRIVERS.md).

## Gates

Run **your** project's gates (typecheck / tests / lint / type-of-build) and treat any failure as blocking — even one outside the current ticket's scope. **Pin any environment-dependent baseline noise** (tests that fail for reasons unrelated to the change, e.g. a shared/dirty test DB) so you can tell a real regression from the baseline rather than blaming the refactor. When a gate fails for a reason that is **not** pinned baseline noise, drive `/diagnosing-bugs` (model-invoked, loop-safe) to root-cause it before patching — don't blind-retry the ticket.

## Review & deploy

Optionally run a code-review pass and apply the safe fixes, then re-gate. Deploy through **your** pipeline (your CI, your environments). Keep every environment detail project-side and out of this skill. A good default guardrail: never push to a production branch without an explicit human go-ahead.
