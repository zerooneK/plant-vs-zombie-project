# Spec: Lawn Defence MVP

Status: agreed, being built. Build order and progress are tracked in `docs/plan.md`; steps 1 to 9 and 11 are done; step 10 is done as of ticket 15, which was the Chomper. Sits alongside `docs/plan.md` (build order) and the decision records in `docs/adr/`. Vocabulary follows `CONTEXT.md`.

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

**The board is fixed and unrotated.** Five Rows, nine Columns, Lawn Mower at the left of each Row, Zombies entering at the right. No alternate boards, no tilted layouts, no Rows beyond five. (One deliberate difference, settled at ticket 03: in the original the mower stands on its own strip to the left of the lawn, which is not one of the nine plantable Columns, and this board has no such strip. Here the mower stands in the first Column, so that Column refuses a plant and a fresh lawn is eight Columns wide to plant rather than nine. A Row that has spent its mower is nine. The rules come out the same - you cannot plant where the mower stands, and you cannot shovel a mower away - but the space it costs is the first Column instead of none.)

**A Level is what a game is started from.** The rules begin from a Level, which says which plants the Seed Bank offers and what Waves it sends; `LEVEL_1_1` is simply the default while it is the only one. That is why the plant list belongs to a Level rather than to the game, and it is what lets a check ask for a Level of its own - one Zombie in one Row at one time, rather than whatever the level in hand would happen to send. (Settled at ticket 04, which needed a Zombie to appear and could not do it without the schedule the waves were always going to need.)

**A Zombie is not in a Square; it is between them.** A plant occupies a Square and is either there or not. A Zombie walks along a Row across all nine Columns, so what it has is a Row and how far along that Row it is - a count of steps walked, from which its place is worked out, rather than a position that would drift by a fraction of a unit every step. The rules ask a Square what occupies it, and ask a Row what is walking along it, and never confuse the two. (Settled at ticket 04.)

**Plants shoot forwards, and only forwards.** A Peashooter fires at the nearest Zombie in its own Row that has not yet walked past it, and does nothing at all when that Row holds nothing ahead of it. A Zombie that has gone by is behind the plant rather than in front of it, so it is not shot at - as in the original, where plants only ever fire to the right. A pea lands on the Zombie it was aimed at and no other: a pea whose target is already gone carries on past whatever it meets. (Settled at ticket 04; the direction of shooting was not in the ticket, and leaving it undecided would have meant either shooting backwards or leaving Zombies unanswerable.)

