# 0016: Level select polish

**Status:** accepted

**Date:** 2026-10-06

## Context

Ticket 19 introduced saved progress and the core level select navigation. Ticket 20 provides visual polish and interface usability enhancements for the level select menu, completing the menu experience before the final artwork pass.

We needed:
1. Clear visual hierarchy and styling matching the garden aesthetic of the game.
2. Fast navigation allowing players to resume an active match, return to the lawn, or continue their Adventure progression without hunting for the next unlocked Level.
3. Information disclosure that respects the scope boundaries: displaying win status and personal best times for completed levels, while keeping locked levels properly mysterious without leaking future rosters.
4. Layout stability ensuring menu interactions never cause jitter or canvas shifts.

## Decision

**1. Polished header and quick-action navigation.**
The level select header features a clean title and description alongside context-sensitive navigation:
- If a match is in progress, a "Resume Level X" button takes the player directly back to their board.
- A "Continue Adventure (Level X)" button points the player straight to their next uncompleted unlocked Level.
- When no match is active or when browsing, a "Back to Lawn" action ensures players are never trapped in the menu.

**2. Polished level cards with clear state indicators.**
The ten Adventure levels are arranged in a responsive grid. Each card displays:
- Level title (`Level 1-X`).
- Clear badge indicating status: `✓ Won`, `Next Up`, `Unlocked`, or `🔒 Locked`.
- For won levels: personal best completion time (`Best: 1m 24s`).
- For current level: distinct golden accent ring.
- For locked levels: disabled button state with muted appearance and locked indicator, preserving surprise and avoiding Almanac scope creep.

**3. Strict presentation boundary.**
All visual enhancements live in `src/App.tsx` and `src/ui/app.css`. The game rulebook in `src/game/` and the pure progression engine in `src/game/progress.ts` remain untouched, maintaining the strict separation between game logic and presentation.

## Consequences

- Players enjoy an intuitive, responsive, and visually cohesive level select experience with clear indicators of progress and personal best records.
- All 164 rule checks continue to pass headlessly.
- The project is now ready for Ticket 21: the final original artwork pass.
