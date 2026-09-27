# Spec: Lawn Defence MVP

Status: agreed, not started. Sits alongside `docs/plan.md` (build order) and the decision records in `docs/adr/`. Vocabulary follows `CONTEXT.md`.

## Problem Statement

There is no game here yet. The repository holds agent skills and planning documents, and its directory is named for a Plants vs. Zombies prototype that does not exist.

What is wanted is a first playable version: the gameplay of Plants vs. Zombies, faithful enough that someone who has played the original recognises it immediately — the same numbers, the same rules, the same tension — but small enough to finish quickly. The characters will be changed later, so this version should not spend effort on art that will be thrown away.

Three constraints come with the request. The process must be simple, so that the project can be understood and changed by one person without a large toolchain. It must be quick, so that a playable result arrives before enthusiasm runs out. And it must be secure, so that the finished game needs no server, no accounts and no network, and the project pulls in no packages that have not been looked at.

## Solution

A single-player lawn-defence game that runs in a browser from local files, with no backend of any kind.

The board is the original's: five Rows crossed by nine Columns of Squares, with a Lawn Mower at the left end of each Row. Sun is the only resource, falling from the sky and produced by certain plants, and it is spent on Seed Packets drawn in the Seed Bank. Zombies enter at the right of a Row, walk leftwards, eat the plants in their way, and are removed when their health and Armour are gone. A Level is a scheduled series of Waves, ending in a Flag Wave, and beating one unlocks the next.

The first version covers Levels 1-1 to 1-10, ten plants and five Zombies. All artwork is original and simple, so it can be replaced without touching the rules.

The rules live in one part of the program that knows nothing about drawing or about the user interface. That separation is what allows the whole rulebook to be checked automatically in a terminal, and it is the most important structural decision in the project.

## User Stories

### The board

1. As a player, I want to see a lawn of five Rows and nine Columns, so that the board matches the original.
2. As a player, I want the lawn to scale to fit my window without stretching or distorting, so that it looks correct on any screen.
3. As a player, I want to begin at Level 1-1 when I open the game, so that I start where the original starts.
4. As a player, I want a menu I can return to between levels, so that I am not trapped in a level I want to leave.
5. As a player, I want to restart a level without reloading the page, so that losing does not cost me a full page load.

### Sun

6. As a player, I want Sun to fall from the sky on a timer, so that there is always a reason to look up.
7. As a player, I want to collect falling Sun by clicking it, so that gathering is an active choice rather than automatic.
8. As a player, I want Sun I do not collect to be lost, so that I must pay attention.
9. As a player, I want a counter showing the Sun I am holding, so that I can plan what to plant.
10. As a player, I want to spend Sun only when a Seed Packet is chosen, so that Sun is never lost to a misclick on empty grass.
11. As a player, I want the game to refuse a purchase I cannot afford and take no Sun for it, so that I am never charged for a failed attempt.

### The Seed Bank and planting

12. As a player, I want the Seed Bank to show exactly the plants my current Level allows, so that the choice of plants is part of the level's design.
13. As a player, I want each Seed Packet to show its Sun cost, so that I can plan without memorising numbers.
14. As a player, I want to choose a Seed Packet and then choose a Square, so that planting takes one deliberate click each.
15. As a player, I want the chosen Seed Packet to follow my pointer so I can see what I am about to place, so that I do not plant the wrong thing.
16. As a player, I want a Square that already holds a plant to refuse a new plant without charging me, so that a misclick costs nothing.
17. As a player, I want a Square holding a Lawn Mower to refuse a plant, so that I cannot lose my last defence.
18. As a player, I want a Seed Packet I have just used to become unavailable while it Recharges, so that I cannot spam one plant.
19. As a player, I want each plant to have its own Recharge time, as in the original, so that a cheap plant is also a plant I must ration.
20. As a player, I want a Shovel for clearing a plant I regret, so that a bad placement is not fatal.
21. As a player, I want the Shovel to give no Sun back, so that removing a plant has a real cost.
22. As a player, I want to be able to reach every plant I can plant using only the mouse, so that I never have to find a keyboard shortcut.

### The ten plants