**A shot is described once and every shooter is the same one with something changed.** What a plant's shot does - its damage, whether it slows what it reaches, whether it passes through what it reaches rather than stopping, and how far along the Row it goes - is one value in the plant's roster, carried by each projectile as it flies, and the four shooters are four versions of a single plain pea rather than four cases in the rules. A Repeater fires two of them in one shot; a Snow Pea's goes through a whole line of Zombies and leaves each of them walking slowly; a Puff-shroom's is spent three Columns from the plant. (Settled at ticket 12, which is where the three variants were built. It matters because "each of these behaves like the Peashooter with one change" is then a fact about the data: the one line that differs in each of the three entries is the whole difference, and a check holds each of them. A check that watched a whole level rather than a single shot would not have been able to tell the difference at all - a Snow Pea that merely aimed at the nearest Zombie still ends up hitting every Zombie in its Row over a few seconds, because the ones it hits are slowed and fall behind so the next becomes the nearest. It is a different mechanism, and it stops working as soon as a Row's Zombies are spread out instead of queueing up.)

**A slow is a countdown on the Zombie, and it shortens its step rather than making it skip one.** A slowed Zombie walks at half speed for ten seconds, and the tally of steps it has walked goes up by half rather than by one. Half is not a nice number to pick: it is the only slowdown that is exact in whole and half steps together, and a Zombie is a tally rather than a position so that a fast machine and a slow one agree about where it is. Skipping a step every other step would be the obvious way to halve a speed and cannot express a fraction that is not one half. The countdown runs down on every step, eating or walking, and it is on the Zombie rather than on the Snow Pea that caused it - so digging the Snow Pea up leaves the Zombie walking slowly for what is left of the ten seconds, and then not. (Settled at ticket 12.)

**A Zombie eats the plant in the Square it is standing in, and eating is worked out rather than remembered.** A plant has health, like a Zombie; a Zombie walking along a Row stops where it finds one, stands there, and takes bites off it until there is nothing left, at which point the plant is removed, its Square left empty, and the Zombie carries on. Whether a Zombie is eating is not held in the state at all: it is worked out every step by asking the lawn which Square the Zombie's place falls in. So there is no such thing as a Zombie part way through eating that cannot see - a plant dug up with the Shovel, or finished off by another Zombie, is simply not there any more, and the same answer, walking on, comes out of both, with no latch to clear. (Settled at ticket 05. The one step of delay settled at ticket 04, where a Zombie arriving at the edge of the board is briefly seen arriving rather than already having moved, does *not* apply to reaching food: a Zombie bites on the step it reaches the plant, which needs no remembered state to know it has only just got there, and is the same shape as a Peashooter whose countdown sits at zero until there is something in front of it to shoot at.)

**A Lawn Mower is not food, and nothing reserves a plant.** A Zombie walks into the Square a mower stands in and does not eat it, because a mower is not a plant and there is nothing there to eat; what it does there instead is set the mower off, which is the next decision. Two Zombies that reach the same plant both bite it: the rule is the same for every Zombie, and the plant's health runs out sooner rather than later, with nothing claimed and nothing to keep in step. (Settled at ticket 05, the mower half of it because eating made the question unavoidable - a Zombie now walks the length of every Row it enters, and one of those Rows holds a mower in the first Column. The mower's own answer was settled at ticket 06.)

**A Zombie reaching a mower sets off that Row's mower, and a spent mower is off the lawn rather than marked on it.** A Zombie walking the length of a Row arrives at the mower's Square, the mower runs, and every Zombie in that Row is removed with it — on that step, not over the following seconds. It is asked as a Square and not as a distance, by the same question the Zombie asked a moment earlier to find a plant to eat, so the left edge of a Row is a place on the board like any other and the two answers are found the same way. A mower that has run is *gone*, not a mower carrying a flag saying it has run: that is what makes "is there still a mower in this Row" the one question that says whether the Row can be saved, and it is the same shape as a plant that has been eaten and a Zombie that has been killed — gone from the lawn rather than standing on it at zero. Two consequences follow, both deliberate. The mower clears its Row in the single step it runs, so a check can ask whether a Row was saved without first having to ask how fast a mower travels, and a mower is not a projectile but a Row's last defence going off at once. And a Row that has spent its mower is nine Columns wide to plant, because the mower's Square is drawn as bare grass and a bare Square takes a plant; a Square that looked like every other bare Square and refused one would be a Square a player could not read. (Settled at ticket 06, the spec having already named this as the rule most likely to be got wrong.)

**A breach ends the level, and a spent mower is not one.** A Zombie that walks off the left edge of the board has got in, and the level is lost there and then: this is a breach, and a breach is Game Over. It is a fact about a Zombie walking off the edge rather than a decision about the level, so the Zombies' own step reports which Rows were walked off and the level is ended from that — the same walk seen from two places, since a Row *with* a mower is answered by the mower and a Row without one by this. Three things follow from how it is asked, and all three are the point.

The breach is at x < 0, one step *past* the left edge of the board rather than on the mower's Square, and the asymmetry with the mower is deliberate: a mower stands on the lawn and is set off there, while the place a Zombie with no mower left gets to is off the edge of it, where the house is in the original. The whole of the rule is in that one step of difference between a Zombie standing on the last Column, which is still on the lawn and still a level being played, and one that has stepped past it.

Game Over is a fact about the level, held in the state, and once it is true *every* command is refused — `advance` included. Refusing the tick as well as the plants is what stops the level rather than slowing it: nothing moves, no more Sun falls, no Recharge runs down, and the player is left looking at the lawn they lost on. Letting the clock run would leave a lost level quietly going on with nobody playing it, which is worse to show a player than a stopped board. Playing again is a fresh game rather than an un-freezing of this one, because there is nothing to go back to.

