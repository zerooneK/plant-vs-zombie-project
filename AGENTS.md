# AGENTS.md

## How to talk to the user

Always talk in **simple English**. Use normal, everyday words. Keep technical words to a minimum, and only when there is no simpler word. Short sentences. Explain what you did in plain terms, not jargon.

## Version, changelog and git

This project has a version number. It lives in the `VERSION` file at the repo root. Do not repeat the number in prose anywhere — read it from that file, so it cannot go stale.

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

A Plants vs. Zombies prototype (React + TypeScript, built with Vite) **plus** 25 vendored agent skills and the design documents for the game.

Game code is in `src/` and `tests/`. The design work is in `docs/`: `docs/plan.md` is the build plan, `docs/specs/` holds specs, `docs/adr/` holds decisions already made, and `docs/agents/` holds the engineering-skill configuration. `CONTEXT.md` is the shared vocabulary. `VERSION` and `CHANGELOG.md` track the version. `.scratch/` is the issue tracker and is git-ignored.

**Start with `docs/plan.md`** when picking up unfinished work. It lists what is in scope, what is not, and the build order. The agreed spec is `docs/specs/001-lawn-defence-mvp.md`. The build order is tracked as one ticket per step under `.scratch/lawn-defence-mvp/issues/` — steps 1 to 10 of 14 are done, and ticket 11 is next — the Level 1-1 balance pass.

## Commands

Node 22 and npm. No linter is configured.

| Command | What it does |
|---|---|
| `npm ci` | Install the exact pinned dependencies |
| `npm run dev` | Work on the game at `localhost:5173` |
| `npm run build` | Typecheck, then build the playable game into `dist/` |
| `npm run preview` | Serve `dist/` over HTTP, to check the built game |
| `npm test` | Run the rule checks (`node:test`, no test framework) |
| `npm run typecheck` | Typecheck only |

**To play the built game, open `dist/index.html` by double-clicking it.** It works from `file://` with no server and no internet. Do not "fix" this by going back to an ES-module build: browsers refuse to load modules over `file://`, and the stylesheet must not carry a `crossorigin` attribute. `vite.config.ts` works around both.

## The rule boundary — protect this

`src/game/` holds the rules. It draws nothing, imports nothing from React, and touches no DOM — not even `performance` or `requestAnimationFrame`. Everything above it — `src/draw/` (canvas) and `src/ui/` (React) — is presentation.

There is exactly **one** way into the rules: a single function taking a game state plus one command, returning a new state. Nothing else may change game state. See `docs/adr/0001-react-for-game-ui.md` and the Testing Decisions in the spec.

**One deliberate exception to "presentation is not tested":** the pure board geometry in `src/draw/layout.ts` **is** tested, in `tests/layout.test.ts`. It has no DOM and no canvas, and it answers the two questions the rules depend on: which Square a click at a given point means, and where that click sits in the board's own units, which is the space Sun is collected in. Without it, what is drawn and what is clicked could disagree and nothing would notice. Everything else in `src/draw/` and `src/ui/` stays untested.

`src/game/clock.ts` is where the fixed step rate lives, as pure arithmetic; `src/draw/frames.ts` owns the browser's frame callback and calls the rules. The arithmetic for working out what one frame owes — including which frame to measure from — stays in `clock.ts` rather than in the loop. That split is not tidiness: the loop got the "measure from the last frame" detail wrong and ran the game five times too fast, and because the loop cannot be checked, nothing noticed until Sun started appearing at the wrong times. Keep anything that can be got wrong out of `frames.ts` and in `clock.ts`.

## Write the check first — protect this too

**Write the failing check before the code that satisfies it. Never write a function or a feature before its check exists.**

The order is not a preference:

1. Write one check, in `tests/`, naming something a player would recognise as true.
2. Run it. **Watch it fail.** A check that has never failed proves nothing, because you have not seen it catch anything.
3. Write the smallest amount of code that makes it pass. Nothing more.
4. Run it again, and the whole suite.
5. Then do the next one.