23. As a player, I want a Peashooter that fires at the nearest Zombie in its Row, so that Rows are defended one at a time.
24. As a player, I want a Peashooter to be useless when no Zombie is in its Row, so that a plant in an empty Row is not free income.
25. As a player, I want a Sunflower that produces Sun on a timer, so that I can build up an economy before I build a defence.
26. As a player, I want a Sunflower to be cheap and weak, so that the choice between economy and defence is a real decision.
27. As a player, I want a Wall-nut that a Zombie stops to eat instead of walking past, so that a plant can buy time for the plants behind it.
28. As a player, I want a Wall-nut to have a lot of health, so that it survives long enough to be worth its cost.
29. As a player, I want a Tall-nut that blocks like a Wall-nut but has much more health, so that one plant can hold a Row for a long time.
30. As a player, I want a Potato Mine that sits dormant after planting, so that planting it early is not immediately useful.
31. As a player, I want a Potato Mine to arm itself after a delay, so that it is a thing I prepare rather than place.
32. As a player, I want a Potato Mine to destroy the first Zombie that reaches it and then be gone, so that it is a one-time trap.
33. As a player, I want a Snow Pea that fires at the nearest Zombie in its Row, so that I can slow a Zombie down without destroying it.
34. As a player, I want a slowed Zombie to move more slowly, so that a slow Zombie gives the plants behind it more time.
35. As a player, I want a Chomper that removes the Zombie it reaches in a single bite, so that a single plant can deal with a threat outright.
36. As a player, I want a Chomper to spend a long time chewing afterwards and be unable to eat during that time, so that a Chomper is a burst of power rather than a permanent answer.
37. As a player, I want a Repeater to fire two projectiles at a time, so that it is a straight upgrade to the Peashooter.
38. As a player, I want a Cherry Bomb to remove every Zombie in a small area at once and then be gone, so that I have a way out of a Row I have already lost.
39. As a player, I want a Puff-shroom that costs no Sun, so that a plant is always available even when I am broke.
40. As a player, I want a Puff-shroom to have a short range, so that being free has a limit.
41. As a player, I want a plant to be removed when its health runs out, leaving the Square empty, so that a Row can be rebuilt after a mistake.
42. As a player, I want the numbers behind every plant — cost, health, damage, Recharge — to be the original's where I know them, so that the balance feels right rather than merely plausible.

### Zombies

43. As a player, I want a Zombie to enter at the right of a Row and walk leftwards at a steady speed, so that a threat is always visible well before it arrives.
44. As a player, I want a Zombie to stop at a plant and eat it, so that plants act as obstacles rather than scenery.
45. As a player, I want a Zombie to carry on walking once the plant is gone, so that a broken Row keeps deteriorating.
46. As a player, I want a Zombie to be partway through eating when something removes its food, so that the attack stops and it resumes walking.
47. As a player, I want Armour to take hits before the Zombie's own health, so that a Conehead or Buckethead is visibly two problems rather than one.
48. As a player, I want Armour to come off when it is destroyed, so that finishing an Armoured Zombie is a two-stage act.
49. As a player, I want a Pole Vaulting Zombie to vault the first plant it meets and then walk like any other Zombie, so that one plant does not stop it.
50. As a player, I want a Basic Zombie, a Conehead, a Buckethead, a Pole Vaulting Zombie and a Flag Zombie, so that the original's five early Zombies are all present.
51. As a player, I want a Zombie to be removed once it has no health and no Armour, so that a cleared Row looks clear.

### Lawn Mowers and Game Over

52. As a player, I want a Lawn Mower at the left of every Row at the start of a Level, so that my first mistake is not immediately fatal.
53. As a player, I want a Lawn Mower to run across its Row and remove every Zombie there when a Zombie reaches the left edge, so that a lost Row is saved once.
54. As a player, I want a spent Lawn Mower to never come back, so that the rescue is a limited resource.
55. As a player, I want the level to end in Game Over when a Zombie reaches the left edge of a Row whose Lawn Mower is already spent, so that the stakes stay real after the mower is used.
56. As a player, I want to see which Rows have spent their Lawn Mower, so that I know where the level is one mistake from ending.

### Waves and finishing a level

