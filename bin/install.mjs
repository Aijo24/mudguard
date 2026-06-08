#!/usr/bin/env node
// Installer for the "ralph-architecture-sweep" Claude Code skill.
// Copies the bundled skill into a project's (or the global) .claude/skills/ dir.
// No dependencies — pure Node (>=16.7 for fs.cpSync).
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const SKILL = "ralph-architecture-sweep";
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

Requires ralph in your repo: https://github.com/frankbria/ralph-claude-code
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
process.stdout.write(`[${SKILL}] requires ralph: https://github.com/frankbria/ralph-claude-code\n`);
