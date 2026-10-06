# Plan

What we are building, and the order we build it in. The steps marked done below are built, playable and checked; the rest are not started.

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
    plants.ts         plant definitions               (ticket 03 onwards)
    zombies.ts        zombie definitions              (ticket 04 onwards)
    mowers.ts         the Lawn Mower that saves a Row  (ticket 06 onwards)
    shots.ts          peas in flight, and who fires them (ticket 04 onwards)
    levels.ts         level definitions               (ticket 04 onwards)
  draw/               the canvas, the layout maths, the artwork
    layout.ts         board geometry - pure, and tested (see AGENTS.md)
    board.ts          painting the lawn
    frames.ts         the browser's frame callback, the only DOM user
  ui/                 React components
tests/                rule checks, run by node:test
```

`game/` holds the rules with no drawing and no React in it. That is what makes it testable in a terminal, and it is the main thing to protect as the code grows. `board.ts`, `clock.ts`, `sim.ts`, `sun.ts`, `random.ts`, `balance.ts`, `plants.ts`, `zombies.ts`, `mowers.ts`, `shots.ts` and `levels.ts` exist so far; the rest arrive with the tickets that need them.

## Build order

Each step is something you can actually play or click before the next one starts. Nothing is built beyond a step until it works.

| # | Step | Done when |
|---|---|---|
| 1 | Board | An empty 5×9 lawn draws and resizes with the window — **done** |
| 2 | Sun | A sun counter; sun falls on a timer; clicking collects it — **done** |
| 3 | Planting | One seed packet; click it, click a square, plant appears, sun is spent — **done** |
| 4 | Shooting | That plant fires, hits a zombie, and it dies — **done** |
| 5 | Walking | A zombie enters at the right of a row and moves left at a fixed speed — **done at ticket 04** |
| 6 | Eating | It stops at a plant, eats it, then carries on — **done** |
| 7 | Lawn mowers | A zombie at the left edge spends the row's mower and clears the row — **done** |
| 8 | Win and lose | Waves end, then either a win or game over — **done at ticket 08** |
| 9 | **Level 1-1** | A whole level, start to finish, playable — **the level plays start to finish at ticket 08, won and lost; the menu and level select are done at ticket 19** |
| 10 | The other 9 plants | One at a time, each with its rule test — **all nine done**: Sunflower at ticket 09, Wall-nut and Tall-nut at ticket 10, Snow Pea, Repeater and Puff-shroom at ticket 12, Potato Mine at ticket 13, Cherry Bomb at ticket 14, Chomper at ticket 15. Ahead of each other as ADR 0005 sets out |
| 11 | Level 1-1 balance pass | Level 1-1's pacing settled by playing it, not by reading it — **done, ticket 11** |
| 12 | The other 4 zombies, levels 1-2 to 1-10 | Added as data — **Conehead and Buckethead done at ticket 16, Pole Vaulting done at ticket 17 (all five zombies built), Levels 1-2 to 1-10 done at ticket 18** |
| 13 | Saved progress | Levels stay unlocked between sessions — **done at ticket 19** |
| 14 | Art pass | Placeholder shapes replaced with the real SVG art |


Steps 1-11 use plain coloured shapes. That is not laziness — it means the rules get right before any pixel does. The art is a swap at the end, and it is the first thing you would want changed anyway.

### Why the two Wall-nut plants are not in Level 1-1

A Wall-nut is only ever planted if some Level offers it, and Level 1-1 is the only Level there is. It does not offer them, and the balance pass at step 11 is better for that: the Sunflower went in because the pacing was tuned without an economy, but a fourth packet is a change to what the level asks of a player, and a pass that measures Level 1-1 should be measuring Level 1-1. So they are reached through a test bed offering all seven, at `dist/index.html?level=test-bed`. What belongs in a level, and when, is step 11's answer. See `docs/adr/0006-a-test-bed-for-plants-level-1-1-does-not-offer.md`.

### Why the Sunflower comes before the Wall-nut

Level 1-1's Wave spacing was set at step 8 on the assumption that a Peashooter is the only thing Sun is spent on, so a Sunflower has to land before that spacing can honestly be balanced — otherwise the level is balanced against a lie. It is also the only plant needing a new mechanism: Sun made at a plant rather than by the sky. The Wall-nut needs none, and waits without cost. The cost of this order is real and recorded: eating sits purposeless a release longer, since nothing is worth being eaten *for* until a plant blocks a Row. See `docs/adr/0005-sunflower-before-wall-nut.md`.

## Known risks

- **Some original numbers are from memory.** Sun costs and health are close; exact damage and wave timings are less certain. They are all in `balance.ts` with uncertain ones marked, and playtesting will find them.
- **I cannot tell you whether it feels right.** I can drive the game with a headless browser and take screenshots, but whether the original's *feel* is captured is your judgement, not mine. Expect to playtest early and often.
- **The lawn mower rule is the easiest thing to get wrong.** It is a one-use life per row, and losing a second zombie in the same row must end the level.
- **Level 1-1 could not be lost, and could not be won either.** Found by playing it: the old schedule sent two Zombies into Row 3, 25 seconds apart, and the mower ran on the first of them at about 63 seconds — clearing *both*, because a mower clears its whole Row. Nothing else was ever sent to that Row, so no Row was ever breached twice and a player who did nothing played for ever. **Fixed at ticket 08** by a schedule that sends a Zombie into a Row *after* that Row's mower has run: doing nothing loses at **142.3 seconds** and the obvious plan wins at **173.2** — both stated in checks since **ticket 11**, which is the balance pass this file has been promising. That pass also settled the Sunflower's numbers by playing rather than by reading them, and found that **Level 1-1 leaving two Rows unattacked is what makes a safe economy possible at all**. See `docs/adr/0007-sunflower-numbers-confirmed-by-playing.md`.
- **WSL2**: the game window opens on the Windows side, not inside the terminal. A browser *can* still be driven headlessly from inside WSL, which is how presentation gets checked, and it is not the missing libraries it looks like:

  ```
  chromium --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
           --hide-scrollbars --remote-debugging-port=9333 --user-data-dir=/tmp/profile about:blank
  ```

  It comes up, and the `dbus` and `GCM` errors it prints afterwards are WSL noise that mean nothing here. What does not work is a WebSocket client that forgets to mask its frames: a frame sent *by* a client must have bit `0x80` set in its second byte, and without it the browser drops the socket with no error at all. That failure looks identical to a sandbox problem and is not one, so check the mask bit before reaching for `--no-sandbox`. Read the game back by dispatching real `Input.dispatchMouseEvent` clicks and reading pixels off the canvas with `getImageData`; the Sun's core colour, `#fff9c4`, is used by nothing else in the drawing, so those pixels are Sun and only Sun.

## Once the plan is agreed

`AGENTS.md` used to say this repo had no application code and no build commands. Both were true when the plan was written and stopped being true at step 1, so `AGENTS.md` was corrected in the same commit as the code that made it wrong.