57. As a player, I want a Level to be a schedule of Waves, so that the pressure rises through a level rather than arriving evenly.
58. As a player, I want each Wave to send its Zombies in at the right side of chosen Rows, so that I must read which Row is under attack.
59. As a player, I want the Flag Wave to come last and to be tougher than the others, so that the end of a level is a climax.
60. As a player, I want to be told when the Flag Wave is coming, so that a final push is a decision rather than a surprise.
61. As a player, I want a Level to be won when the last Wave has come and no Zombies remain, so that clearing the field is what ends the level.
62. As a player, I want winning to unlock the next Level, so that progress moves forward.
63. As a player, I want the ten Levels to be defined in one place I can read and adjust, so that difficulty is tuned by changing numbers rather than code.

### Art

64. As a player, I want the plants and Zombies drawn as original simple artwork, so that this is our own project rather than a copy of someone else's.
65. As a player, I want to be able to change the artwork without changing any rule, so that replacing the characters later is a visual job.
66. As a player, I want the board to be readable at a glance — my plants distinct from Zombies, and each Row easy to follow, so that I can react quickly.

### Progress and trust

67. As a player, I want my unlocked Levels and my best times to be remembered between sessions, so that I do not replay the opening of the game every time.
68. As a player, I want my progress stored only on my own machine, so that nothing about my play leaves it.
69. As a player, I want the game to need no account, no login and no passwords, so that there is no credential for anyone to steal.
70. As a player, I want the game to work with the internet disconnected, so that it always starts.
71. As a player, I want the finished game to need no installed software beyond a browser, so that opening it is the only setup step.
72. As a player, I want the game to behave identically on a fast and a slow machine, so that my machine's speed is not part of the difficulty.

### For whoever builds this next

73. As a developer, I want every number in one place, so that a value taken from memory and found to be wrong can be corrected without reading the whole program.
74. As a developer, I want the rules to run with no drawing and no user interface, so that the whole rulebook can be checked automatically in a terminal.
75. As a developer, I want a game's outcome to be decided by a single step of the rules, so that a level can be replayed in a test with a known list of actions.
76. As a developer, I want the React-to-rules layer to stay as thin as possible, so that mistakes there are easy to spot by playing.
77. As a developer, I want Levels to be data rather than code, so that adding one is an edit and not a feature.
78. As a developer, I want the rule checks to need no extra packages, so that testing does not grow the project's dependency list.
79. As a developer, I want placeholder shapes until the rules are right, so that no time is spent on art that will be redone.

## Implementation Decisions

**One rulebook, no drawing, no user interface.** The rules exist in a single part of the program that renders nothing and holds no interface state. Everything the game decides — Sun, planting, movement, eating, damage, Waves, winning, Game Over — happens there. This is the seam everything else is built around, and it exists so the rules can be exercised without a browser.

**A single entry point into the rules.** The rules are advanced only by one operation that takes a game state plus one command and returns a new game state. Nothing else may change game state. A level therefore has a definite outcome for a given list of commands, which is what makes an automated check possible.

The commands are: advance one fixed step, select a Square, collect Sun at a position, choose a Seed Packet or the Shovel, place a plant in a Square, and clear a Square with the Shovel. (Selecting a Square was added by ticket 01: the first playable step showed that which Square the player has clicked is game state, not view state, because it decides where the next command lands. Choosing a Seed Packet was added by ticket 03 for the same reason - the chosen packet decides what the next command does, and whether it can be chosen at all is a rule about Recharge rather than about how the Seed Bank looks.)

**Fixed step timing, separate from drawing.** The game advances sixty steps a second on a counter, independent of the display. Drawing may skip or repeat frames without changing anything about play. This keeps a fast machine from being an easier machine, and it keeps a check repeatable.

**The board is fixed and unrotated.** Five Rows, nine Columns, Lawn Mower at the left of each Row, Zombies entering at the right. No alternate boards, no tilted layouts, no Rows beyond five. (One deliberate difference, settled at ticket 03: in the original the mower stands on its own strip to the left of the lawn, which is not one of the nine plantable Columns, and this board has no such strip. Here the mower stands in the first Column, so that Column refuses a plant and the lawn is eight Columns wide to plant rather than nine. The rules come out the same - you cannot plant where the mower stands, and you cannot shovel a mower away - but the space it costs is the first Column instead of none.)

