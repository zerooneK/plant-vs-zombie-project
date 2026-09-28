# Context: Plants vs. Zombies Prototype

The vocabulary of a lawn-defence game built to match the original Plants vs. Zombies. This is a glossary only — no design decisions or technical choices live here.

## The board

**Square**:
One position on the board, where a single plant can sit. Identified by a row and a column.
_Avoid_: cell, tile, slot, grid position

**Row**:
One of the five horizontal lines running across the board. Zombies walk along a row; the lawn mower sits at the left end of each one.
_Avoid_: lane, line, track

**Column**:
One of the nine vertical positions. Zombies enter at the right and move leftwards, so the rightmost column is where they appear.
_Avoid_: x position, depth, rank

**Lawn Mower**:
A one-use rescue. When a zombie reaches the left edge of a row, the mower runs across that row and removes every zombie in it. A row that has spent its mower can no longer be defended.
_Avoid_: mower, lawnmower, sentinel, last line of defence

## Plants and sun

**Sun**:
The only resource. It falls from the sky over time and is produced by some plants, and it is spent to plant everything else. Uncollected sun does not count.
_Avoid_: currency, money, energy, points

**Seed Packet**:
A card in the seed bank showing one plant and its sun cost. Choosing a seed packet and then choosing a square puts that plant there.
_Avoid_: card, button, item, shop item

**Seed Bank**:
The row of seed packets across the top of the board, holding the plants available in the current level.
_Avoid_: toolbar, inventory, HUD, menu

**Recharge**:
The wait after a plant is used, during which its seed packet cannot be chosen again. Every plant has its own recharge time.
_Avoid_: cooldown, timer, wait

**Shovel**:
The tool that clears a planted plant out of its square. It gives no sun back.
_Avoid_: delete, remove tool, pickaxe

## Zombies and waves

**Zombie**:
An enemy that walks leftwards along a row and eats what it meets. A zombie that eats a plant stops eating once the plant is gone.
_Avoid_: enemy, mob, monster, attacker

**Armour**:
A separate layer on a zombie that has to be destroyed before the zombie underneath can be hurt.
_Avoid_: shield, helmet, plating

**Wave**:
A scheduled group of zombies entering from the right side of the board. Each level is made of waves on a timer.
_Avoid_: spawn group, round, wave spawn

**Flag Wave**:
The last wave of a level. Every zombie in it is tougher than the others and a flag is raised, signalling that the level is nearly over.
_Avoid_: huge wave, boss wave, final wave, climax

## Playing a level

**Level**:
One day of play: a name, the plants it allows, and the schedule of waves. Levels are played in order and each one unlocks the next.
_Avoid_: stage, mission, map, round

**Adventure**:
The mode played here: levels in order, each unlocking the next.
_Avoid_: campaign, story mode

**Game Over**:
The end of a lost level. It happens when a zombie reaches the left edge of a row whose lawn mower has already been spent.
_Avoid_: loss, defeat, you lose

**Win**:
The end of a cleared level. It happens when the last wave has come and no zombies remain, and it stops the level as surely as a Game Over does. Winning a level is what unlocks the next one.
_Avoid_: victory, win screen, success, level cleared

**Breach**:
A zombie walking off the left edge of the board. Only possible in a row that has already spent its lawn mower, so a breach always means Game Over.
_Avoid_: escape, leak, break-in