And a mower running is *not* Game Over. That is the mistake this decision exists to prevent, and it is an easy one: a mower running empties a Row of its last defence, so the loss could perfectly well be wired to "this Row has no mower" rather than "a Zombie got in" — and every check about *losing* would still pass, because getting in always follows a mower having gone. A save is a save, the level goes on, and the other Rows are all still worth defending. (Settled at ticket 07.)

**A Row that has spent its mower says so, on the lawn and in words.** A mower that has run is gone rather than marked, which leaves a spent Row looking like one whose mower is behind a plant, or one that has yet to be drawn, or one that never had one. That is a bad thing to be unable to tell apart, because the difference between a Row that can still be saved and one that cannot is the whole of what Game Over turns on — so a player needs to know which they are watching *before* a Zombie gets there. The board marks where the mower stood, as a dashed footprint of the mower's own shape, and the page names the Rows in English; and both ask the lawn the same question the rules ask, so the picture and the rules cannot disagree about which Rows are still defendable. (Settled at ticket 07, and it is a decision rather than an obvious: the original leaves a spent mower as a bare strip and relies on the player remembering.)

**A Level's fate is one field with three values, not a boolean for each ending.** `playing`, `won` and `lost`, replacing the single `gameOver` boolean that ticket 07 introduced, which left a note saying this ticket should replace it rather than add to it. The reason is not tidiness: the two endings are not independent, and the arithmetic of one step can reach both at once. A Zombie that walks off the left edge of a spent Row is *gone from the lawn* on the step it does it, and a lawn with no Zombies and no Waves still to come is the definition of a win — so the same step satisfies both endings, and two booleans would hold a level that is won and lost simultaneously and leave the rules to decide which one the player is looking at. It is the loss. A Level is cleared by holding the lawn, and this is the lawn not being held, on the very step the schedule runs out. One field with three values cannot hold the contradiction, because there is nowhere in it to put it. (Settled at ticket 08.)

**A Level is won when its last Wave has come and no Zombies remain, and a won Level stops.** Both halves are read off the same step that caused them, from the same two questions the rest of `advance` already asks: what is still on the lawn, and what is still to come. Nothing is held for it, so nothing can be out of step with it. The lawn is put together once and used both for the state and for the ending, so the ending cannot be worked out from a different list of Zombies than the one the player is looking at — and the Wave that walked in *this* step is on that list, which is what stops a Level being won on the step its last Wave arrives: an empty lawn one step before a Zombie walks onto it is a lawn waiting, not a level finished. Won and lost are then refused the same way, by the same guard, for the same reason: a won board is as finished as a lost one, and a lawn still being defended with nothing left to defend is a worse thing to show a player than a stopped board. (Settled at ticket 08.)

**The Flag Wave is a Wave that says so, and it is last because it is marked, not because it is last.** A Wave carries `flagWave: true` or carries nothing at all — there is no `false` to get wrong, and a Level that wanted to write one would be writing down its own absence. The mark is what makes the Flag Wave a fact about the level rather than a position in a list: the last Wave of a Level *is* the Flag Wave, but a rule that worked it out from "which Wave is last" would quietly change what the last Wave means the moment a designer put a new one on the end. Which also means "is this the Flag Wave" is a question the Wave answers about itself, in the same way a Square answers what is standing in it. (Settled at ticket 08.)

**The Flag Wave is announced beforehand, by the rules and not by the interface.** Ten seconds ahead — a number in `balance.ts`, marked as not the original's, because the original's is not something this project can hold with confidence. The announcement is a fact about the level's schedule rather than a matter of how much the interface feels like saying, so it is worked out in `advance` and held in the state, and the interface is told whether it is on or not. Asked of the Waves still to come, so that a Flag Wave which has already walked in is not announced: the announcement and the Wave are the same event seen from two steps apart, and a banner that outlived the thing it was announcing would be the game's last act on screen. Both banners — the announcement and the ending — are laid over the help text rather than taking its place, so that neither of them moves the board. (Settled at ticket 08.)