**A Level is what a game is started from.** The rules begin from a Level, which says which plants the Seed Bank offers and what Waves it sends; `LEVEL_1_1` is simply the default while it is the only one. That is why the plant list belongs to a Level rather than to the game, and it is what lets a check ask for a Level of its own - one Zombie in one Row at one time, rather than whatever the level in hand would happen to send. (Settled at ticket 04, which needed a Zombie to appear and could not do it without the schedule the waves were always going to need.)

**A Zombie is not in a Square; it is between them.** A plant occupies a Square and is either there or not. A Zombie walks along a Row across all nine Columns, so what it has is a Row and how far along that Row it is - a count of steps walked, from which its place is worked out, rather than a position that would drift by a fraction of a unit every step. The rules ask a Square what occupies it, and ask a Row what is walking along it, and never confuse the two. (Settled at ticket 04.)

**Plants shoot forwards, and only forwards.** A Peashooter fires at the nearest Zombie in its own Row that has not yet walked past it, and does nothing at all when that Row holds nothing ahead of it. A Zombie that has gone by is behind the plant rather than in front of it, so it is not shot at - as in the original, where plants only ever fire to the right. A pea lands on the Zombie it was aimed at and no other: a pea whose target is already gone carries on past whatever it meets. (Settled at ticket 04; the direction of shooting was not in the ticket, and leaving it undecided would have meant either shooting backwards or leaving Zombies unanswerable.)

**Data, not code, for anything a designer would tune.** Plants, Zombies and Levels are tables of values. Levels in particular are pure data so that adding one is an edit.

**One place for every number.** Sun costs, health, damage, movement speed, Recharge times, attack rates, Sun production, and Wave schedules are all held together. Values believed to be the original's are recorded as such; values recalled from memory and not certain are marked in place, so that nobody trusts a number more than it deserves.

**Plant and Zombie behaviour is behaviour, not special cases.** New plants and Zombies are added as entries in those tables plus, at most, a small named behaviour. Rules that apply to everything — Recharge, removal at zero health, cost on placement — are implemented once.

**The user interface is React, except the lawn.** React owns the menu, the Seed Bank and the status readouts. The lawn is drawn on a canvas by its own loop, which never causes React to re-render. Status readouts are allowed to update at a human rate rather than a frame rate.

**No backend, ever, in this version.** No server, no accounts, no authentication, no network calls while playing. Progress is kept in the browser's own storage. The build produces static files that are opened directly.

**The build has to produce a classic script, not an ES module.** A browser refuses to load an ES module over the `file://` protocol, and a stylesheet marked `crossorigin` is refused there too, so a normal module build renders a blank page when the game is opened by double-clicking. This is easy to get wrong because the same build works perfectly over HTTP, and the failure is a silent white screen. The bundling configuration exists to work around it; a rewrite of that configuration would quietly break "open the file and play".

**Dependencies are React, the bundler and the language tooling.** All are MIT-licensed and pinned exactly. The bundler is a development-only tool; the finished game ships without any of them. Nothing is added for the sake of convenience.

**Artwork is ours, and is separable from the rules.** All artwork is original and simple, held apart from the rules so it can be replaced wholesale. The original game's artwork, character names and audio are not used.

**Mouse only.** Every action is reachable with the pointer. Keyboard shortcuts may be added later but no part of the game may require one.

## Testing Decisions

**What makes a good test here:** a statement about the game that a player would recognise as true, phrased without reference to how the program is built. Tests name what the player gets — a plant placed, a Zombie eaten, a level won — never the fields, functions or modules that produce it. A test that would still pass after rewriting the entire rules behind a different shape is a good test; one that breaks whenever an internal detail moves is not.

**The seam: the single entry point into the rules.** Every check is written as a sequence of commands fed to that entry point, and an assertion about the resulting state. There are no other seams. No check opens a browser, mounts a component, or inspects a drawn pixel.

