#!/usr/bin/env node
// Installer for the "mudguard" Claude Code skill (FALLBACK path).
// Copies the bundled skill into a project's (or the global) .claude/skills/ dir.
// No dependencies — pure Node (>=16.7 for fs.cpSync).
//
// Prefer `npx skills add Aijo24/mudguard` (tracked by skills.sh) or the Claude Code
// plugin (`/plugin install mudguard@aijo24`, which adds version tracking + `/plugin
// update`). This installer exists for setups without either.
// Maintainers: keep `version` in sync across package.json and .claude-plugin/plugin.json.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const SKILL = "mudguard";
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "skills", SKILL);

const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help")) {
  process.stdout.write(`
Install the "${SKILL}" Claude Code skill.

Usage:
  npx ${SKILL} [target-dir]     install into <target-dir>/.claude/skills (default: current dir)
  npx ${SKILL} --global         install into ~/.claude/skills (all projects)
  npx ${SKILL} --help

A loop driver is optional (the default drives via sub-agents); for a hands-off loop see DRIVERS.md.
After installing, reload Claude Code and run /${SKILL}.
`);
  process.exit(0);
}

if (!existsSync(src)) {
  process.stderr.write(`[${SKILL}] error: bundled skill not found at ${src}\n`);
  process.exit(1);
}

const isGlobal = args.includes("--global") || args.includes("-g");
const positional = args.find((a) => !a.startsWith("-"));
const base = isGlobal ? homedir() : resolve(positional ?? process.cwd());
const claudeDir = join(base, ".claude");
const skillsDir = join(claudeDir, "skills");
const dest = join(skillsDir, SKILL);

const hadClaude = existsSync(claudeDir);
const updating = existsSync(dest);

try {
  mkdirSync(skillsDir, { recursive: true });
  cpSync(src, dest, { recursive: true });
} catch (err) {
  process.stderr.write(`[${SKILL}] error: ${err && err.message ? err.message : err}\n`);
  process.exit(1);
}

const files = readdirSync(dest)
  .filter((f) => f.endsWith(".md"))
  .sort();

process.stdout.write(`[${SKILL}] ${updating ? "updated" : "installed"} -> ${dest}\n`);
process.stdout.write(`[${SKILL}] files: ${files.join(", ")}\n`);
if (!hadClaude) {
  process.stdout.write(`[${SKILL}] note: created ${claudeDir} (no .claude/ existed here)\n`);
}
process.stdout.write(`[${SKILL}] next: reload Claude Code, then run /${SKILL}\n`);
process.stdout.write(`[${SKILL}] drivers (optional, for a hands-off loop): see DRIVERS.md\n`);