**A Flag Wave's Zombies are tougher than the same Zombies in any other Wave, and the Flag Zombie is one of them.** A factor on their health rather than a different roster, so that a Flag Wave is *more* than an ordinary one rather than a different sort of thing. The Flag Zombie is in the roster as a name with no health of its own: it is an ordinary Zombie carrying a flag, which is what it is in the original, and the Wave is what makes it hard. So the original's Flag Wave — a great many ordinary Zombies with a Flag Zombie walking at the front of them — is not copied, and the reason is that a Wave which is only more of the same is not something a player can see coming and get ready for, and getting ready is the whole of what the announcement is for. The pressure comes from three of them arriving in three Rows at once.

The factor is one and a quarter, and it was one and a half when first written, on the argument that a third more health was a third more climax. **Playing the level said otherwise.** A Peashooter in the first Column there is to plant in — one to the right of the mowers — is reached by a Zombie in about thirty-three seconds, and a Peashooter fires every one and four tenths of a second, so one and a half health is twenty-nine seconds of shooting against the thirty-three a Zombie spends getting there: a margin of three and a half seconds, which is a coin toss rather than a margin, and a first playthrough of Level 1-1 lost on it. The mistake in the number was comparing thirty-three against the forty-two a Zombie spends crossing the *whole* lawn, which is the distance to a Peashooter in the last Column and not the one in the first. One and a quarter is seventeen peas against thirty-three seconds: nine seconds to spare, which is a Peashooter placed a little late rather than one standing in exactly the right place at exactly the right moment. This is the balance pass `docs/plan.md` promises, done by playing rather than by reading. (Settled at ticket 08.)

**Not built here: unlocking the next Level, and the menu.** Ticket 08 asks for both, and `docs/plan.md` puts them at steps 9 and 12 — "Level 1-1" and "Saved progress | Levels stay unlocked between sessions" — with level select and saved progress as ticket 19. Building them now would be two steps of the build order and a whole ticket, done early and in this commit, which is the one thing the build order exists to prevent. They are recorded unticked in the ticket rather than quietly dropped, and with one Level there is no next Level to unlock in any case: the rule that a won Level unlocks its successor is only checkable when a second Level exists, and a check that cannot fail is worse than no check. Plants, Zombies and Levels are tables of values. Levels in particular are pure data so that adding one is an edit.

**One place for every number.** Sun costs, health, damage, movement speed, Recharge times, attack rates, Sun production, and Wave schedules are all held together. Values believed to be the original's are recorded as such; values recalled from memory and not certain are marked in place, so that nobody trusts a number more than it deserves.

**A plant that blocks a Row is a plant with a lot of health, and that is the whole of it.** A Wall-nut is `shooting: null` and a larger number, and a Tall-nut is the same plant with a larger number still — the same Sun, the same Recharge, the same rate of being eaten, and no behaviour of its own. Adding both cost the rules nothing at all, which is what `docs/adr/0005` said would be true and this is the first ticket to show it rather than argue it. The two are separate entries in the roster rather than one entry with a taller flag, because they are not the same plant at two sizes: a Tall-nut goes *in front of* a Wall-nut rather than instead of one.

**The two nuts are told apart by shape and not by colour.** They cost exactly the same 50 Sun, so the Seed Bank offers two packets at one price and the only thing separating them is the picture. One brown that is wide and one brown that is tall is easier to name than two browns, and it is the original's own answer — a Tall-nut is a Wall-nut that is taller. Both are also kept inside their own Square, which is a rule about the drawing rather than about the plant: a plant drawn across the Row below is a plant a player reads as being in the wrong Row, and which Row a thing is standing in is the whole of reading this board.

