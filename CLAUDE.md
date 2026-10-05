# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This merges the project's own rules from `AGENTS.md` with the architecture notes needed to work in the code. **If the two ever disagree, `AGENTS.md` wins** — it is the constitution, this file is the working copy.

## How to talk to the user

Always talk in **simple English**. Use normal, everyday words. Keep technical words to a minimum, and only when there is no simpler word. Short sentences. Explain what you did in plain terms, not jargon.

**Say so when something is stuck.** If a problem will not go away, or a fix is taking far too long, stop and tell the user — what is wrong, what is causing the delay, and how they could help. Do not keep working a problem in silence and then report it as a finished task or a dead end. Two things this rule is aimed at: **silence looks like progress**, so a long stretch of retries reads from the outside as the job still moving, when nobody watching can see the wall or offer the thing that would clear it — a denied permission, a missing file, a decision only the user can make; and **being stuck is information worth having early**, since half a turn of debugging is worth more than five. It does not mean narrating ordinary dead ends: a check failing red because the feature does not exist yet is the work working, and a denied command with an obvious workaround is not a stop — take the workaround and say which one you took.

## Decision-making

From now on, use the connected MCP tools to assist in decision-making when faced with choices.

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

A Plants vs. Zombies prototype (React + TypeScript, built with Vite) **plus** 26 vendored agent skills and the design documents for the game.

Game code is in `src/` and `tests/`. The design work is in `docs/`: `docs/plan.md` is the build plan, `docs/specs/` holds specs, `docs/adr/` holds decisions already made, and `docs/agents/` holds the engineering-skill configuration. `CONTEXT.md` is the shared vocabulary. `VERSION` and `CHANGELOG.md` track the version. `.scratch/` is the issue tracker and is git-ignored.

