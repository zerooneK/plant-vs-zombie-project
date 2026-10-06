# 0017: Original vector artwork

**Status:** accepted

**Date:** 2026-10-06

## Context

Ticket 21 is the art pass specified as step 14 in `docs/plan.md` and User Stories 64–66 in `docs/specs/001-lawn-defence-mvp.md`.

Prior to this ticket, all plants, zombies, lawn mowers, projectiles, and sun tokens were rendered as crude geometric placeholder shapes (plain circles, ellipses, and untextured rectangles in `src/draw/board.ts`). This was intentional design discipline: game mechanics, timing, and rules were perfected and checked across tickets 1–20 without spending effort on art that could change.

With rules, balance, all ten plants, five zombies, levels 1-1 to 1-10, and level select complete, Ticket 21 replaces all placeholder shapes with original, characterful flat vector artwork.

## Decision

**1. Modular presentation architecture in `src/draw/art/`.**
Rather than leaving a monolithic thousand-line drawing file, artwork is separated into dedicated domain modules:
- `src/draw/art/plants.ts`: Original artwork for all 10 plants (Peashooter, Sunflower, Wall-nut, Tall-nut, Potato Mine, Snow Pea, Chomper, Repeater, Cherry Bomb, Puff-shroom).
- `src/draw/art/zombies.ts`: Original artwork for all 5 zombies (Basic, Conehead, Buckethead, Pole Vaulting, Flag Zombie).
- `src/draw/art/mowers.ts`: Red and silver motor mower and dashed spent-mower footprint.
- `src/draw/art/sun.ts`: Radiant sun token preserving the `#fff9c4` core colour required by headless verification.
- `src/draw/art/projectiles.ts`: Vibrant green peas and frosty crystalline Snow Pea shots.
- `src/ui/icons.tsx`: Crisp SVG icons for the Seed Bank packets and Shovel.

**2. Visual state representation without annotating the screen.**
- **Damage feedback**: A bite is cleanly taken out of the right side of plants (where eating zombies stand) and filled with the square's lawn colour. Damaged Wall-nuts develop shell stress cracks.
- **Plant states**: Armed Potato Mines illuminate a glowing red beacon with an ambient halo; Chomper mouth opens when ready and shuts with content chewing curves when digesting.
- **Zombie armour stages**: Conehead and Buckethead zombies wear their respective headwear only while armour remains; once destroyed, the headwear comes off, visually revealing the underlying zombie.
- **Slowed condition**: Zombies affected by Snow Pea peas take on a frosty cyan chill with cold glints.
- **Pole Vaulting**: Athletic singlet and long vaulting pole held in sprint posture while carrying the pole.

**3. Strict preservation of the rule boundary.**
All drawing code lives strictly in `src/draw/` and `src/ui/`. Zero game logic was altered or moved into presentation, and zero rules imports React or DOM APIs. All 164 automated rule tests run in Node with no browser.

## Consequences

- The game now features a complete, polished, and original visual presentation that looks like a finished product rather than a prototype.
- Seed Bank packets display clear plant icons alongside name and sun cost.
- The rulebook remains completely pure and fully checked by 164 passing tests.