**One slice at a time.** Not all the checks first and then all the code — that way you commit to a shape you have not yet understood, and the checks end up describing imagined behaviour instead of real behaviour.

**Every check goes through the one entry point**, as a sequence of commands with an assertion on the state that comes back. No second seam.

**If you find code written before its check, throw the check away and write it first.** A check written after the code confirms the code; it cannot catch the code being wrong, which is the only reason it exists. This is not hypothetical: the `collect` command in step 2 was written in the same pass as the Sun timer, before any check for it, and its checks were written afterwards to match what the code already did.

**This rule does not extend the testing boundary.** The canvas, the painting, the React, and the wiring from a click to a command stay untested, by the agreement recorded in the spec's Testing Decisions. Do not add checks for them to satisfy this rule, and do not use this rule as a reason to move a rule into a place it can be checked. If a piece of logic is worth checking and is currently unreachable, move it down to `src/game/` rather than opening a new seam.

## The knowledge graph

`graphify-out/` is a map of the whole project. **Use it whenever you need to understand how the code fits together, and rebuild it whenever the project changes.**

- **To explore:** run `/graphify query "<question>"` instead of reading files one by one. It answers from the graph and cites where each fact came from, so a claim can be checked. Fall back to reading files only when the graph genuinely does not know.
- **To update:** after changing the project, run `/graphify . --update` to re-extract what changed. Do it in the same commit as the change, so the graph never describes a repo that does not exist. If `graphify-out/` is missing entirely, run a full `/graphify .` instead.

A stale graph is worse than no graph, because it will confidently answer questions about code that has moved. If you notice the graph contradicting the code, rebuild it rather than trusting it.

## Skills are also real content

25 skills from `github.com/mattpocock/skills`, vendored under `.agents/skills/`.

- **`.agents/skills/` is the source of truth.** `.claude/skills/`, `.hermes/skills/`, and `.kiro/skills/` each hold 25 *symlinks* back to `../../.agents/skills/<skill>` — zero real files in each. Editing through a symlink path works; creating a skill only under `.claude/` leaves the other three tools without it.
- **Adding a skill:** create `.agents/skills/<name>/SKILL.md` (frontmatter needs `name` and `description`), then `ln -s ../../.agents/skills/<name>` into each of the three tool directories. `skills-lock.json` will not know about it.
- **`agents/openai.yaml` is required.** All 25 skills ship one (25/25) alongside `SKILL.md`, with `interface.display_name`, `interface.short_description`, and `policy.allow_implicit_invocation`. No skill documents this file, so it is easy to miss on a new skill.
- **Invocation split** (rules in `writing-for-agents/SKILL-MECHANICS.md`): 14 skills set `disable-model-invocation: true` and can only be fired by a human typing the name; the other 11 are model-invoked and reachable by other skills. Their `agents/openai.yaml` files set `allow_implicit_invocation: false` to match.
- **This is a fork — local edits to vendored skills are intentional.** `skills-lock.json` records a `computedHash` per skill from upstream; any edit desyncs it. That is expected. Do not revert an edit to restore a hash, and do not hand-edit the lock file.

## Start here

`ask-matt` is the router over all 25 skills. Read `.agents/skills/ask-matt/SKILL.md` (the main flow) and `PHASE-BOUNDARIES.md` (the context-management decision tree) before picking a workflow. It is user-invoked, so it will never fire on its own — a human has to ask for it.

## Agent skills

### Issue tracker

Issues are markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default role names, written as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root, `docs/adr/` at the root. See `docs/agents/domain.md`.

### No remote yet

The repository has **no Git remote**, so the parts of `implement`, `code-review`, `resolving-merge-conflicts` and `handoff` that talk to GitHub Issues or PRs will stall until you add one. Everything else works offline.

## Generated output

`graphify-out/` is written by `/graphify` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`, `manifest.json`, `cache/`). It is generated, not source; do not hand-edit it. Its `.graphify_*` sidecars are deleted on a successful run, so a missing one is normal.