**Tested: the whole rulebook.** Sun economy — Sun falls, uncollected Sun is lost, collecting adds it, a purchase is refused and takes nothing when Sun is short. Planting — a plant is placed and charged, a Square already holding a plant refuses without charging, a Square holding a Lawn Mower refuses, and a used Seed Packet is unavailable until it has Recharged. Plant behaviour — a Peashooter fires at the nearest Zombie in its Row and at no other, and fires nothing at all when that Row holds none; and each of the ten plants does what its own rule says, including the one-shot nature of the Potato Mine and the Cherry Bomb, the chew lockout of the Chomper, and the two-projectile fire of the Repeater. Zombie behaviour — movement is steady and is the same on a fast machine and a slow one, a Zombie that walks past the left of the board leaves the lawn, eating stops and resumes, Armour is taken before health, a Pole Vaulting Zombie vaults once, and an exhausted Zombie is removed. Lawn Mowers — a spent mower saves its Row exactly once, and a second breach of that Row ends the level in Game Over. Waves and completion — Waves arrive on their schedule, the Flag Wave is last and tougher, a Level ends in a win once the last Wave is gone, and winning unlocks the next. Data — the ten Levels and both rosters are well-formed, and every Level can start and finish. Pacing — a second of play is sixty steps however the time arrives, and a long pause does not freeze the game.

**One deliberate exception: the board geometry.** The pure geometry that maps a click on the canvas to a Square *is* checked, in Node, alongside the rules. It is not drawing: it has no canvas and no DOM. It exists precisely because the rules depend on it — the Square that is drawn and the Square that is clicked must be the same one, and without this check a mismatch between them would be invisible. Nothing else in the drawing or the interface is checked.

**Not tested, and why.** The canvas, the painting, the artwork, the React components, and the wiring from a click to a command. There is no browser-driving layer and no component-testing dependency. The reason is that each of these would add a second seam and a package, and the project's rule is that neither is added for the first version. **The known gap:** if a click never reaches the rules, no committed check will catch it.

The click path was nevertheless verified by hand after ticket 01, using a browser driver installed outside the project so that the project's own dependency list was untouched. A real click was driven at known Squares, either side of a boundary between Columns, in the empty space around the board, and again after the window was resized. All reached the rules as expected. That is a one-off check, not a committed one: the gap described above still stands, and closing it properly is a later decision.

**Runner:** Node's built-in test runner with its built-in assertions. No test framework is added. The checks run in a terminal, in seconds, with no browser.

**Prior art:** none. The repository has no existing tests and no test conventions to match, so these establish the convention.

## Out of Scope

- Night levels, pool levels, roof levels, and any board other than the five Rows by nine Columns
- Graves and the Grave Buster
- The Almanac, and any encyclopedia of plants or Zombies
- The upgrade shop and any upgrade tree
- Mini-games, puzzle modes, Survival and Zen modes
- A second player, and any shared or networked play
- Sound of any kind, and music
- Coins, and any currency or reward beyond Sun
- Any plant beyond the ten named, and any Zombie beyond the five named
- Publishing the game, a scoreboard, or any form of online service
- Automated checks of the interface, and the second seam they would require

## Further Notes

**The numbers are partly from memory.** Sun costs and plant health are held with reasonable confidence. Exact damage per hit, exact attack rates and the exact Wave schedule of each original Level are less certain. All of them live in one place and uncertain ones are marked where they sit, so the first playtest should be treated as a balance pass with the same purpose as any other.

**Feel is the player's judgement, not the author's.** The game can be checked for correctness and still not feel like the original. Whether the pacing, the value of Sun and the pressure of the Flag Wave are right can only be settled by someone playing it. The build order is arranged so there is something playable early and often, for that reason.

**The Lawn Mower rule is the most likely thing to get wrong.** It is a one-use life per Row, not a repeating rescue, and a second breach of the same Row must end the level. It has its own checks for that reason.

**The interface cannot judge itself.** Checks cover the rules and nothing above them. The plan deliberately postpones the real artwork until the rules are right, and uses plain shapes before that, so that no effort is spent twice.

**Publishing.** This spec was written to the repository rather than published to an issue tracker, because no tracker is configured and the repository has no remote. `ready-for-agent` triage has therefore not been applied. Running the project setup flow would create the tracker and triage vocabulary; a Git remote is needed first.
