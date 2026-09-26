# Plan

What we are building, and the order we build it in. Nothing here is built yet.

## The short version

A single-player lawn-defence game that plays like the original Plants vs. Zombies: five rows, nine columns, sun as the only resource, and zombies walking in from the right. Version 1 ships as static files you double-click to open. One level, ten plants, five zombies — a small slice that feels like the real thing, rather than the whole original.

Plain-language notes on the reasoning live in `docs/adr/`. Vocabulary lives in `CONTEXT.md`.

## In scope

- **Levels 1-1 to 1-10**, stored as data so adding one is a copy and edit, not code
- **10 plants**: Peashooter, Sunflower, Wall-nut, Tall-nut, Potato Mine, Snow Pea, Chomper, Repeater, Cherry Bomb, Puff-shroom
- **5 zombies**: Basic, Conehead, Pole Vaulting, Buckethead, Flag
- **The lawn mowers** and the game-over rule they drive
- **The original's numbers** — sun costs, health, damage, recharge times — in one file, `src/game/balance.ts`, with uncertain values marked by a comment
- **Mouse only**: click a seed packet, then click a square
- **Progress saved in the browser**, so levels stay unlocked
- **Art**: original flat SVG shapes, made for this project
- **Tests** on the rules, run in the terminal with no browser

## Out of scope

Night levels, pool levels, roof levels, graves, the Almanac, the upgrade shop, mini-games, puzzle modes, survival, Zen mode, two players, sound, coins, and any plant beyond the ten.

Nothing on that list sneaks in without being agreed first.

## How it is put together

| Decision | Why |
|---|---|
| Game advances 60 fixed steps per second | A fast laptop must not be easier than a slow one, and the tests must give the same answer every run |
| Drawing the lawn is a plain canvas loop, never React | React re-rendering 60 times a second fights the game |
| React owns menus, seed bank and HUD | You know React; it is comfortable for everything that is not the lawn |
| Progress in browser local storage | No server, no accounts, nothing to secure |
| Vite for bundling | `npm run build` produces a folder you open to play |
| `node:test` for the rules | No test-framework dependency |

React, Vite and TypeScript are the only dependencies, all MIT-licensed and pinned exactly. The finished game ships with none of them — it is just files.

## Where the code goes

At the repo root, next to `.agents/` and `docs/`:

```
package.json          vite.config.ts   tsconfig.json   index.html
src/
  main.tsx            boots React
  App.tsx             menus, the Seed Bank, the HUD
  game/               the rules — no drawing, no React, no DOM
    board.ts          Rows, Columns, Squares
    sim.ts            the one entry point: state + command -> state
    clock.ts          the fixed 60-step rate, as pure arithmetic
    balance.ts        every number, in one place      (ticket 03)
    plants.ts         plant definitions               (ticket 09 onwards)
    zombies.ts        zombie definitions              (ticket 15 onwards)
    levels.ts         level definitions               (ticket 17 onwards)
  draw/               the canvas, the layout maths, the artwork
    layout.ts         board geometry - pure, and tested (see AGENTS.md)
    board.ts          painting the lawn
    frames.ts         the browser's frame callback, the only DOM user
  ui/                 React components
tests/                rule checks, run by node:test
```

`game/` holds the rules with no drawing and no React in it. That is what makes it testable in a terminal, and it is the main thing to protect as the code grows. Only `board.ts`, `sim.ts` and `clock.ts` exist so far; the rest arrive with the tickets that need them.

## Build order

Each step is something you can actually play or click before the next one starts. Nothing is built beyond a step until it works.

| # | Step | Done when |
|---|---|---|
| 1 | Board | An empty 5×9 lawn draws and resizes with the window — **done** |
| 2 | Sun | A sun counter; sun falls on a timer; clicking collects it |
| 3 | Planting | One seed packet; click it, click a square, plant appears, sun is spent |
| 4 | Shooting | That plant fires, hits a zombie, and it dies |
| 5 | Walking | A zombie enters at the right of a row and moves left at a fixed speed |
| 6 | Eating | It stops at a plant, eats it, then carries on |
| 7 | Lawn mowers | A zombie at the left edge spends the row's mower and clears the row |
| 8 | Win and lose | Waves end, then either a win or game over |
| 9 | **Level 1-1** | A whole level, start to finish, playable |
| 10 | The other 9 plants | One at a time, each with its rule test |
| 11 | The other 4 zombies, levels 1-2 to 1-10 | Added as data |
| 12 | Saved progress | Levels stay unlocked between sessions |
| 13 | Art pass | Placeholder shapes replaced with the real SVG art |

Steps 1-9 use plain coloured shapes. That is not laziness — it means the rules get right before any pixel does. The art is a swap at the end, and it is the first thing you would want changed anyway.

## Known risks

- **Some original numbers are from memory.** Sun costs and health are close; exact damage and wave timings are less certain. They are all in `balance.ts` with uncertain ones marked, and playtesting will find them.
- **I cannot tell you whether it feels right.** I can drive the game with a headless browser and take screenshots, but whether the original's *feel* is captured is your judgement, not mine. Expect to playtest early and often.
- **The lawn mower rule is the easiest thing to get wrong.** It is a one-use life per row, and losing a second zombie in the same row must end the level.
- **WSL2**: the game window opens on the Windows side, not inside the terminal.

## Once the plan is agreed

`AGENTS.md` used to say this repo had no application code and no build commands. Both were true when the plan was written and stopped being true at step 1, so `AGENTS.md` was corrected in the same commit as the code that made it wrong.