**A plant no Level offers is reached through a test bed, and Level 1-1 does not grow a packet to make one reachable.** The two blocking plants are built and checked, and Level 1-1's Seed Bank is still a Peashooter and a Sunflower, because the balance pass immediately after is meant to measure Level 1-1 as it is. What a Level offers is that Level's design, so changing it to make a plant reachable would have measured a different level than the one the pass is about. Instead there is a test bed offering all seven plants, at `?level=test-bed`, and its reason is the one claim no check can make: a Wall-nut has to *look* like a Wall-nut and a Tall-nut like a Tall-nut, which is a screenshot and not an assertion. The address naming a Level is not level select — nothing is unlocked and nothing is a menu, which is a later ticket — and the rules are told nothing about it. See `docs/adr/0006-a-test-bed-for-plants-level-1-1-does-not-offer.md`.

**Plant and Zombie behaviour is behaviour, not special cases.** New plants and Zombies are added as entries in those tables plus, at most, a small named behaviour. Rules that apply to everything — Recharge, removal at zero health, cost on placement — are implemented once.

**Sun has two sources and is one resource.** Sun falls from the sky on a timer, and a Sunflower makes Sun on a timer of its own, but both are the same resource: the same counter, the same pieces on the lawn, collected by the same click and lost the same way. They are not two currencies, and the spec's "Sun is the only resource" is load-bearing enough that coining a word for each source would weaken a true claim to decorate the vocabulary. What the two sources differ in is *where* the Sun comes from, and that is the whole of the rule: a plant's Sun is made at the plant, asked for by Square rather than by the seed, and it comes to rest inside that Square. A Sunflower row is then a row of places the Sun appears, and a Sunflower can be found by looking for its Sun. The two timers are named apart in the code — `stepsUntilSkySun` and `stepsUntilSun` — so that one word in the glossary is two different countouts where a reader would otherwise have to guess which is which.

**A plant makes Sun while it is standing on the lawn.** The order inside a step decides this, and the order is asked at the end of the step rather than the start, so a Sunflower a Zombie finishes eating on the very step it was due makes nothing. The alternative — reading the plants as they were when the step began — would let a plant that is already off the lawn put one last piece of Sun down, and there is no reading of that which feels like money earned. It is the same rule the lawn already uses: everything a Zombie does on a step happens, and then the dead are cleared, and a plant that was eaten was eaten. A check says the Square is empty of Sun at that moment and stays empty, rather than saying its Sun is unchanged, because a check that a Sun it cannot see is allowed to add is not a check.

**A plant's Recharge is its own, and a Sunflower's is the Peashooter's.** Seven and a half seconds for both, so that the Recharge and not the Sun cost is what stops a bank of Sunflowers being a thing you can spend every step on — which is where the decision the game is actually about lives: the more Sun you have already made, the more you want another, and the less often you can have one.

**The user interface is React, except the lawn.** React owns the menu, the Seed Bank and the status readouts. The lawn is drawn on a canvas by its own loop, which never causes React to re-render. Status readouts are allowed to update at a human rate rather than a frame rate.

**No backend, ever, in this version.** No server, no accounts, no authentication, no network calls while playing. Progress is kept in the browser's own storage. The build produces static files that are opened directly.

**The build has to produce a classic script, not an ES module.** A browser refuses to load an ES module over the `file://` protocol, and a stylesheet marked `crossorigin` is refused there too, so a normal module build renders a blank page when the game is opened by double-clicking. This is easy to get wrong because the same build works perfectly over HTTP, and the failure is a silent white screen. The bundling configuration exists to work around it; a rewrite of that configuration would quietly break "open the file and play".

**Dependencies are React, the bundler and the language tooling.** All are MIT-licensed and pinned exactly. The bundler is a development-only tool; the finished game ships without any of them. Nothing is added for the sake of convenience.

**Artwork is ours, and is separable from the rules.** All artwork is original and simple, held apart from the rules so it can be replaced wholesale. The original game's artwork, character names and audio are not used.

**Mouse only.** Every action is reachable with the pointer. Keyboard shortcuts may be added later but no part of the game may require one.

## Testing Decisions

