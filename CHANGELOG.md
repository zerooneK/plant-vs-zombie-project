# Changelog

All notable changes to this project are recorded here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project follows [Semantic Versioning](https://semver.org/).

## [0.8.1] - 2026-09-26

### Added

- **`AGENTS.md` now requires the check to be written before the code.** Write a failing check naming something a player would recognise as true, watch it fail, write the smallest amount of code that makes it pass, then move to the next one — one slice at a time, not all the checks and then all the code. Every check goes through the one entry point into the rules, and there is still no second seam.
- The same section records what the rule does **not** cover, so it cannot be obeyed by breaking the testing boundary: the canvas, the painting, the React, and the wiring from a click to a command stay untested by the agreement in the spec's Testing Decisions. The rule adds no checks there, and it is not a reason to move logic somewhere it can be checked. Logic worth checking but currently unreachable is moved down into `src/game/` instead.

The rule exists because the `collect` command in 0.8.0 was written in the same pass as the Sun timer, before any check for it existed, and the checks came afterwards. They passed, and passing proved nothing: a check written after the code can only confirm the code. It happened to be right, which is not a defence — the same habit would have shipped the next one wrong.

### Changed

- `AGENTS.md` no longer says step 1 of 13 is the last one done. Steps 1 and 2 are.

## [0.8.0] - 2026-09-26

Build order step 2 of 13: Sun falls from the sky, is collected by clicking it, and is lost if it is not. A level begins holding 50 Sun, one piece of Sun is worth 25, and the counter in the footer is read straight from the rules.

### Fixed

- **The game ran far too fast, and faster the longer it played.** The frame loop measured elapsed time from the first frame instead of from the last one, so every frame re-offered all the time that had passed since the game started. The catch-up limit then capped each frame at 5 steps, giving 5× real speed at 60 frames a second and nearly 12× on a 144Hz screen — the exact opposite of the promise that a fast machine is not an easier machine. This shipped in ticket 01 and was invisible until Sun, the first thing denominated in seconds, came out at the wrong times. The arithmetic that decides what a frame owes now lives in `advanceFrames` in `src/game/clock.ts` where it can be checked; `frames.ts` is left with nothing but the browser's callback. Four new checks cover it, and all four fail if the old mistake is put back.
- **Sun fell so fast it could not be clicked.** It crossed the lawn in about two seconds, moving further in a tenth of a second than its own radius, so a click aimed at Sun you could plainly see missed and marked the grass underneath instead. It now crosses in about five seconds, and the target given to a click is a little larger than the Sun drawn.
- **Sun could appear without ever falling.** Its resting place could land barely below where it started, so on some seeds it simply appeared in place. It now always comes down at least one Row before settling.
- A landing Sun no longer loses a step of its life on the step it lands, so the whole of its life is spent lying on the lawn.

### Added

- `src/game/sun.ts` — a piece of Sun: falling, resting, and waiting out its life; and which Sun a click lands on.
- `src/game/balance.ts` — every number a designer would tune, in the one place the plan called for. Values held with confidence and values recalled from memory are marked as such, and a comment on the Sun's lifetime now says plainly that two pieces can be on the lawn at once rather than claiming otherwise.
- `src/game/random.ts` — numbers fixed by a seed, so the rules stay pure and a level has one definite outcome for one definite list of commands. Variety between playthroughs comes from the seed, which the interface chooses.
- `collect` as a command, alongside `advance` and `select`. Sun is taken before a Square is marked: a click aimed at Sun is a click on that Sun, not a misclick on the grass under it.
- The Sun counter in the footer, told to React only when the Sun held or the selection really changes.
- Sun drawn as a plain yellow disc with rays. Placeholder artwork, as agreed — real artwork is ticket 20.

### Changed

- The board's own units, and a point on the board, now live in `src/game/board.ts` rather than in `src/draw/layout.ts`. The rules do their own hit testing — a click has to be measured in the same units Sun is placed in — so those numbers have to be the rules' to read. The drawing reads them from there.
- Each piece of Sun is given an id, so that "the same Sun" can be referred to and followed.
- 35 checks, up from 22. The click path was checked by hand in a real browser again, as it was after ticket 01, using a driver installed outside the project.

## [0.7.2] - 2026-09-26

### Added

- `AGENTS.md` now has a knowledge-graph rule: use `/graphify query` to explore the project rather than reading files one by one, and run `/graphify . --update` in the same commit as any change, so the graph never describes a repo that does not exist.

### Changed

- The graph was brought fully up to date. It had been built before any game code existed, so it knew nothing about `src/`, `tests/`, the spec, or the engineering-skill config. It now covers **795 nodes and 1231 edges across 51 labelled communities** — up from 616 nodes and 926 edges — with 179 new nodes and 305 new edges. Health check: no dangling, missing or collapsed edges.
- `AGENTS.md` no longer repeats the version number in prose. It pointed at `0.7.0` while the real number was `0.7.1`; reading it from the `VERSION` file removes that whole class of drift.

## [0.7.1] - 2026-09-26

Fixes from a review of 0.7.0, which found two breaches of the repo's own standards and one real bug in the game clock.

### Fixed

- **The game ran at 59 steps a second, not 60.** A 60th of a second is not an exact number in floating point, so counting steps from a carried-over remainder always held one step back. Every second of play was 1.7% slow, forever. Steps are now counted from the total elapsed time, so a second of play is sixty steps at any frame rate — checked in `tests/clock.test.ts`.
- `src/game/loop.ts` used `performance.now` and `requestAnimationFrame`, so the rules directory touched the DOM, breaking the rule boundary in `AGENTS.md`. Split into `src/game/clock.ts` (pure arithmetic, the rule) and `src/draw/frames.ts` (the only part that knows about the browser's frame callback).
- The board geometry used `cellWidth` and `cellHeight` in 19 places, but `CONTEXT.md` lists "cell" as a word to avoid for a Square. Renamed to `squareWidth` and `squareHeight`.
- `src/ui/Lawn.tsx` built the same `{ width, height }` pair twice in one place, and typed its `{ view, board }` pair inline in two places. Both now built once, with a named type.
- The 0.7.0 changelog entry called all 14 checks "rule checks". Eight of them check board geometry, not the rules.

### Added

- 5 more checks, 19 in total: the step rate, uneven frame gaps, leftover time, the catch-up limit after a long pause, and that the pace recovers afterwards.

### Changed

- `AGENTS.md` — the rule boundary now records the one deliberate exception: the pure board geometry in `src/draw/layout.ts` is tested, because the rules depend on it and a mismatch between the drawn grid and the clicked grid would otherwise be invisible. Everything else in `src/draw/` and `src/ui/` stays untested.
- `docs/specs/001-lawn-defence-mvp.md` — the same exception, with the reason, plus pacing added to the list of what is covered.
- `docs/plan.md` — the code layout now matches the files that exist.

## [0.7.0] - 2026-09-26

Build order step 1 of 13 (ticket 01): the board draws and a Square can be clicked.

### Added

- The game itself: React 19 + TypeScript 7 + Vite 8, with React, React DOM, TypeScript, Vite and the type packages as the only dependencies. All MIT-licensed and pinned in `package-lock.json`.
- `src/game/board.ts` — five Rows by nine Columns of Squares, and the vocabulary for addressing them.
- `src/game/sim.ts` — the single entry point into the rules. A game state plus one command gives a new game state, and nothing else may change it.
- `src/game/loop.ts` — the fixed 60-step clock, independent of the display, so a fast machine is not an easier machine.
- `src/draw/layout.ts` — the Square size is the source of truth and the board is measured from it, so the drawn grid and the hit test cannot drift apart.
- `src/draw/board.ts` — the lawn, as placeholder colours until ticket 20.
- `src/ui/Lawn.tsx`, `src/App.tsx` — the canvas and the shell. React is told about a change only when the selection really changes, so it re-renders when the player acts rather than sixty times a second.
- 14 rule checks, run by Node's built-in test runner. No test framework was added.

### Fixed

- The built game rendered a blank white page when opened by double-clicking it. A browser refuses to load an ES module over the `file://` protocol, and refuses a `crossorigin` stylesheet there too. The bundle is now one classic script with no dynamic imports, marked `defer` so it starts after the page exists, and the stylesheet no longer carries `crossorigin`. Opening `dist/index.html` from the filesystem now works, with nothing installed and no server, as promised in ADR 0002.

### Changed

- `AGENTS.md` — replaced "no application code, no commands" with the real command table, the rule boundary that `src/game/` must not import React or touch the DOM, and a warning about the `file://` constraint.
- `docs/specs/001-lawn-defence-mvp.md` — the command set now includes selecting a Square; recorded why which Square is selected is game state rather than view state. Added the `file://` constraint as an implementation decision, and recorded the one-off click verification.
- `docs/plan.md` — the code layout now matches what exists.
- `.gitignore` — added `node_modules/` and `dist/`.

## [0.6.0] - 2026-09-26

### Added

- `docs/agents/issue-tracker.md` — issues live as markdown files under `.scratch/<feature>/`. Notes that the agreed spec stays in `docs/specs/` and is not duplicated.
- `docs/agents/triage-labels.md` — the five default triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), kept as-is.
- `docs/agents/domain.md` — domain doc consumer rules; records that this repo is single-context.
- `## Agent skills` block in `AGENTS.md`, replacing the "Not yet configured" section.
- `.scratch/` git-ignored as working material.

### Fixed

- `AGENTS.md` claimed the current version was `0.1.0`. It was `0.5.0`, and is now `0.6.0`.

## [0.5.0] - 2026-09-26

### Added

- `docs/specs/001-lawn-defence-mvp.md` — the MVP spec: problem, solution, 79 user stories, implementation and testing decisions, out of scope, and known risks.

### Notes

- The spec was written to the repository rather than published to an issue tracker: no tracker is configured and the repository has no Git remote, so the `ready-for-agent` label could not be applied. Run the project setup flow once a remote exists.

## [0.4.0] - 2026-09-26

### Added

- `docs/plan.md` — what we are building, what is out of scope, the code layout, and a 13-step build order where every step is playable before the next begins.
- `CONTEXT.md` — the shared vocabulary of the game (Square, Row, Sun, Seed Packet, Recharge, Zombie, Armour, Wave, Flag Wave, Game Over).

### Changed

- `AGENTS.md` — points at `docs/plan.md` as the starting point for unfinished work.

## [0.3.0] - 2026-09-26

### Added

- `docs/adr/0004-node-builtin-test-runner.md` — test the game rules with `node:test`, adding no test-framework dependency.

## [0.2.0] - 2026-09-26

### Added

- `docs/adr/0001-react-for-game-ui.md` — React for menus and HUD, plain canvas for the 60fps game loop.
- `docs/adr/0002-static-web-no-backend.md` — static local files, no server, no accounts, no network at runtime.
- `docs/adr/0003-original-art-not-original-assets.md` — original SVG art; no original sprites, names or audio.

### Changed

- `AGENTS.md` — corrected the repo inventory now that `docs/adr/` exists.

## [0.1.0] - 2026-09-26

### Added

- `AGENTS.md` — instructions for agent sessions: what the repo is, how the vendored skills are wired, and how to work here.
- `VERSION` — the project version number.
- `CHANGELOG.md` — this file.
- Git repository initialised (`.gitignore` excludes the generated `graphify-out/` folder).
- Versioning rules: bump the version on every change, update this changelog, and commit — all three, every time.
