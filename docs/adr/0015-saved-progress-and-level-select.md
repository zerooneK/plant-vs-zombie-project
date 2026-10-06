# 0015: Saved progress and level select

**Status:** accepted

**Date:** 2026-10-06

## Context

Ticket 19 introduces saved progress and the level select screen, satisfying User Stories 4, 5, 62, 67, and 68 in `docs/specs/001-lawn-defence-mvp.md`.

Prior to this ticket, all ten levels existed as pure data in `src/game/levels.ts` (Ticket 18), but the only way to reach a non-default level was via the URL query string (`?level=1-x`), with no persistence across browser sessions and no menu to navigate between levels or restart after a loss without reloading the page.

We needed:
1. Pure progression rules and storage serialization in `src/game/progress.ts`.
2. Browser persistence in local storage so unlocked levels and personal best times persist across sessions.
3. A menu in `src/App.tsx` allowing players to pick any unlocked Level, restart during play, or advance to the next Level upon a win.

## Decision

**1. Separation of domain progression logic from browser storage.**
To preserve the rule boundary defined in `AGENTS.md` ("src/game/ holds the rules. It draws nothing, imports nothing from React, and touches no DOM"), all progression math, unlocks, best-time calculations, and serialization logic live in `src/game/progress.ts`:
- `INITIAL_PROGRESS`: Level 1-1 unlocked, no completed levels.
- `isLevelUnlocked(progress, levelName)`: Level 1-1 is always unlocked. Any subsequent Level in `LEVEL_ORDER` unlocks once its predecessor is in `completed`.
- `recordWin(progress, levelName, elapsedSeconds)`: Pure function adding the completed level and tracking personal best completion times without duplicates.
- `serializeProgress(progress)` / `deserializeProgress(raw)`: Pure JSON serialization with graceful fallback to `INITIAL_PROGRESS` on corrupt or missing input.
This logic is tested in `tests/progress.test.ts` via `node:test` with zero DOM or browser dependencies.

**2. React presentation and local storage integration in `src/App.tsx`.**
- App loads saved progress on mount from `localStorage` under `'lawn-defence:progress'`.
- Winning a level automatically updates progress and persists it to local storage.
- A "Level Select" button in the header and on outcome banners opens the level select menu.
- A "Restart" button restarts the active Level without reloading the page.
- On winning, an immediate "Next Level" button allows continuing straight through Adventure mode.
- The outcome banner holds action buttons without shifting the height of the help area, ensuring the lawn canvas does not jump.

## Consequences

- Players can progress through Adventure mode from Level 1-1 to Level 1-10 with their unlocked levels and best times saved.
- Players can return to the level select menu at any time and restart without page reloads.
- The rule boundary remains completely intact: `src/game/progress.ts` remains pure TypeScript, testable headlessly in the terminal.
- Ticket 20 can now build visual polish and styling enhancements directly on top of the established level select structure.