**What makes a good test here:** a statement about the game that a player would recognise as true, phrased without reference to how the program is built. Tests name what the player gets — a plant placed, a Zombie eaten, a level won — never the fields, functions or modules that produce it. A test that would still pass after rewriting the entire rules behind a different shape is a good test; one that breaks whenever an internal detail moves is not.

**The seam: the single entry point into the rules.** Every check is written as a sequence of commands fed to that entry point, and an assertion about the resulting state. There are no other seams. No check opens a browser, mounts a component, or inspects a drawn pixel.

**Tested: the whole rulebook.** Sun economy — Sun falls, uncollected Sun is lost, collecting adds it, a purchase is refused and takes nothing when Sun is short. Planting — a plant is placed and charged, a Square already holding a plant refuses without charging, a Square holding a Lawn Mower refuses, and a used Seed Packet is unavailable until it has Recharged. Plant behaviour — a Peashooter fires at the nearest Zombie in its Row and at no other, and fires nothing at all when that Row holds none, including when the Zombie has walked past it and is behind; a plant is removed when its health runs out, leaving its Square empty; and each of the ten plants does what its own rule says, including the one-shot nature of the Potato Mine and the Cherry Bomb, the chew lockout of the Chomper, and the two-projectile fire of the Repeater. Zombie behaviour — movement is steady and is the same on a fast machine and a slow one, a Zombie stops at a plant and eats it, the plant is gone at the end of it and the Zombie carries on, and it stops eating the moment its food is dug up rather than standing over an empty Square; a plant in another Row is no food at all; Armour is taken before health, a Pole Vaulting Zombie vaults once, and an exhausted Zombie is removed. Lawn Mowers — a Zombie reaching the left edge of a Row is stopped by that Row's mower on the step it arrives, the mower clears *every* Zombie in its Row and not one in any other, spending one Row's mower leaves every other Row its own, a spent mower never comes back, the Square it left can be planted in, and a second breach of a Row whose mower is spent is not saved. Game Over — a breach ends the level, once it is over nothing walks and nothing can be planted, a mower running is a save rather than a loss, and losing one Row leaves every other Row its own mower. Waves and completion — a Wave sends its Zombies in at the right of the Rows it names on its own step and no other; the Flag Wave is announced before it arrives and stops being announced when it does; every Zombie in it is tougher than in the other Waves and a Flag Zombie is among them; the Flag Wave is the last Wave of the Level and the only one; a Level is won when the last Wave has come and no Zombies remain, and is not won a step before; a Zombie getting in on the same step the last Wave is gone is a loss and not a win; a won Level stops as a lost one does; and Level 1-1 can be both lost by a player who plants nothing and won by a player who plants a Peashooter in every Row. (Unlocking the next Level is not built — see the decision above.) Data — the ten Levels and both rosters are well-formed, and every Level can start and finish. Pacing — a second of play is sixty steps however the time arrives, and a long pause does not freeze the game. And the balance pass over Level 1-1: a plan that opens with Sunflowers wins it, a plan that plants nothing loses it at a stated time, a Sunflower in a Row the schedule reaches first breaks even and one in a Row it reaches later pays for itself, each of the Sunflower's three numbers is confirmed by what it makes possible, and the spacing is unchanged because it has room for an economy. (Settled at ticket 11 - and the first draft of that said a Sunflower in any attacked Row never pays for itself, which playing all five Rows showed was false, so the check now states what playing found rather than what the ticket predicted.) The three shooter variants: one shot from each reaches exactly as many Zombies as that shooter should and no more, a Repeater's shot lands twice the damage on the same Zombie rather than reaching two, a Puff-shroom's puff is spent three Columns from the plant, measured by where it stops, while a Peashooter's pea crosses the whole lawn, a slowed Zombie walks at half speed beside one that is not slowed, goes back to full speed when the slow is over, and stays slowed after the Snow Pea that slowed it is dug up; only a Snow Pea leaves what it reaches slowed, and all four shooters are food for three bites and Recharge for the same seven and a half seconds, so that what separates the variants is what they do with a shot and not how long they last. And the test bed's Seed Bank is the whole roster with each packet's cost, which is the only place a player can reach any of them. (Settled at ticket 12.) The Potato Mine: it is planted not yet armed with its whole delay still to run, arms itself fifteen seconds later and not a step sooner, and stays armed rather than being briefly ready; the first Zombie to reach an armed mine is destroyed and the mine leaves the lawn with it, the mine is gone for good and a second Zombie walks through the Square it was in; two Zombies reaching one mine on the same step destroy one of them and not both; a Zombie reaching a mine on the very step it arms is destroyed by it while a step earlier it walks through; and a Zombie that reaches a mine before it has armed is untouched by it and eats the mine instead, as it would eat any other plant. (Settled at ticket 13.) The Cherry Bomb: it clears every Zombie in a small area around the Square it was planted in, and the Zombies one Square outside that area in each direction are left alone; it is gone from the lawn the moment it goes off, so its Square takes another plant and it never fires twice; its Sun is spent whether or not anything was in range; it goes off before the Zombies walk, so a Zombie it clears never gets the bite it was on its way to take; and it removes Zombies and not Plants, so a Wall-nut standing beside it is still standing afterwards. (Settled at ticket 14.) The Chomper: it destroys the Zombie it reaches in a single bite rather than damaging it, and stays standing; it then cannot eat for forty-two seconds, and a Zombie reaching it during that chew is not eaten by it; the chew is drawn, so a Chomper that has just eaten is visible as one that cannot eat; and a Zombie reaching a Chomper on the very step its chew runs out is eaten by it, which is the boundary between the two rules. (Settled at ticket 15.)

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

