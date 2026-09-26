# AGENTS.md

## How to talk to the user

Always talk in **simple English**. Use normal, everyday words. Keep technical words to a minimum, and only when there is no simpler word. Short sentences. Explain what you did in plain terms, not jargon.

## Version, changelog and git

This project has a version number. It lives in the `VERSION` file at the repo root (currently `0.1.0`).

- **Bump the version whenever anything changes in the project** — a fix, an edit to an existing file, or a new feature.
  - small fix or edit → **patch** (`0.1.0` → `0.1.1`)
  - new feature or new file → **minor** (`0.1.1` → `0.2.0`)
  - big change that breaks existing work → **major** (`0.2.0` → `1.0.0`)
- **On every version bump, do all three of these, every time:**
  1. Update the number in the `VERSION` file.
  2. Update `CHANGELOG.md` with what changed. If `CHANGELOG.md` does not exist, create it first.
  3. Commit the change to git. Use a clear message that says what changed.
- Never change the version number without the commit. Never bump it twice for the same work.

## What this repo currently is

There is no application code here. No `package.json` / `pyproject.toml`, no `src/`, no `.github/`. The content is 25 vendored agent skills, plus `skills-lock.json`, `VERSION`, `CHANGELOG.md`, `CONTEXT.md` (shared vocabulary), and design work in `docs/` — `docs/plan.md` is the build plan and `docs/adr/` holds decisions already made. It is a git repository.

**Start with `docs/plan.md`** when picking up unfinished work. It lists what is in scope, what is not, and the build order.

The directory is named `plant-vs-zombie-prototype`, but nothing related to that exists yet.

**There are therefore no build, test, lint, typecheck, or run commands in this repo.** Do not invent `npm test` or similar. No stack is chosen. When one is, add its exact commands to this file.

## Skills are the only real content

25 skills from `github.com/mattpocock/skills`, vendored under `.agents/skills/`.

- **`.agents/skills/` is the source of truth.** `.claude/skills/`, `.hermes/skills/`, and `.kiro/skills/` each hold 25 *symlinks* back to `../../.agents/skills/<skill>` — zero real files in each. Editing through a symlink path works; creating a skill only under `.claude/` leaves the other three tools without it.
- **Adding a skill:** create `.agents/skills/<name>/SKILL.md` (frontmatter needs `name` and `description`), then `ln -s ../../.agents/skills/<name>` into each of the three tool directories. `skills-lock.json` will not know about it.
- **`agents/openai.yaml` is required.** All 25 skills ship one (25/25) alongside `SKILL.md`, with `interface.display_name`, `interface.short_description`, and `policy.allow_implicit_invocation`. No skill documents this file, so it is easy to miss on a new skill.
- **Invocation split** (rules in `writing-for-agents/SKILL-MECHANICS.md`): 14 skills set `disable-model-invocation: true` and can only be fired by a human typing the name; the other 11 are model-invoked and reachable by other skills. Their `agents/openai.yaml` files set `allow_implicit_invocation: false` to match.
- **This is a fork — local edits to vendored skills are intentional.** `skills-lock.json` records a `computedHash` per skill from upstream; any edit desyncs it. That is expected. Do not revert an edit to restore a hash, and do not hand-edit the lock file.

## Start here

`ask-matt` is the router over all 25 skills. Read `.agents/skills/ask-matt/SKILL.md` (the main flow) and `PHASE-BOUNDARIES.md` (the context-management decision tree) before picking a workflow. It is user-invoked, so it will never fire on its own — a human has to ask for it.

## Not yet configured

`setup-matt-pocock-skills` has not been run. There is no `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, or `docs/agents/triage-labels.md`, no `## Agent skills` block, and no `.scratch/`. **The issue tracker is undecided**, so `to-tickets`, `triage`, and `to-spec` have nowhere to write — flag this before using them. The setup skill edits an existing `AGENTS.md` or `CLAUDE.md` in place; never create both.

Several skills assume git and a GitHub remote: `implement` ("commit work to the current branch"), `resolving-merge-conflicts`, `code-review` ("pin the fixed point"), `handoff` ("match existing repo note conventions"). Git is now set up, but there is still **no remote** — the parts that talk to GitHub Issues or PRs will stall until you add one.

## Generated output

`graphify-out/` is written by `/graphify` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`, `manifest.json`, `cache/`). It is generated, not source; do not hand-edit it. Its `.graphify_*` sidecars are deleted on a successful run, so a missing one is normal.