**Start with `docs/plan.md`** when picking up unfinished work. It lists what is in scope, what is not, and the build order. The agreed spec is `docs/specs/001-lawn-defence-mvp.md`. The build order is tracked as one ticket per step under `.scratch/lawn-defence-mvp/issues/` — steps 1 through 15 are done (step 10's Wall-nut and Tall-nut included), which is all ten plants; step 16 is done: conehead and buckethead. **Ticket 17 is next: pole vaulter.** Tickets 18–21 remain: levels 1-2 to 1-10, level select with saved progress, and original artwork.

## Commands

Node 22 and npm. No linter is configured.

| Command | What it does |
|---|---|
| `npm ci` | Install the exact pinned dependencies |
| `npm run dev` | Work on the game at `localhost:5173` |
| `npm run build` | Typecheck, then build the playable game into `dist/` |
| `npm run preview` | Serve `dist/` over HTTP, to check the built game |
| `npm test` | Run the rule checks (`node:test`, no test framework) — 131 checks |
| `npm run typecheck` | Typecheck only |

Run a single file, or a single named check:

```bash
node --test tests/clock.test.ts
node --test --test-name-pattern="catches up" tests/clock.test.ts
```

`tests/plans.ts` is a shared fixture module, not a test file — it has no `test()` in it.

**To play the built game, open `dist/index.html` by double-clicking it.** It works from `file://` with no server and no internet. Do not "fix" this by going back to an ES-module build: browsers refuse to load modules over `file://`, and the stylesheet must not carry a `crossorigin` attribute. `vite.config.ts` works around both, and that plugin is load-bearing.

**To drive the game in a real browser, call `cloakbrowser` through the MCP tool, not Playwright or Puppeteer.** It is already wired up and it installs nothing — which matters here, since the rule that this repo carries no packages beyond React and the build tool is a decision on the record (`docs/adr/0004-node-builtin-test-runner.md`), not a preference about this session. Do not read that rule as an argument for building a browser driver by hand, which is what the board was checked with before: a Node script talking the Chrome DevTools Protocol over Node 22's built-in `WebSocket`. It works, and it costs four bugs to stand up each time — creating a tab with a query string in the URL hangs, a `.ts` driver with a top-level `await` loads as CommonJS and silently never resolves, a screenshot needs `fromSurface`, and the device-metrics call hangs rather than resizing. `cloakbrowser` has a page snapshot, a console log and a network log; a raw CDP script has none of them, so every question about the page becomes a hand-written `Runtime.evaluate`.

This is how you *look* at the drawing, and looking is not checking: the browser opens no new seam, and the rule boundary above is unchanged by any of it. Ticket 15 is the worked example — `drawChomper` was verified ready-state in a browser, and the chewing state is still unlooked-at because the run stopped short of it (`.scratch/lawn-defence-mvp/issues/15-chomper.md`).

## Architecture

### The rule boundary — protect this

`src/game/` holds the rules. It draws nothing, imports nothing from React, and touches no DOM — not even `performance` or `requestAnimationFrame`. Everything above it — `src/draw/` (canvas) and `src/ui/` (React) — is presentation.

There is exactly **one** way into the rules: a single function taking a game state plus one command, returning a new state. Nothing else may change game state. See `docs/adr/0001-react-for-game-ui.md` and the Testing Decisions in the spec.

Concretely, that entry point is a reducer:

```ts
apply(state: GameState, command: Command): GameState
```

`Command` is a six-way union — `select`, `collect`, `choose`, `place`, `shovel`, `advance`. Every command returns a new state; nothing mutates.

**One deliberate exception to "presentation is not tested":** the pure board geometry in `src/draw/layout.ts` **is** tested, in `tests/layout.test.ts`. It has no DOM and no canvas, and it answers the two questions the rules depend on: which Square a click at a given point means, and where that click sits in the board's own units, which is the space Sun is collected in. Without it, what is drawn and what is clicked could disagree and nothing would notice. Everything else in `src/draw/` and `src/ui/` stays untested.

`src/game/clock.ts` is where the fixed step rate lives, as pure arithmetic; `src/draw/frames.ts` owns the browser's frame callback and calls the rules. The arithmetic for working out what one frame owes — including which frame to measure from — stays in `clock.ts` rather than in the loop. That split is not tidiness: the loop got the "measure from the last frame" detail wrong and ran the game five times too fast, and because the loop cannot be checked, nothing noticed until Sun started appearing at the wrong times. Keep anything that can be got wrong out of `frames.ts` and in `clock.ts`.

The game runs at a fixed **60 steps a second**, independent of frame rate.

### The order of operations inside one step

`advance` in `src/game/sim.ts` is where one step happens, and **the order is the design**. This is the single most important thing to understand before editing the rules:

1. Seed Packet Recharge ticks down
2. Due Waves walk in at the right edge
3. Cherry Bombs go off (`detonateBombs`)
4. Zombies walk and eat (`walkAndEat`) — this both moves Zombies and bites plants
5. Mowers run (`runMowers`)
6. Mines detonate (`detonateMines`)
7. Chompers eat (`devourWithChompers`)
8. Peas fly (`flyRight`)
9. Exhausted Zombies are removed (`removeExhausted`)
10. Plants fire (`fireFromPlants`)
11. Win/loss is decided from the Waves left and the Zombies standing
12. Sky Sun falls (`stepSun`), then plants make Sun (`stepProduction`)

Four consequences worth internalising: production runs on the plants **still standing at the end of the step**, so a Sunflower eaten this step makes nothing; a Zombie is removed *after* it eats, so a Zombie killed by a pea on the same step it bit still got that bite in — but a Zombie killed by a bomb on that step did not, because the bomb goes off first; a Chomper that eats a Zombie standing in its Square has already been bitten once by it, because both happen inside the one step; and moving a line changes behaviour. Read the comments in `advance` before reordering anything.

### The data-driven roster

`src/game/plants.ts` is a **table**, not a hierarchy. Adding a plant is an entry in `PLANTS`, not a new branch in the rules. Each `Plant` has up to five independent capability fields, any of which may be `null`:

- `shooting` — `{ fireInterval, projectiles, shot }`
- `producing` — `{ interval, amount }` (Sunflower)
- `arming` — `{ delay }` (Potato Mine: does nothing until armed, then takes the first Zombie and is gone)
- `detonating` — `{ rows, columns }` (Cherry Bomb: on the step after planting, clears every Zombie in that area and is gone)
- `devouring` — `{ chew }` (Chomper: takes the first Zombie that reaches it, then cannot eat for `chew` steps)

The six kinds of job a plant can have are: **shoot**, **make Sun**, **stand in the way** (Wall-nut — every field `null`, just high `health`), **trap**, **go off**, and **eat**. A plant that only blocks is described by no capability at all, deliberately. Each description holds only what is a per-plant choice: `arming` holds the delay but not what an armed plant does, `detonating` holds the size of the blast but not that a blast removes Zombies, and `devouring` holds the chew but not that eating removes a Zombie.

**The three plants that take a Zombie off the lawn whole run in three different places in the step, and that ordering is the design.** `detonateBombs` runs *before* `walkAndEat`, because a bomb is waiting for nothing — which is what makes it a rescue: a bomb put down in front of a Zombie about to reach a plant kills it before it bites, where asked after the walk it would be saving a Row one bite too late. `detonateMines` and `devourWithChompers` both run *after* it, because each is asked by a Zombie *reaching* it and can only be asked once the Zombies have moved. Chompers come after the mines so a Zombie a Chomper has just eaten is off the lawn rather than left for a mine in the same Square to find. Moving any of these lines changes its checks.

**`stepsUntilChewed` is one field meaning two things, and that is deliberate.** A Chomper's life has two "ready" moments — before it has ever eaten, and after a chew — and zero means ready at one end and spent at the other, the same reading every other countdown in this game gives. Two fields would let a Chomper be "ready" and "chewing" at once. It is **not** `arming` with a negative delay: `arming` counts *down towards* a moment the plant has not reached, `devouring` counts *up from* one it has just passed, and one cannot be the same counter as the other. See `docs/adr/0011`.

The shooter variants are the pattern to copy. `ONE_PEA` is defined once; Snow Pea, Repeater and Puff-shroom are each `{ ...ONE_PEA, <one field changed> }`. "A Snow Pea is a Peashooter with one thing changed" is true *in the data*, not just in a comment. A shot's effect — `damage`, `slowSteps`, `passesThrough`, `reachIn` — is settled when fired and carried by the projectile, so it cannot change in flight.

Zombies are data in the same way: `ZOMBIES` in `src/game/zombies.ts`, keyed by `ZombieName`. The Flag Zombie has no health of its own; `waveZombies` gives Flag Wave Zombies a toughness multiplier, so a Flag Wave is *more* than an ordinary one rather than a different sort of thing.

Levels are data in `src/game/levels.ts`: a `Level` is a plant list plus a schedule of `Wave`s, each with an `atStep` and the Zombies it sends. `initialGameState(seed, level)` takes a level as a parameter, so a check builds the level it needs.

### Numbers live in one file, and checks restate them

`src/game/balance.ts` holds every tunable, each written in seconds and converted to steps (`15 * STEPS_PER_SECOND`), because the number a designer argues about is seconds, not steps.

`tests/helpers.ts` and the test files **deliberately restate those numbers rather than importing them** (`const MINE_COST = 25`). The point of a check is to catch the number being wrong; reading it from `balance.ts` would pass whatever that file happened to say. Follow this.

Test helpers build purpose-made levels so a check gets exactly the plants and Zombies it needs and nothing else: `levelOffering(plants, ...waves)`, `levelWith(...waves)`, `oneZombieIn(row, atStep)`. Time travel is `untilTick`, `untilTheLevelEnds`, and `withSunToPlant` — a level starts with 50 Sun and a Peashooter costs 100, so **every planting check must start from `withSunToPlant`** or it is testing that the player is broke rather than the rule it is about.

### React and the canvas

`src/App.tsx` holds the `GameState` in a **ref**, not state (`docs/adr/0001-react-for-game-ui.md`). The rules advance 60 times a second and React re-rendering at that rate fights the game. The canvas pushes a small `Report` to React only when something visible actually changed, and readiness is compared as a boolean so a Recharge countdown cannot re-render 60 times a second to change one word. Keep new interface state on that same footing: it belongs in `Report`, not in a 60fps subscription.

`src/App.tsx` reads a `?level=` query parameter to pick a starting level. That is not level select (ticket 20) — it exists so a person can reach a non-default level in a browser, which a check can do and a player cannot. `LEVEL_TEST` is the test bed holding the Wall-nut and Tall-nut. An unknown name falls back to Level 1-1 rather than a blank lawn.

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

### Generated output

`graphify-out/` is written by `/graphify` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`, `manifest.json`, `cache/`). It is generated, not source; do not hand-edit it. Its `.graphify_*` sidecars are deleted on a successful run, so a missing one is normal.

## Skills are also real content

25 skills from `github.com/mattpocock/skills`, vendored under `.agents/skills/`, plus the `graphify` skill — 26 in total.

- **`.agents/skills/` is the source of truth.** `.claude/skills/`, `.hermes/skills/`, and `.kiro/skills/` each hold *symlinks* back to `../../.agents/skills/<skill>` — zero real files in each. Editing through a symlink path works; creating a skill only under `.claude/` leaves the other three tools without it.
- **Adding a skill:** create `.agents/skills/<name>/SKILL.md` (frontmatter needs `name` and `description`), then `ln -s ../../.agents/skills/<name>` into each of the three tool directories. `skills-lock.json` will not know about it. To install a third-party skill, `graphify install --project --platform agents` is the command that targets `.agents/skills/` correctly — the default `graphify install --project` would drop a real file into `.claude/skills/` and break this rule.
- **`agents/openai.yaml` is required.** All 25 vendored skills ship one (25/25) alongside `SKILL.md`, with `interface.display_name`, `interface.short_description`, and `policy.allow_implicit_invocation`. No skill documents this file, so it is easy to miss on a new skill. The `graphify` skill is the one current exception — it ships without one, so it works through the symlink but carries no interface metadata.
- **Invocation split** (rules in `writing-for-agents/SKILL-MECHANICS.md`): 14 of the vendored skills set `disable-model-invocation: true` and can only be fired by a human typing the name; the other 11 are model-invoked and reachable by other skills. Their `agents/openai.yaml` files set `allow_implicit_invocation: false` to match.
- **This is a fork — local edits to vendored skills are intentional.** `skills-lock.json` records a `computedHash` per skill from upstream; any edit desyncs it. That is expected. Do not revert an edit to restore a hash, and do not hand-edit the lock file.

### Start here

`ask-matt` is the router over all 25 vendored skills. Read `.agents/skills/ask-matt/SKILL.md` (the main flow) and `PHASE-BOUNDARIES.md` (the context-management decision tree) before picking a workflow. It is user-invoked, so it will never fire on its own — a human has to ask for it.

## Agent skills

- **Issue tracker** — issues are markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.
- **Triage labels** — the five default role names, written as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.
- **Domain docs** — single-context: `CONTEXT.md` at the root, `docs/adr/` at the root. See `docs/agents/domain.md`.
- **No remote yet** — the repository has **no Git remote**, so the parts of `implement`, `code-review`, `resolving-merge-conflicts` and `handoff` that talk to GitHub Issues or PRs will stall until you add one. Everything else works offline.

## House conventions

- Comments explain **why**, and argue with a specific wrong alternative. This codebase is unusually well-commented on purpose — match that density and register, and put the reasoning in the file where the next reader needs it.
- Player-facing English lives in the interface (`PLANT_NAMES` in `App.tsx`), never in the rules. The rules hold names they can compare.
- Immutable updates throughout; `readonly` everywhere. `noUncheckedIndexedAccess` is on, so indexed access needs a guard.
- Imports carry the `.ts` extension (`allowImportingTsExtensions`) and type-only imports use `import type` (`verbatimModuleSyntax`). Match it.
- No third-party packages beyond React and the build tool — that is why tests use `node:test` and not Vitest or Jest (`docs/adr/0004-node-builtin-test-runner.md`).