**The numbers are partly from memory.** Sun costs and plant health are held with reasonable confidence. Exact damage per hit, exact attack rates and the exact Wave schedule of each original Level are less certain. All of them live in one place and uncertain ones are marked where they sit, so the first playtest should be treated as a balance pass with the same purpose as any other. (One has been done — ticket 11, on Level 1-1 and the Sunflower. See below.)

**The Sunflower's numbers are confirmed by playing, and what decides a Sunflower's fate is when a Zombie arrives.** The balance pass found a Sunflower earns back its 50 Sun at 48.5 seconds while a Zombie crosses the whole lawn in 42.3 — the payback is longer than the lawn is wide, so a Sunflower only comes out ahead where a Zombie takes its time getting to it. Level 1-1 measures that across all five Rows: the Row the first Wave reaches at twenty-five seconds breaks even exactly, the Rows reached later make 75 and 100 against a cost of 50, and the two Rows nothing reaches make 125. *Every attacked Row pays for its Sunflower* — the first version of this claim said otherwise, from a check that had measured one Row and generalised. That is why the 24.25-second interval was kept rather than shortened: a faster Sunflower would be safe everywhere and the placement decision would go with it. It also means Level 1-1 leaving two of five Rows unattacked is load-bearing rather than incidental — a schedule that attacked every Row would leave an economy nowhere safe to be built. See `docs/adr/0007-sunflower-numbers-confirmed-by-playing.md`.

**Feel is the player's judgement, not the author's.** The game can be checked for correctness and still not feel like the original. Whether the pacing, the value of Sun and the pressure of the Flag Wave are right can only be settled by someone playing it. The build order is arranged so there is something playable early and often, for that reason.

**The Lawn Mower rule is the most likely thing to get wrong.** It is a one-use life per Row, not a repeating rescue, and a second breach of the same Row must end the level. It has its own checks for that reason. The near-miss next to it is losing a Row and losing the *level* in the same breath: the two are separate, a save is not a loss, and the whole of Game Over is the second breach of one Row rather than the first mower running.

**The interface cannot judge itself.** Checks cover the rules and nothing above them. The plan deliberately postpones the real artwork until the rules are right, and uses plain shapes before that, so that no effort is spent twice.

**Publishing.** This spec was written to the repository rather than published to an issue tracker, because no tracker is configured and the repository has no remote. `ready-for-agent` triage has therefore not been applied. Running the project setup flow would create the tracker and triage vocabulary; a Git remote is needed first.
