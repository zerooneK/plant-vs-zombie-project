# Changelog

All notable changes to this project are recorded here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project follows [Semantic Versioning](https://semver.org/).

## [0.26.0] - 2026-10-06

### Levels 1-2 to 1-10 (Ticket 18)

Completes the 10-level campaign data for Adventure mode, defining `LEVEL_1_2` through `LEVEL_1_10` in `src/game/levels.ts`.

- **Levels 1-2 through 1-10 defined:** Defined as pure data with plant offerings and wave schedules.
- **Sequential plant unlocks:** Plants expand by level across the campaign:
  - 1-1: Peashooter, Sunflower
  - 1-2: adds Cherry Bomb
  - 1-3: adds Wall-nut
  - 1-4: adds Potato Mine
  - 1-5: adds Snow Pea
  - 1-6: adds Chomper
  - 1-7: adds Repeater
  - 1-8: adds Puff-shroom
  - 1-9: adds Tall-nut
  - 1-10: all 10 plants offered
- **Canonical zombie debuts:**
  - Conehead Zombie debuts at Level 1-3
  - Pole Vaulting Zombie debuts at Level 1-6
  - Buckethead Zombie debuts at Level 1-8
  - All 5 zombies appear in Level 1-10
- **Schedule invariants:**
  - Every level begins with an initial breather (at least 20 seconds) before the first wave arrives.
  - Every level ends in exactly one Flag Wave carrying a Flag Zombie.
  - Every level is losable if the player takes no action.
- **Level progression helpers:** Added `LEVEL_ORDER` and `nextLevel(levelName)` to `src/game/levels.ts`. All levels registered in `LEVELS` for addressable loading via `?level=`.
- **9 new rule checks added:** Suite expands from 148 to 157 checks in `tests/levels.test.ts`, all passing.
- **ADR 0014 recorded:** Documents level progression, plant unlocks, and zombie pacing.

## [0.25.0] - 2026-10-06

### Pole Vaulting Zombie (Ticket 17)

The fifth and final early zombie: an athletic enemy that runs fast and vaults over the first plant it encounters.
With this ticket, all five early zombies from the original Plants vs. Zombies are implemented.

- **Roster & Stats:** `POLE_VAULTING_ZOMBIE` added with 500 health, 0 armour, and `hasPole: true`.
- **Running speed:** Runs at twice standard walking speed (2 steps per tick; 1 step per tick when slowed by Snow Pea)
  while holding its pole.
- **Vaulting mechanics:** Vaults across the first plant obstacle met into the Column to its left, dealing zero
  bite damage to the vaulted plant and dropping its pole (`hasPole = false`).
- **Tall-nut blocking:** Tall-nut stands too high to clear: the Pole Vaulting Zombie crashes into it, loses its pole,
  and must chew through the Tall-nut in place, keeping plants behind safe.
- **Trap interactions:** An armed Potato Mine or ready Chomper vaulted over is not triggered; if landed upon, the
  trap triggers normally.
- **Visuals:** Canvas renders the carried vaulting pole extending forward in the zombie's hands while `hasPole` is
  true, disappearing once vaulted or blocked.
- **Flag Wave scaling:** 500 health is scaled by 1.25 to 625 in Flag Waves.
- **8 new rule checks added:** Suite expands from 140 to 148 checks, all passing.
- **ADR 0013 recorded:** Documents mechanics, running speed, vaulting geometry, and Tall-nut interaction.

## [0.24.0] - 2026-10-06

### Conehead and Buckethead Zombies, and Armour (Ticket 16)

The first enemies with Armour: a traffic cone (370 armour) and a metal bucket (1100 armour).
Armour absorbs pea hits before body health (270) takes damage. When armour breaks, excess
damage carries over directly to health, and subsequent hits damage the Zombie underneath.
One-hit removals (Potato Mine, Cherry Bomb, Chomper, Lawn Mower) destroy an armoured Zombie
whole, ignoring armour.

- **Armour on ZombieKind and Zombie:** `armour` field added to the roster and live state.
  Conehead has 370 armour; Buckethead has 1100 armour; Basic and Flag have 0.
- **Damage absorption and carryover:** `takeDamage` deducts damage from armour first,
  with any excess spilling over into health.
- **Visual two-stage combat:** A traffic cone or metal bucket is drawn on the Zombie's head
  only while `armour > 0`. When armour breaks, the headwear disappears, leaving an ordinary
  Basic Zombie picture.
- **Flag Wave toughness scaling:** Flag Wave multiplier (1.25) scales both health and armour,
  so Flag Wave armoured enemies are sturdier in both layers.
- **9 new rule checks added:** Suite expands from 131 to 140 checks, all passing.
- **ADR 0012 recorded:** Settle open questions from ADR 0009-0011 regarding armour mechanics.

## [0.23.4] - 2026-10-06

### Use connected MCP tools to assist in decision-making

Docs only — no game code, no checks, no build change.

- **`AGENTS.md` and `CLAUDE.md` now carry a rule to use connected MCP tools to assist in
  decision-making when faced with choices.**

## [0.23.3] - 2026-10-04

### The Chomper's chewing state, looked at for the first time

Verification only — no game code changed, no checks added, and the drawing was correct all
along. This closes the one gap ticket 15 recorded about itself.

- **Both states of `drawChomper` are now verified in a real browser**, driven with
  `cloakbrowser` against the built game, reading the canvas pixels inside the Chomper's own
  Square. Planted and ready: 11,950 pixels of the ready skin and 14 of tooth. The moment it
  eats: 0 green, 2,022 of the chewing skin, no tooth. After the chew: 11,872 green and the
  tooth back. The drawing does what ADR 0011 says — the head changes colour, the tooth goes,
  and both return.
- **Sampling the whole canvas is a trap, and it produced two false readings here.** The lawn
  is green, so a whole-canvas count of the ready skin read 297,537 pixels on a lawn with
  nothing planted, and a constant 2,024 "chewing" pixels on a Chomper that had never eaten.
  Both were board furniture. A colour probe has to be clipped to the Square it is asking
  about, or it is measuring the lawn.
- **A level that ends cannot show a chew finishing — and that is the rules working.** The
  first attempt put the Chomper in Row 1, where the first wave arrives. It chewed, the level
  was then lost with the chew still running, and the head stayed brown across every later
  poll, because `apply` refuses `advance` once a level is over (`src/game/sim.ts`) and the
  countdown driving the drawing is frozen with it. Putting the Chomper in Row 4, whose wave
  is the last, gave a level that outlives the chew and the whole cycle in one run.
- **Still open, and it is a different question from the one now answered:** whether the brown
  reads as *busy* rather than *sick* from across the lawn. That is a judgement about the
  picture, not about pixels, and only a player can make it.

## [0.23.2] - 2026-10-04

### Say when something is stuck

Docs only — no game code, no checks, no build change.

- **`AGENTS.md` and `CLAUDE.md` now carry a rule to say so when a problem will not resolve,
  or when a fix is taking far too long** — what is wrong, what is causing the delay, and how
  the user might help. Do not work a problem in silence and then report it as a finished task
  or a dead end.
- **Silence looks like progress.** That is the whole reason. A long stretch of retries reads
  from the outside as the job still moving, so nobody watching can see the wall or supply the
  one thing that clears it — a denied permission, a missing file, a decision only they can
  make.
- **Being stuck is information worth having early.** Half a turn of debugging is worth more
  than five, because the user can answer in one line what no amount of retrying will.
- **The rule is deliberately not about narrating dead ends.** A check failing red because the
  feature does not exist yet is the work working, and a denied command with an obvious
  workaround is not a stop — take the workaround and say which one you took. The trigger is
  the point where the next attempt is a guess rather than a step, and waiting stops being
  free.

## [0.23.1] - 2026-10-04

### How to drive the game in a browser: cloakbrowser, not a hand-written driver

Docs only — no game code, no checks, no build change.

- **`AGENTS.md` and `CLAUDE.md` now say to call `cloakbrowser` through the MCP tool** when
  driving the game in a real browser, and not Playwright or Puppeteer. It is already wired up
  and it installs nothing, which is what keeps ADR 0004's decision — no packages beyond React
  and the build tool — a decision rather than an accident of one session.
- **The rule is next to the note about playing the built game**, so the two ways to see the
  board sit together: double-click `dist/index.html` to play it, `cloakbrowser` to drive it.
- **`CLAUDE.md` records what the hand-written driver cost**, since the alternative looks
  tempting exactly when it is most expensive: a Node script talking the Chrome DevTools
  Protocol over Node 22's built-in `WebSocket` needs four fixes to stand up each time — a tab
  created with a query string in the URL hangs, a `.ts` driver with a top-level `await` loads
  as CommonJS and silently never resolves, a screenshot needs `fromSurface`, and
  `Emulation.setDeviceMetricsOverride` hangs rather than resizing. It also has no page
  snapshot, no console log and no network log, so every question about the page became a
  hand-written `Runtime.evaluate`.
- **Both files say plainly that looking is not checking.** A browser opens no new seam, and
  the rule boundary is unchanged by any of it. Ticket 15 is the worked example: `drawChomper`
  was verified ready-state in a browser and the chewing state is still unlooked-at.
- **Still open, unchanged by this:** `drawChomper`'s chewing state — the brown colour and the
  shut mouth — has never been looked at, and the Chomper's balance numbers have never been
  play-tested. Both are recorded in ticket 15. The first is now cheap: it is one
  `cloakbrowser` run further than the one that was already done.

## [0.23.0] - 2026-10-03

### A Chomper, and three broken countdowns that every check passed

Ticket 15. The last of the ten plants. A Chomper eats the first Zombie that reaches it,
whole, and then cannot eat for forty-two seconds — which makes it a burst of power rather
than a permanent answer, and is the first plant in the game whose whole rule is a *when*.

- **A sixth kind of plant job, `devouring`, holding one number.** Nothing about what eating
  does is a per-plant choice — a Chomper removes the first Zombie that reaches it, exactly
  as a Potato Mine does, and stays standing — so the only thing about it a designer could
  choose differently is how long it is then out of action.
- **One field, `stepsUntilChewed`, meaning two things at the two ends of a Chomper's life.**
  Zero is ready before it has ever eaten and spent after a chew. Two fields would let a
  Chomper be "ready" and "chewing" at once, which is the contradiction one field cannot
  hold. It is not `arming` with a negative delay: `arming` counts *down towards* a moment
  the plant has not reached, `devouring` counts *up from* one it has just passed.
- **It runs after `walkAndEat`, like the mines, and the three plants that remove a Zombie
  whole now run in three different places in the step.** Bombs before the walk because a
  bomb is waiting for nothing; mines and Chompers after it because each is asked by a
  Zombie *reaching* it. `advance` is twelve steps long and the order is the design.
- **The first plant that must be *drawn* differently depending on a countdown.** Every other
  difference on the board is a colour or a shape read at a glance, but a Chomper that has
  just eaten looks identical to a ready one if the picture does not say otherwise. It reads
  `stepsUntilChewed` for the same reason the Potato Mine's light reads `stepsUntilArmed`:
  one number, two readers, so the lawn and the rules cannot be two claims about two things.
- **A Chomper that eats something standing in its Square has already been bitten once by
  it.** `walkAndEat` bites the plant a Zombie has reached and `devourWithChompers` takes
  that same Zombie off the lawn a moment later, both inside one step. Not a rule about
  Chompers — it is what "a Zombie that walks into a plant stops there" means — and
  surprising enough that a check says so.
- **A Chomper that has just eaten is food for the whole chew, and there is no way to avoid
  it.** A Zombie reaching a chewing Chomper bites it on the step it arrives, so a Chomper
  cannot decline a Zombie for forty-two seconds and then eat the next one: by the time the
  chew is over, anything that arrived during it has eaten the plant three times over. That
  is why the "eats again" check is written with two Zombies and not three — the shape a
  check would want to write is a lawn that cannot exist.

**Five checks, and three mutations that got through all of them.** Breaking the rule eight
ways and watching which survive found that a Chomper which ate one Zombie and could *never*
eat another for the rest of the level passed every check that existed at the time — as did a
chew spent one step late, and a chew spent one step early. All three leave a chew that
counts down, is forty-two seconds long, and that a Chomper comes out of, so nothing watching
it on its way down can tell them apart. Only a check about the **step** the chew runs out on,
with a Zombie standing in the Square at the time, catches them. That is the fifth check, and
it is the reason there are five.

**Numbers and visuals are both pending in-game playtesting.** The chew is believed to be the
original's forty-two seconds and has never been played — like the three shooter variants at
ticket 12, the only Level offering a Chomper is the test bed, which is somewhere to look at
a plant rather than somewhere to balance one. It is load-bearing (it is what makes a Chomper
a plant for the end of a Row rather than the middle of it) and nothing has asked whether it
is *these* forty-two. `drawChomper` was verified in a browser in its ready state only; the
chewing state — the brown colour and shut mouth, which is the state the drawing exists for —
was not looked at.

## [0.22.0] - 2026-10-02

### A Cherry Bomb, and the gap found by asking what a check was not looking at

Ticket 14. Eight of the nine remaining plants done, and the first one that goes off the
moment it is planted rather than arming itself first. A Cherry Bomb clears every Zombie
in a three-by-three patch of lawn and is gone, and it is the answer to "this Row is
already lost" rather than to "this Row is under attack".

- **It clears every Zombie in the area, not one of them.** That is the whole difference
  from a Potato Mine, and it is why `bombs.ts` has no `find` in it. A mine spends itself
  on one Zombie and the rest walk on; a bomb spends itself on the whole area.
- **The blast removes Zombies and not Plants.** Nothing in this game takes a plant off
  the lawn except a bite and the Shovel — a Lawn Mower clears a Row of Zombies and
  leaves every plant in it standing — so a bomb blown up beside a Wall-nut leaves the
  Wall-nut.
- **It goes off *before* the Zombies walk, which the mines do not.** `detonateMines`
  runs after `walkAndEat` because a mine is set off by a Zombie arriving at it. A bomb is
  waiting for nothing, so it runs before, and that ordering is the plant: a bomb put down
  in front of a Zombie about to reach a plant kills it *before it bites*. Asked after the
  walk, it would be rescuing a Row one bite too late.
- **A fourth optional description on the roster**, `detonating`, holding how far the
  blast reaches in Rows and in Columns. No delay, and that is the decision rather than a
  gap — `arming` holds the one number that varies between arming plants, and a Cherry
  Bomb varies in nothing: it is not a plant that becomes a bomb. `docs/adr/0010`.
- **Fifty seconds of Recharge, the slowest in the game.** A Cherry Bomb is the most
  expensive thing a player can put down and does nothing at all the rest of the time, so
  the scarcity is the plant.

### The gap, found by breaking the rule that nothing was checking

**Breaking the blast so that it also removed every plant passed all five other checks in
the file.** Not one of them had a second plant on the lawn, so "clears an area" was being
read as "leaves nothing standing there" without anything objecting — and that version
would take a player's whole Row of Peashooters with it. The sixth check exists because of
that, and fails when the rule is broken again. It is the same failure as the two-mines
fixture at ticket 13, and it was found this time by asking what a check was *not* looking
at rather than by a check going red.

**And the same shape again, in the edge of the lawn.** Every other check plants the bomb
in the *middle* of the board, deliberately — a blast that hung off the edge and cleared a
full three-by-three regardless would not have been caught by anything. And the edge is
where a player will actually put this plant: it goes in a Row they are losing, and a
losing Row is as likely to be Row 1 as Row 3. A bomb in Row 0 has no Row above it, so its
blast is two Rows tall rather than three. That is the answer rather than a special case,
and there is now a check that says so.

### Four fixture versions, all wrong in a different way

The bomb costs 150 and a level begins with 50, so every check waits for Sun first and the
Zombies have to be standing in the right Squares when it goes down. Zombies sent in at step
0 had crossed the whole lawn by then; sent in *after* the bomb, they were not on the lawn
for it to clear; scheduled at absolute steps from the start of the level, every one was in
the past; and given one arrival step, the ones going to nearer Columns were still walking
and ended up a Column short.

The fix is to time each Wave backwards from the single step the bomb goes down, so every
Zombie arrives together where it was asked to be. All four failures are written down where
the timing is now worked out.

### Not in this ticket

**Whether any of these numbers are *these* numbers.** Cost 150, Recharge 50 seconds, health
300, blast 3×3 — all from memory, and none played, as at tickets 12 and 13.

**Armour.** A bomb removes Zombies rather than damaging them, so nothing here decides what
a Cherry Bomb does to a Conehead or a Buckethead — the same refusal ADR 0009 records for
the mine. Ticket 16 owns it.

## [0.21.0] - 2026-10-02

### The knowledge graph's own skill, and a CLAUDE.md for the next instance

Tooling rather than game work, and both of it is content the project now holds.

- **The Graphify skill is installed** at `.agents/skills/graphify/`, with symlinks into
  `.claude/skills/`, `.hermes/skills/` and `.kiro/skills/` like every other vendored
  skill. Installed with `graphify install --project --platform agents` rather than the
  plain `--project`, which would have written a real file into `.claude/skills/` and
  quietly broken the rule below. It ships without an `agents/openai.yaml`, which is the
  one thing every other skill here has.
- **`CLAUDE.md`**, which merges this project's rules from `AGENTS.md` with the
  architecture notes needed to work in the code. Where the two ever disagree, `AGENTS.md`
  wins — it is the constitution and that file is the working copy.

## [0.20.0] - 2026-10-01

### A Potato Mine, and a bug that had been in the lawn for thirteen tickets

Ticket 13. Seven of the other nine plants done, and the first one that is *useless* from
the moment it goes down. A Potato Mine does nothing for fifteen seconds, arms itself,
takes the first Zombie that reaches it, and leaves the lawn. The whole of the plant is
that wait, and the roster now says so with a third optional description next to
`shooting` and `producing` — `arming`, which is one number, because what an armed plant
*does* is not a choice left open per plant.

- **A mine is planted dormant and says so, from one number.** `stepsUntilArmed` sits on
  the plant beside the firing and Sun countdowns, and the drawing reads that same number
  for the lamp on the mine's top: a brown lump with no light for fifteen seconds and a
  red light after. The picture and the rules are one claim about one field, the same
  arrangement as a Recharge and a Sunflower's interval.
- **It arms on the fifteenth second and not a step later**, and then stays armed. Two
  Zombies reaching one mine on the same step destroy one of them and not both — a mine
  that destroyed both would have two uses, which is the one thing it is not — and the
  second walks on through the Square the mine was in. A Zombie that arrives on the very
  step the mine arms is destroyed by it; a step earlier it walks through.
- **A mine reached before it has armed does nothing, and gets eaten.** Not a new rule: a
  mine is a plant, and a Zombie that reaches a plant stops and eats it. Three bites and
  the trap is gone, and the player watches their 25 Sun and their Row's only defence go.
  This came free out of rules that were already there, and it is the best argument the
  design has for the fifteen seconds — the cost of putting a mine in the wrong place is
  paid in full, by the thing the plant was for.
- **A mine destroys rather than damages.** It removes a Zombie from the lawn, the way a
  Lawn Mower removes a Row, and there is no damage figure anywhere in it. That refuses a
  question nobody has asked: whether a Potato Mine is enough for a Conehead or a
  Buckethead. Ticket 16 owns that, and a number here would be that decision made by
  accident. If ticket 16 finds the original's answer this becomes a field on `Arming` and
  nothing else moves.

### The bug the mine was built on top of

**A Zombie that had reached a plant was reporting itself in the Square *before* it.**
`walkAndEat` worked out where a Zombie had got to, then handed back the place it had been
standing at before the step, so that the Zombie would stay put — which reads as equivalent
and is not. A Zombie that had just arrived was one quarter of a Column to the right of the
plant it was chewing on, so the plant it was eating was not the plant `plantBeingEaten`
found for it afterwards.

Nothing noticed for thirteen tickets, and the reason is worth keeping: every check that
asked *where the Zombie stopped* passed, because a Zombie that has arrived does not move on
the next step either. A quarter of a Column is nothing a player or a screenshot can see.
It crossed a Square boundary, which only something asking a *second* question about the
lawn can see — and the second question is what the Potato Mine asks. So the mine could not
fire at all: the Zombie standing on it was standing next to it, as far as the rules were
concerned. The other reader was the drawing: every Zombie in this project had been drawn
standing beside the plant it was eating with its arms down.

The fix is the order of two lines — **ask where a Zombie is before it walks, not after** —
and it is worth being exact about how little it disturbed: reverting `zombies.ts` alone
leaves every check in the project that existed before this ticket passing, apart from the
one added here to name the bug. The wrong number was wrong *consistently*, and nothing
downstream of it depended on the right one.

### One rule changed that this ticket did not ask about

A Zombie now stops a quarter of a Column further left than it used to, which means every
plant in the game is eaten from a different place. That is outside the ticket's six
criteria and it is disclosed here rather than buried: the Potato Mine cannot exist without
it, and the ticket could not have been done without it. It is one rule, in one function,
and the alternative — leaving it and adding a second question for the mine — is a lawn with
two readers. `docs/adr/0009` sets out why.

**Also beyond the ticket, and here because leaving it out would be worse:** the mine's
thirty-second Recharge and the check that holds it. Every plant has a Recharge, so the
number had to exist; the check is extra, and it is here because an unchecked number is how
the three shooter variants ended up holding nothing at ticket 12. Cost and health are
forced by planting at all.

### What breaking the rules rather than the numbers found

Nine checks, and every number and every rule was broken in turn and watched to fail: the
cost (0, 20, 30, 50), the arming delay (0, 1, 12, 20, 30 seconds), the health (1, 100,
1000), the Recharge (7.5, 15, 60 seconds), the mine never leaving the lawn after firing,
firing while still asleep, never spending its countdown, arms a step late, arms two steps
late, being asked of the lawn from before the Zombies walked, and every plant in the game
being treated as a mine if the roster's field is ignored.

**Three checks did not have teeth, and two of them were mine to fix.**

- *"Two Zombies at one mine: one is destroyed and one walks on" could not tell one
  destroyed from **none** destroyed.* It asserted that one Zombie was left, which is also
  what a mine that destroyed all of them leaves behind — so when the rule was broken to
  destroy every Zombie that reached it, nothing was destroyed and the check still passed.
  Said by *which* Zombie, now: the second is still on the lawn, because the mine was spent
  on the first in the list.
- *"It stays armed" was asked at an even number of steps after arming*, and a countdown
  that keeps spending itself once armed goes 0, −1, 0, −1 — so a round number found
  whichever half it happened to land on and passed against exactly that. Now asked one
  step later, and the step after that, because there is no interval in one step to fall
  through.
- One mutation is **equivalent rather than caught**, and is recorded as such: making the
  mine fire for any Zombie that is eating anything, rather than for the Zombie eating *it*.
  No check can tell them apart, and no player can either — a Zombie walks leftwards and
  stops at the first plant it meets, so it cannot be chewing on one plant while an armed
  mine stands in the Square it has not reached. The identity check is still the right
  code; it just happens to say what another rule already guarantees.

### The whole roster's Seed Bank now has one owner

The test bed's eight packets were held in two files — `shooters.test.ts` for the shooters
and `wall-nut.test.ts` for the nuts — which is a list that has to be changed in two files.
They came to disagree the moment a fifth plant arrived, and a `Record<PlantName, number>`
gave the compiler no way to notice until there were eight plants rather than five. One
list, in `tests/planting.test.ts`, in the file that already owns what the Seed Bank shows.
The shooters and the nuts keep checks about *their own* plants, and the fixture helpers
that take a plant are typed to the four shooters, so a reach check can no longer be handed
a Sunflower.

### Verified in a browser

The test bed's eight packets read back with their costs, the Potato Mine among them at 25.
A mine planted in the last Column is a brown lump with no light; the same mine fifteen
seconds later has a red light on it, read from the same field the rules step. An armed
mine with a Zombie walking into it leaves the Row empty — both of them gone on the same
step. And a mine planted with a Zombie already on its way is drawn being eaten, with the
Zombie's arms out, and then gone three bites later while the Zombie walks on with its arms
down — which is the reaching arms the off-by-one had been suppressing this whole time.

**Not in this ticket.** Whether any of these numbers are *these* numbers: the 25, the
fifteen seconds, the 300 health and the 30-second Recharge are all from memory, and none
of it has been played — the only Level offering the mine is the test bed, and a test bed
is somewhere to look at a plant rather than somewhere to balance one. Not in it either:
the Chomper and the Cherry Bomb, and the armour question this ticket deliberately leaves
open. See `docs/adr/0009-a-plants-third-job-is-arming-and-a-mine-destroys-rather-than-damages.md`.

## [0.19.0] - 2026-09-29

### Three more shooters, and a check that was measuring the wrong thing

Ticket 12. Snow Pea, Repeater and Puff-shroom — six of the other nine plants done, and the
first three that are *not* about Sun or about standing in the way. Each is the
Peashooter with one thing changed, and that is now a fact about the data rather than a
sentence in a comment: what a shot does is one value — its damage, whether it slows what
it reaches, whether it goes through what it reaches instead of stopping, and how far
along the Row it goes — and the four shooters are four versions of a single plain pea.
Read the three entries, and the one line that differs in each is the whole difference.

- **A Snow Pea goes through a whole line of Zombies and leaves every one of them walking
  slowly.** A passing-through pea hits each Zombie it sweeps over, once, in its own Row
  and no other.
- **A slowed Zombie walks at half speed, and goes back to full speed when the slow is
  over** — measured against a Zombie in the next Row that was never slowed. The
  countdown lives on the Zombie, not on the Snow Pea, so **digging the Snow Pea up
  leaves the Zombie slow for what is left of the ten seconds and then not**. A slow is
  something that happened to a Zombie's legs, not something a plant is holding on to.
- **A Repeater fires two peas in one shot, both aimed at the same nearest Zombie.** So
  it lands forty damage on one Zombie rather than reaching two: a Repeater is worth
  exactly twice a Peashooter's damage for 200 Sun, and a player can do that sum without
  a balance pass having any say in it.
- **A Puff-shroom costs nothing and shoots three Columns.** It is free *because* of that
  limit rather than in spite of it — a plant that costs nothing and reached the length of
  the lawn would be strictly better than every other plant in the game. It goes down on a
  lawn with no Sun in it at all, which is the situation the plant exists for.
- **All three are in the test bed's Seed Bank** with their costs, alongside the four
  plants already there, and each is drawn so a player can tell it apart: a Snow Pea is
  the plain head gone pale and frosty, a Repeater has two faces where the others have
  one, and a Puff-shroom is a small grey cap on a short stalk. A slowed Zombie is drawn
  cold blue, because a Zombie at half speed and a Zombie at full speed are otherwise the
  same picture and a player who cannot see which Zombies are slowed cannot tell what
  their Snow Peas are for.

**A slow shortens a Zombie's step rather than making it skip one.** `walked` is a tally
of steps, not a position, so that where a Zombie is can never drift and a fast machine
and a slow one agree. A step-granular slow cannot be expressed in that tally — halving a
speed by taking a step every other step works exactly, and nothing else does — so half a
step is not a nice number to pick but the only one that is exact in whole and half steps
together.

### The check that was measuring the wrong thing

The first version of this ticket's main check watched a **whole level** and counted how
many Zombies in a Row were ever hit by a Snow Pea. It passed. **And the Snow Pea was not
passing through anything** — `passesThrough` was never set, and every pea aimed at the
nearest Zombie like any other. It hit all three anyway, over about a second and a half,
because the Zombies it hit were slowed and fell behind, so the next became the nearest
and was aimed at in turn.

That is a completely different mechanism, and it stops working the moment a Row's
Zombies are spread out instead of queueing up: a pea that has to re-aim between Zombies
cannot hit Zombies that walk in together. The check had been measuring an accident of
the numbers and would have gone on reporting it as a rule.

Rewritten to watch **one shot** — wait for three Zombies in a Row, note the next pea
that plant fires, count how many Zombies that one pea reaches before it leaves the lawn
— it failed at once with `1 !== 3`. The fix then caught a real bug in the rule itself:
the first version of "every Zombie it has reached" tested only that the pea had got level
with a Zombie, so a passing-through pea went on hitting the same Zombie on every step for
the rest of its flight and emptied it in a fraction of the time its health says. A pea
sweeps over a Zombie on one step, and the rule now says so with both edges of the pea.

**Each of the four shooters is now asked what one shot did, from two places on the
lawn**, and both places are load-bearing. From the seventh Column, where every Zombie in
the Row is within a Puff-shroom's reach, a variant quietly given a *second* difference is
caught — a Repeater whose peas also passed through, a Puff-shroom whose puff also slowed.
From the first Column, where they are five Columns out, a plain shooter given a
Puff-shroom's reach is caught, which close up behaves exactly like a Peashooter and
passes everything else in the suite. Every field of every shooter's *shot* is now held
by a check, and every break was tried against the data and watched to fail: the three
costs, the three reaches, the slow's fraction and its ten seconds, the Repeater's two
peas, the pass-through, and the plain pea itself given any of the four.

**A second review caught the one claim that was stronger than the check behind it.** The
Puff-shroom's reach was annotated "pinned from both sides" and was not: the check asked
how far a *Zombie* stood when the puff reached it and answered "between two and three
Columns", which caught a reach of one and a reach of nine and passed on two and a
quarter — the puff and the Zombie were closing on each other, so it was reading a mixture
of the reach and the Zombie's walking speed. Seven intermediate values, from 2.1 to 3.1,
passed the whole suite unchanged. **Asking where the puff stops** — which is the reach,
with no Zombie in it at all — pins it to three Columns within one puff-step, about a
twentieth of a Column, and every value from 1 to 9 except 3 now fails.

It also caught the Repeater's two peas being drawn as one disc. They leave on the same
step at the same speed, so they spend the whole flight at the same place: the rules were
right and the picture was hiding the one thing the plant is. A cluster of peas at a
place is now drawn as that many peas.

**A review found the rest, and found them by breaking the numbers rather than by reading
them.** The three new plants' health and Recharge are copied from the Peashooter's —
correctly, and with a comment in `balance.ts` saying exactly that — and **nothing was
holding the copy**: a Snow Pea given a Wall-nut's health, or a Repeater given a
two-second Recharge, passed the whole suite unchanged, because every other check here is
about what a plant does with a shot and none of them looked at how long it survives or
how long its packet takes. Five such breaks sailed straight through and are now caught,
by counting bites until a Square is bare and by finding the step a used packet can be
chosen again on. **A copy is not a check** — and it is the third time this project has
learned that from a number rather than from a sentence.

**A fix from ticket 10 had no check behind it, and this pass found it by breaking the
rules rather than the numbers.** "A pea that hits nothing now leaves the lawn" could not
be produced by a single shooter — one plant's peas leave and land on the same step, so a
pea in the air behind the one that fells a Zombie needs two things shooting at that
Zombie, and no check had two. A Peashooter and a Repeater in one Row now hold it. Getting
there also needed a Wave still to come: a level whose last Zombie has died is *won*, and
a won level stops moving, so with nothing left to send the orphan pea is frozen on the
lawn for ever and the check is watching the wrong thing.

**Not in this ticket.** Whether any of these numbers are *these* numbers. Every number
this ticket added is from memory, and **none of it has ever been played** — the only Level offering them is
the test bed, and a test bed is somewhere to look at a plant rather than somewhere to
balance one. That is the honest thing to record about them, and it is the next question
when a Level sells them. Also not in this ticket: the Potato Mine, the Chomper and the
Cherry Bomb, and how a plant does something *instead of* shooting, which is the shape
those three share and the open question this ticket leaves.

## [0.18.0] - 2026-09-29

### A balance pass, and the claim that had to be thrown away

Ticket 11. The first playtest the plan has been promising since before the
Sunflower existed. It changed no numbers, which is the outcome, and it is the first
pass in this project to have anything to confirm.

- **An economy-first plan still wins Level 1-1, by a margin of 22.9 seconds** after
  the last Wave walks in — and finishes 0.3 seconds *sooner* than the defence-only
  plan the spacing was balanced against. The Sunflower's arrival did not disturb
  the pacing, so **the Wave spacing does not move**.
- **A player who plants nothing still loses, at 142.3 seconds.** That figure was in
  a comment since ticket 08. It is a number in a check now, and so is the 22.9.
- **All three of the Sunflower's numbers are confirmed**, each read out of the
  rules rather than asserted beside a literal. Cost 50, interval 24.25 seconds,
  health 300 — and the interval is the interesting one. A Sunflower earns its 50
  Sun back at 48.5 seconds while a Zombie crosses the whole lawn in 42.3, so the
  payback is longer than the lawn is wide. The number is the decision: shorten it
  and the plant is safe everywhere and the placement decision goes with it.
- **Level 1-1 leaving two of five Rows unattacked is load-bearing.** It is the only
  place an economy is safe in the first level, and a check now says so directly.

**The claim this pass was written around turned out to be false, and that is the
most useful thing in it.** The ticket said a Sunflower planted in the first Column
is eaten before it has paid for itself. A check written from that sentence found
one Row where it breaks even *exactly* — two pieces against a cost of 50 — and
nearly recorded it as the rule. Measuring every Row instead:

| Row | first Wave | made | vs a cost of 50 |
|---|---|---|---|
| 1 | never | 125 | +75 |
| 2 | 50s | 75 | +25 |
| 3 | 25s | 50 | +0 |
| 4 | 80s | 100 | +50 |
| 5 | never | 125 | +75 |

**Every attacked Row pays for its Sunflower.** The single break-even Row is simply
the one the first Wave reaches earliest, and it is the tightest the level ever makes
it — not a rule about Rows. What decides a Sunflower is *when* a Zombie arrives.
The original check would have gone on being wrong for as long as the schedule held
still, and the Rows it compared were hard-coded rather than read off the schedule,
so a schedule change would have invalidated the comparison silently.

The same pass caught three assertions that could never fail: a local constant
asserted equal to a local constant, which would have passed unchanged if the
Sunflower had been re-priced to 25 Sun. Two of the three Sunflower numbers were not
being checked at all. They are now read out of the rules by charging for a plant
and watching when its Sun arrives.

Seven checks, and each was shown to fail against a deliberately broken number before
being believed — in both directions where it mattered: the interval both shortened
and lengthened, health both raised and lowered, cost raised, the schedule both
tightened until an economy was unaffordable and opened until no Row was safe, and
the Zombie speed changed to move the loss time.

The two plans that play the level now live in one file, `tests/plans.ts`, along
with the loop that runs them. They had already drifted: the copy in `waves.test.ts`
opens on the middle Row and the first draft of the balance pass opened on a Row
Level 1-1 never attacks, so a plan that spent its first Peashooter defending
nothing lost — and looked like a finding about the level rather than a bug in the
check. It is the same class of error this project has hit before: a check that
measures the wrong thing and is believed because it failed.

**Not in this ticket.** How the level *feels*, which is the player's judgement and
is settled by them playing it. Putting either new plant in a Level. Visual polish,
which is ticket 21.

## [0.17.0] - 2026-09-29

### A Wall-nut, a Tall-nut, and a level for looking at them in

Ticket 10, two of the nine plants. The rules were not touched once: both plants
are `shooting: null` and a bigger number, and every acceptance criterion passed
against a table entry. That is what ADR 0005 claimed would be true when it put the
Sunflower first — that the Wall-nut needed no new mechanism, so it could wait
cheaply. It is now demonstrated rather than argued.

- **A Wall-nut is 4000 health, a Tall-nut 8000, and both cost 50 Sun**, with a
  thirty-second Recharge each. Bites are 100 and come one a second, so a
  Wall-nut holds a Zombie for forty bites and a Tall-nut for eighty, against a
  Peashooter's three. All believed to be the original's and marked as such; the
  Tall-nut's 8000 is the least certain number in `balance.ts`, and ticket 11 is
  where any of them get settled by playing.
- **Neither ever fires and neither ever makes Sun**, and both are checked with a
  control — every step that has a Zombie on the lawn is also asked whether one was
  standing in front of the nut, because "fires nothing" is also what a broken game
  looks like. The control caught its own first version.
- **Six new checks, 84 to 90, and seven deliberate rule breaks.** Six of the
  breaks were caught. The seventh was not: a Wall-nut with `producing` set, quietly
  making 25 Sun every twenty-four seconds, was caught by nothing, because no check
  had asked. That is worth more than the six. The field that makes a nut a nut was
  already there and nothing was reading it wrongly, so the next plant added by
  copying a Wall-nut would have inherited it free. It is checked now.
- **Level 1-1 does not grow a packet to make these reachable.** The balance pass
  immediately after is meant to measure Level 1-1 as it is, and a fourth Seed
  Packet is a change to what that level asks of a player. There is a test bed
  offering all four plants at `dist/index.html?level=test-bed` instead, because
  the one claim no check can make is whether a Wall-nut *looks* like a Wall-nut.
  See `docs/adr/0006-a-test-bed-for-plants-level-1-1-does-not-offer.md`.
- **The two nuts are told apart by shape and not by colour** — they cost the same
  50 Sun, so the Seed Bank shows two packets at one price, and one wide brown nut
  and one tall brown nut is easier to name than two browns. Measured off the live
  canvas: 60 pixels across by 32 down, and 41 by 88.

### Two bugs, and only a screenshot finds either

- **"Row 3 and Row 41 have no Lawn Mower left."** There is no Row 41. The names
  were counted up to one and then the last had `+ 1` hung off it as well, inside a
  template — so it was string concatenation and "Row 4" became "Row 41". From
  ticket 07, and invisible to every committed check, because the checks are about
  the rules and this is about words. A screenshot of a level that happened to lose
  two mowers at once found it, and it now reads "Row 1, Row 2, Row 3 and Row 4".
- **A Tall-nut was drawn a third of the way into the Row below.** `context.ellipse`
  centres on the point it is given rather than hanging from it, and the code was
  treating that point as the foot of the nut. A plant drawn across the Row
  underneath is a plant a player reads as being in the wrong Row. The browser check
  asks the Row *below* the Tall-nut for nut pixels rather than trusting the picture:
  1050 of them before the fix, none after.

And one about the checking itself: the browser run took six attempts, and five of
the six were my harness rather than the game — a wrong argument convention, a CDP
helper that generated `EXPR(a0, a1)(a0, a1)` for two arguments and had been correct
for exactly one, a bounding box reporting the colour of its own corner, and a
variable shadowing the loop's target colour. A harness that has never been wrong is
a harness nobody has looked at.

## [0.16.1] - 2026-09-29

### The Sunflower looked at, and a browser that was never broken

Ticket 09 was committed as unverified. It is now verified: sixteen checks in a
real browser with real mouse events, real canvas pixels and real time. The gap
was never WSL.

- **Chromium runs in WSL** with `--headless=new --no-sandbox --disable-gpu
  --disable-dev-shm-usage`. The `dbus` and `GCM` errors it prints are noise. What
  had actually gone wrong was a hand-written DevTools client that was not
  masking its WebSocket frames: a frame sent by a client must have bit `0x80` set
  in its second byte, and without it the browser drops the socket *silently*.
  That reads exactly like a sandbox failure, which is why it was worth writing
  down in `docs/plan.md` rather than only fixing.
- **The drawing fix is confirmed by looking.** The Sunflower is `[249,168,37]`
  and a Peashooter planted beside it is `[102,187,106]`. Two clicks out of a
  two-packet Seed Bank plant it; the Sun it makes appears over its own Square at
  24.25 seconds, falls, rests at the foot of that Square, and is worth 25 when
  clicked; and the level still reaches a real ending rather than only the Flag
  Wave announcement.
- **Two of the sixteen checks were wrong before they were right**, and both are
  recorded in the ticket. A colour assertion two points too tight failed on a
  pixel that *was* the Sunflower's own colour. Worse, a "the level ends" check
  passed by matching the Flag Wave announcement banner instead of an ending — a
  check that could not fail, which is the one thing a check must not be. It now
  asks for the ending banner specifically.

## [0.16.0] - 2026-09-29

### A Sunflower, and the economy it was waiting for

Ticket 09. A plant that makes Sun on a timer, dropped at its own Square and
clicked like any other. It costs 50, which is exactly what a level begins with,
so the first decision of Level 1-1 is now whether to plant one straight away or
save for a Peashooter. Seven checks; the suite goes from 77 to 84.

- **Sun has two sources and is one resource.** The same counter, the same pieces
  on the lawn, the same click, the same loss. What differs is where the Sun comes
  from, and that is the whole of the new rule: a plant's Sun is asked for by
  Square rather than by the seed, and comes to rest inside that Square. A row of
  Sunflowers is a row of places the Sun appears.
- **A plant makes Sun while it is standing on the lawn.** Production is read at
  the end of a step, not the start, so a Sunflower a Zombie finishes eating on the
  very step it was due makes nothing. Reading the start of the step instead would
  let a plant already off the lawn put one last piece of Sun down, and there is no
  reading of that which feels like money earned.
- **The two timers are named apart in the code**: `state.stepsUntilSkySun` and
  `occupant.stepsUntilSun`. The field on `GameState` was already called
  `stepsUntilSun` and meant something else, which is the one rename this ticket
  forced. It is why the glossary keeps one word for Sun — the code says which is
  which, so the vocabulary does not have to.
- **A plant that makes Sun needed a third field, not a third rule.** `shooting:
  null` already said "this plant is not a weapon" and `stepsUntilShot` was already
  a countdown in the state, so the Sunflower is a `producing` entry beside a
  `shooting` one. The Wall-nut will need neither — which is ADR 0005's claim that
  it is cheap, now demonstrated rather than argued.
- **50, 300 health, 25 every 24.25 seconds, first Sun a whole interval after
  planting.** All believed to be the original's and marked so. The Recharge is the
  Peashooter's seven and a half seconds, so it is the Recharge rather than the
  cost that stops a bank of Sunflowers being spendable every step. Ticket 11
  settles these by playing, and moves the checks that state them.
- **Fixed: a placeholder that is the same shape for every plant.** `drawPlant`
  drew one green circle for whatever was planted, so the Sunflower the Seed Bank
  names and the Peashooter it shoots were the same picture. The Sunflower is drawn
  in the Sun's own yellow. That is not the art pass, and it is not a nicety: a
  player choosing between two packets needs to see which one they put down.
- **Not verified: the browser playthrough.** Chromium would not run headlessly in
  the environment this was built in, and the two presentation changes were found by
  reading the drawing code rather than by looking at a screen. Recorded unticked
  in the ticket; it is the first thing to close.

## [0.15.0] - 2026-09-29

### The Sunflower before the Wall-nut

The build order changes, and the two tickets that caused it swap places. No code
changes: this release moves the work, and records why.

- The Sunflower is built **before** the Wall-nut, as ticket 09 rather than ticket 10.
  Level 1-1's Wave spacing was set at ticket 08 on the assumption that a Peashooter
  is the only thing Sun is ever spent on, and a Sunflower invalidates that
  assumption — so balancing the level before one exists is balancing against a lie.
  The Sunflower is also the only plant so far that needs a new mechanism: Sun made
  at a plant rather than by the sky. The Wall-nut needs none, and waits without cost.
- The cost is real and is not hidden: eating sits purposeless for one release longer,
  since nothing is worth being eaten *for* until a plant blocks a Row. That gap was
  recorded in 0.11.0 and is now recorded as a decision rather than an oversight.
  See `docs/adr/0005-sunflower-before-wall-nut.md`.
- A new ticket, **11, balances Level 1-1** against a real economy, blocked by 08
  and 09. It is scoped to measurement — margins in seconds, and numbers moved where
  playing says a number is wrong. How the level *feels* is the player's judgement
  and is not this ticket's; visual polish is the art pass.
- The Wall-nut stays blocked by 04 only, and is **not** blocked by the Sunflower. The
  sequence is a convention, not a dependency, and coupling them would stop anyone
  working on defence until the economy was done.
- Tickets 11 to 20 become 12 to 21. The Sunflower's settled numbers are recorded in
  its ticket: 50 Sun, 300 health, 25 every 24.25 seconds, all believed to be the
  original's, with the first Sun a whole interval after planting rather than on the
  step it goes down.
- `CONTEXT.md` gains **Plant** and **Sunflower**, which the reorder made a gap —
  "plant" was used in four definitions and defined in none. Sun stays one term: the
  spec's "Sun is the only resource" is load-bearing, and splitting it to
  "Sky Sun" and "Grown Sun" would weaken a true claim to decorate a glossary.
- `docs/plan.md` gains a row for the balance pass, so the plan is 14 steps, and its
  Level 1-1 risk is corrected — it still described the unlosable schedule that
  ticket 08 fixed.

## [0.14.0] - 2026-09-29

### The Flag Wave, and winning a Level

Ticket 08. A Level is won when its last Wave has come and no Zombies remain, and a
won Level stops as a lost one does. The Flag Wave is announced ten seconds before
it arrives, is tougher than the other Waves, and carries a Flag Zombie. Level 1-1
now ends both ways: lost at about 142 seconds by a player who plants nothing, won
at about 173 by a player who puts a Peashooter in every Row.

- `GameState.gameOver` is replaced by `outcome: 'playing' | 'won' | 'lost'`, which
  is what ticket 07 left a note asking for. Not tidiness: a Zombie that walks off
  the left edge is gone from the lawn on the step it does it, and a lawn with no
  Zombies and no Waves left to come is the definition of a win — so one step can
  satisfy both endings, and two booleans would hold a level that is won and lost at
  once. It is the loss, and one field with three values has nowhere to put the
  contradiction. A check watches exactly that step.
- The win is read off the same step that caused it, from the same two questions
  `advance` already asks: what is on the lawn, and what is still to come. The lawn
  is built once and used for both the state and the ending, so the ending cannot be
  worked out from a different list of Zombies than the player is looking at — and
  the Wave that walked in this step is on that list, which is what stops a Level
  being won the step its last Wave arrives.
- A Wave carries `flagWave: true` or carries nothing. There is no `false` to get
  wrong, and the Flag Wave is a mark rather than a position, so putting a new Wave
  on the end of a schedule cannot quietly change what "last" means.
- `waveZombies()` in `levels.ts`: a Wave knows what it sends, and a Flag Wave's
  Zombies walk in with more health than the same Zombies in any other Wave. The
  Flag Zombie is in the roster as a name with no health of its own — an ordinary
  Zombie carrying a flag, which is what it is in the original. The Wave is what
  makes the Wave hard.
- `GameState.flagWaveWarning`, worked out in `advance` from the Waves still to come
  and ten seconds ahead, marked in `balance.ts` as not the original's number. The
  announcement and the ending are both laid over the help text rather than taking
  its place, so neither moves the board; the board not jumping when a level ends
  was ticket 07's finding and it applies just as much to a banner that arrives
  mid-level.
- The Flag Zombie is drawn with a flag on a pole, over its own body rather than
  behind it. Drawn behind, the pole was hidden by the Zombie standing in front of it
  and the flag floated over the lawn like a decoration.

### Found while playing it

**Level 1-1 could not be lost, and could not be won.** Ticket 07 recorded this: the
schedule sent two Zombies into one Row 25 seconds apart, the mower ran on the first
and cleared *both* — a mower clears its whole Row — and nothing was ever sent to
that Row again, so no Row was ever breached twice and a player who planted nothing
played for ever. Adding the Flag Wave fixed it as a side effect, because it arrives
in three Rows whose mowers have already gone. The schedule was rewritten anyway, so
that the loss comes from a deliberate second Wave into a spent Row rather than as a
by-product.

**The Flag Wave was half again too tough, and only playing it said so.** One and a
half health leaves a lone Peashooter three and a half seconds of margin against a
Flag Wave Zombie: a Peashooter in the first Column there is to plant in is reached
in about thirty-three seconds, and twenty-nine seconds of shooting. The mistake was
comparing thirty-three against the forty-two a Zombie spends crossing the *whole*
lawn, which is the distance to a Peashooter in the last Column and not the one in
the first. A browser playthrough of the level lost on it — Row 4's mower went, and
the level with it. It is one and a quarter now: seventeen peas against thirty-three
seconds, nine seconds to spare. The check states the number, so the next person to
move it has to move the check too.

### Checks

Nine checks in `tests/waves.test.ts`, one slice at a time and each made to fail
against code broken on purpose: a Wave sending only its first Zombie, a schedule
sent all at once, the announcement arriving with the Wave rather than before it,
arriving far too early, never stopping, a Flag Wave no tougher than any other, a
Flag Zombie made a tougher Zombie in the roster, a schedule with two Flag Waves or
with its last one unflagged, the win decided before the loss on the step they meet,
a guard that stopped only a loss, and a Flag Wave landing only in Rows that still
had a mower.

Six existing checks changed rather than broke. They were written when a level could
not end, so a fixture of one Wave went on for ever; now a one-Wave fixture is a
level that *finishes*, and the mower that saved a Row would win it. Each was given
something still to come, which is what "the level goes on" now means.

### Not built, and why

Two of the ticket's boxes are unticked and recorded rather than quietly dropped:
winning does not unlock the next Level, and there is no menu. `docs/plan.md` puts
unlocking at step 12 and a menu at step 9, with level select and saved progress as
ticket 19. With one Level there is no next Level to unlock in any case, and a check
for it could not fail.

### Checked

77 rule checks pass, typecheck and production build clean. The level was played
through in a real browser with real mouse events — clicking Sun, choosing the Seed
Packet, clicking Squares — for fifteen checks over three runs: the announcement
arriving and stopping, the board not moving for either banner, a flag appearing on
the lawn that was not there before, the lawn cleared, the win said out loud, the
Seed Bank dead, and not one pixel of the page moving in the six seconds after.

## [0.13.0] - 2026-09-28

### Game Over on a spent Row

Ticket 07. A Zombie that walks off the left edge of the board ends the level, and
the level then stops: no Zombies walk, no Sun falls, and nothing can be planted.
Winning is not built, so a level can still not be *won*.

- `GameState.gameOver` is the level's fate, `false` on a fresh lawn.
- A Zombie's step reports which Rows were walked off rather than deciding what that
  means, so `walkAndEat` stays about walking and eating and the level's rule lives
  in `sim.ts`. A Row *with* a mower is answered by the mower, a Row without one by
  this, and both are the same walk seen from two places.
- The breach is at x < 0, one step *past* the left edge of the board, not on the
  mower's Square. The asymmetry is deliberate: a mower stands on the lawn and is set
  off there, and a Zombie with no mower left gets to the place off the edge of it.
  All of the rule is in that one step between standing on the last Column and being
  past it.
- Every command is refused once the level is over, `advance` included. Refusing the
  tick is what stops the level rather than slowing it; letting the clock run would
  leave a lost level going on with nobody playing it.
- A Row that has spent its mower says so: a dashed footprint of the mower's own
  shape on the lawn, and the Rows named in the footer. Both ask the lawn the same
  question the rules ask, so the picture and the rules cannot disagree.
- The board does not move or resize when Game Over appears. The banner is laid over
  the help text rather than replacing it, and the footer's mower line stays, because
  a board that jumps at the moment a player is looking at the lawn they lost on is
  its own small failure. A browser check watches the board's geometry before and
  after the loss for exactly this.
- `CONTEXT.md` gains **Breach**: a zombie walking off the left edge of the board,
  which can only happen in a Row that has already spent its mower.

### Checks

Four checks in `tests/game-over.test.ts`, each made to fail against code broken on
purpose:

- a Zombie past the left edge of a spent Row ends the level, and one step earlier
  it has not;
- once the level is over the clock does not move, a Zombie still on the lawn does
  not walk, and the same two commands that planted a Peashooter a step earlier now
  change nothing;
- spending a Row's mower saves the Row *without* ending the level, because a mower
  running could be wired to "this Row has no mower" and every check about losing
  would still pass;
- a second Row still saves that Row after one has been spent, so losing a Row is not
  losing the level.

A check in `tests/zombies.test.ts` that walks a Zombie off the left edge now says
that this is a loss, rather than treating the walk-off as an ordinary event.

The level-shaping helpers the mower checks used are moved to `tests/helpers.ts`, so
there is one copy of `levelWith`, `oneZombieIn`, `untilTick` and the walk speed
rather than two.

Checked: 68 rule checks pass, typecheck and production build clean, and the loss
watched in a real browser — a mower running, the Row marked, the other four mowers
untouched, then a breach, the banner, a dead Seed Bank, and not one pixel of the
page moving in the seven seconds after.

### Found while playing it

**Level 1-1 as shipped cannot be lost, and cannot be won either.** It sends two
Zombies into Row 3 twenty-five seconds apart, and the mower runs on the first at
about 63 seconds, clearing both — a mower clears its whole Row. Nothing else is
sent to that Row and the other Rows get one Zombie each, so no Row is ever breached
twice. Twelve minutes of play leaves the lawn empty and the level going. Game Over
is built and unreachable in this level, which is recorded in `docs/plan.md` as
ticket 08's problem. It also means Game Over's presentation was checked in a
browser against a temporary wave that was then removed, not against the level that
ships; the code checked is the code that ships, the wave list is not.

## [0.12.0] - 2026-09-28

Build order step 7 of 13: a Lawn Mower saves a Row once. A Zombie that walks the whole length of a Row no longer walks off the board — it sets off that Row's mower, which clears the Row and is then gone for the rest of the level. This is the first thing in the game that can be used up.

Four checks in a new `tests/mowers.test.ts`, plus a rewrite of a ticket 04 check. That rewritten check is the one worth mentioning: `a Zombie that walks past the left of the board leaves the lawn` used to be true of every Zombie, and is now true only of a Zombie in a Row that has already spent its mower, so it was re-based on a broken Row and says so. It would have passed unchanged for the wrong reason, since a mown Row and a Zombie walking off the end of it both end with nobody standing in that Row.

Every one of the four new checks was made to fail against code written on purpose to be wrong, and each one caught a different mistake:

- a mower that removed only the Zombie standing on it, rather than the Row;
- a mower that took *every* mower off the lawn with it, spending the whole level's protection at once;
- a mower set off a Column late, once the Zombie was past it;
- a Square that refused a plant forever because the mower Column is a special Column, which is the "fix" this consequence invites.

That last one is the consequence, and it is deliberate. A mower that has run is off the lawn rather than marked spent, so its Square is bare grass and a bare Square takes a plant. This was decided before it was coded, and the browser run confirmed it reads correctly: a mown Row shows a bare Square where the mower was, not a Square that looks plantable and silently refuses.

**Checked:** 64 rule checks pass. Typecheck and production build are clean.

**Also:** the spec's status line and `docs/plan.md` said nothing had been built yet, which stopped being true five tickets ago. Both now say what is actually done.

**Browser, for the mower, which is only ever a thing you see:** one headless Chrome session, two minutes of real play, and the pixels read back per Row. Confirmed the mower is drawn on all five Rows at the start, that Row 2's is gone and Row 2 empty about a second after the Zombie reaches the left edge, that the other four are untouched, that a second Zombie into that Row is not saved and walks off, and that Row 1's own mower later runs by itself. `--virtual-time-budget` cannot drive this game at all: its frame callback fires once per budget rather than once per display frame, so a game stepped in `requestAnimationFrame` gets a single step however much time it is given. The harness in `/tmp/opencode/` waits in real seconds instead, and `cdp.py` is a hand-written DevTools client because no browser-driving package is installed and none is to be added.

**Not in this ticket:** Game Over. A Zombie reaching a spent Row still walks off the board, which is a placeholder until step 8.

## [0.11.0] - 2026-09-27

Build order step 6 of 13: a Zombie eats a plant. Plants are food now, which is the first thing that makes this game a defence rather than a shooting range.

Five checks in `tests/zombies.test.ts`, one of them a rewrite of a ticket 04 check. Three of the five passed the moment they were written, because the rule they were written for had no state in it and the first check had already brought it in. They were not left at that: each was made to fail by breaking a rule on purpose, and the ticket says which rule each one caught.

### Added

- **A plant has health.** 300 for a Peashooter, from memory, and it is in the roster next to cost and Recharge rather than written down per plant — so a plant is planted whole, and the number the drawing fades it by is the number the rules use.
- **A Zombie stops and eats.** It stops the step it reaches the Square a plant is in, stands there, and takes 100 off a second, which is a Peashooter in three bites and two seconds.
- **A plant with nothing left of it is removed**, leaving its Square bare, on the same rule a Zombie with nothing left of it is removed by.
- **A Zombie that has eaten carries on walking**, so it eats its way along a Row rather than standing over the hole it made.

### The rule, and why it holds nothing

Whether a Zombie is eating is worked out every step by asking the lawn which Square it is standing in, and remembered nowhere. That is the whole design, and the payoff is the Shovel: a Zombie caught mid-meal by a player who digs the plant up walks on, because there is no plant there now — and the Zombie that finished the plant itself gets the same answer from the same question. There is no latch, so there is nothing to forget and nothing to clear.

The cost, and it is a real one: a Zombie can never be *about* to eat something that has just gone. The one step of delay from ticket 04 — where a Zombie arriving at the edge of the board is briefly seen arriving rather than already having walked — does not apply here, and the reason is that keeping it would have needed a remembered state to tell "only just arrived" from "finished chewing". That remembered state is the exact bug this design exists to prevent, so a Zombie bites on the step it reaches the plant instead. It is the same shape as a Peashooter, whose countdown sits at zero until there is something in front of it to shoot at.

### Things found along the way

- **A Peashooter in the first four Columns can never be eaten.** It kills a Basic Zombie in about nineteen seconds of shooting, and a Zombie needs nearly five to cross each Column, so everything that walks at one dies on the way in. Eating is only reachable from the fifth Column rightwards, where the Zombie arrives hurt enough to be a threat and healthy enough to eat. This is true of the original's numbers as well, and it is the reason the eating checks stand their plant in the last Column: so that they are about eating and nothing else. It is also a thing a player has to learn, and the level's hand-written schedule — one Zombie every twenty-five seconds, exactly one Peashooter's worth of killing — was hiding it until a plant became food.
- **The mower's Column is not food.** A Zombie walks through the Square a Lawn Mower stands in. It had to be settled here, because eating put Zombies on the length of every Row, and one of those Rows has a mower in it.
- **A Zombie killed by a pea on the same step it bit still got that bite in.** Everything a Zombie does on a step happens, and then the dead are cleared.

### Fixed

- **A Zombie standing at a plant now has its arms out**, at the height of the middle of the Square rather than its own shoulders. An arm reaching over a plant is an arm reaching at nothing, and the plant's head is drawn at the middle.
- **A plant being eaten is drawn as a plant being eaten**: a bite is cut out of the side the Zombie is on and filled in with the grass behind it, growing as its health goes. The original shows it by redrawing the plant as it is chewed; there is no such artwork yet, so the bite is cut out of the shape. It also makes the plant's remaining health visible without a number, which is the thing a player actually needs to know mid-meal.
- `zombieX` claimed in its comment to round its answer. It does not, and it now matters that it does not: the rules ask which Square a Zombie is standing in, and rounding there would put Zombies in the wrong Square near a boundary, so a Zombie would stop at the wrong plant. Comment corrected, no behaviour changed.

### Changed

- **The check "a Peashooter shoots forwards, at a Zombie that has not yet walked past it" asks its question differently.** It used to stand a Peashooter in the last Column and let a Zombie walk past it, which is now impossible: a Zombie can only get past a plant by eating it, and then there is no plant. So the check plants a Peashooter into a Square the Zombie has already walked through — the one way a living plant can end up behind a Zombie, and a player's own mistake — and asks that it fires nothing for thirty seconds. The question is the same and the answer is the same, and the rewrite was checked against the rule it exists for: with forward-only shooting removed it fails, and nothing else does.
- One line in the checks: a wait that plays the game on until something happens now says what it was waiting for when it gives up, because "four thousand steps were not enough" is true of every rule in the game and says nothing about which one was broken.

### Not done

- A Zombie at the left of a Row still just walks off the board. In the original the Lawn Mower goes off instead, and a Row whose mower is spent ends the level: tickets 06 and 07.
- There is no Wall-nut, so nothing is worth being eaten *for*. The whole reason to plant something a Zombie will stop at arrives in the Wall-nut ticket, second from here — see `docs/adr/0005-sunflower-before-wall-nut.md` for why it waits.
- A Zombie shows no sign of being hurt when a pea lands, so a Zombie being shot at and a Zombie eating a plant look alike from the other Rows.

### Checked

- 60 checks pass, up from 55. Typecheck clean, production build clean.
- Played in a real browser over two minutes of real time, on the pixels the canvas actually painted: a Peashooter planted in the seventh Column, a Zombie walking in at the right of its Row at 22 pixels a second, being shot at on the way, and then coming to a stop at the plant — measured as not moving one pixel for as long as the plant was standing — with its arms out and a bite growing out of the plant's right side. The plant was then gone, the Zombie walking on over the bare Square, and off the left of the board.
- Two of the harness's own bugs showed up first, and both were the same mistake as last time in a new place: a wait for a Zombie to stop moving compared each sample against the one 0.3 seconds before it, so its two-second window could never elapse; and when that was fixed the window was the same length as the thing it was watching for, because a Peashooter is two seconds of eating. A comparison across a second is enough — a walking Zombie covers 22 pixels in one — and that is what it uses now. A third reading was dropped rather than kept: a check that the Zombie stopped in the right Column depended on the placeholder artwork's Zombie being a particular width, which is not a thing worth a check.

## [0.10.0] - 2026-09-27

Build order step 4 of 13: a Zombie walks in and a Peashooter kills it. The plan had walking as step 5 and shooting as step 4, but one Zombie that walks is of no use without a Zombie that dies, so ticket 04 does both and step 5 is now part of it.

Everything went in behind a failing check first, one slice at a time, in `tests/zombies.test.ts` — ten checks. Three of them caught something: a Zombie that appeared and immediately took a step, so it was never at the right edge it appears at; a Peashooter that shot at a Zombie on the very step that Zombie arrived; and an off-by-one in when a Zombie's walking starts.

### Added

- **Zombies.** A Zombie walks in at the right of a Row and crosses the lawn at a fixed rate — about 4.7 seconds per Column, from memory, and marked as such. It has health, it takes damage, and at nothing left of it it is taken off the lawn.
- **A Peashooter that shoots.** It fires at the nearest Zombie in its own Row, one pea every 1.4 seconds, and a pea takes 20 off a Zombie's 270 health. Fourteen peas fell one, which is about twenty seconds of standing and firing while the Zombie spends thirty-five walking — which is the balance the original is believed to have, and the reason one Peashooter is a real answer rather than a fast one.
- **Peas in flight.** A pea is a point in a Row crossing Columns, aimed at a particular Zombie, and it lands by arriving at that Zombie's place rather than by touching whatever is under it.
- `src/game/zombies.ts` and `src/game/shots.ts`, as two modules rather than one: a Zombie is a thing that walks and a pea is a thing that flies, and neither has to know the other's business beyond aiming.
- `src/game/levels.ts`, with the first Level: one plant, and one Zombie at a time, on a hand-written schedule that is a stand-in rather than the original's.

### Changed

- **A Zombie is not in a Square.** It walks between Squares, across all nine Columns, so what it has is a Row and how far along that Row it is. Asking a Square what occupies it and asking a Row what is walking along it are now two different questions, which they had to become: the next thing to share a Square with a plant is a Zombie standing on one.
- **A Zombie's place is a count of steps walked**, with the place worked out from it, rather than a position moved a fraction at a time. A drifting position sounds harmless and is not: after one Column it is very nearly in the right place rather than exactly, so "the same time to cross every Column" cannot be written as an exact check. The check proved it — the drifting version failed it.
- **A Level is what a game starts from.** It says which plants the Seed Bank offers and what Waves it sends, so the plant list moved out of the game and into the Level, where it always belonged. A check can ask for a Level of its own, which is the only way to get one Zombie in one Row rather than whatever the level in hand would send next.
- **A Wave is a time and a group of Zombies**, not a single Zombie, so that a Flag Wave has somewhere to live when it arrives.
- **Nothing acts on the step it appears.** A Zombie spends the step it walks in standing at the right edge of the board; a pea spends the step it is fired still at the plant. Both one step behind, so that "at the right edge" and "leaves the Peashooter" are places a thing is actually seen rather than places it has already left.
- The rules' step is now a named list — Sun, Waves, Zombies walk, peas land, a Zombie with nothing left leaves, plants fire — and the Sun part became a function of its own, so the step could grow without every branch of it being written twice.

### Fixed

- **A Peashooter shoots forwards only.** A Zombie that has walked past a plant is behind it and is not shot at. Not asked for by the ticket, and left undecided it would have meant either shooting backwards or leaving Zombies unanswerable.
- **A pea that hits nothing now leaves the lawn** instead of sitting on it for the rest of the level. It happens when a pea is in flight and its Zombie is killed by something else.
- **The pea was invisible.** Its own green was within a shade of both lawn stripes and of a plant, so on screen it was a ring on grass — a thing a player had to be told about rather than a thing they could see. It is now much lighter than the lawn and outlined heavily.

### Not done

- A Zombie does not stop at a plant; it walks straight through. That is ticket 05, and until then a plant is not an obstacle to anything.
- A Zombie that gets past the left of the board simply leaves the lawn. In the original the Lawn Mower goes off instead, and a Row whose mower is already spent ends the level. That is tickets 06 and 07.
- A Zombie shows no sign of being hurt, so nothing on screen yet says that a pea landed.
- The other four Zombies, the Flag Wave, winning and losing: all ticket 08 onwards.

### Checked

- 55 checks pass, up from 45. Typecheck clean, production build clean.
- Played in a real browser over about two minutes of real time: 21 checks on the pixels the canvas actually painted. A Zombie drawn in Row 2 at the right of the lawn, walking left at 22 pixels a second and holding that speed over six seconds, a pea drawn in the same Row and to the right of the Peashooter and travelling right, and then the Zombie gone with the Peashooter still standing and no peas left on the grass.
- Two of those checks failed first for the wrong reason, both in the harness rather than the game: a colour search loose enough to count a Zombie also counted 61 antialiased pixels on a Lawn Mower's handle and reported a Zombie standing in Row 1 for the whole level, and a wait written "poll until found" was used to wait for a Zombie to be *gone*, so it returned at once and said the Zombie was still there.

## [0.9.0] - 2026-09-27

Build order step 3 of 13: plant a Peashooter. Choose a Seed Packet, click a Square, the plant appears and its Sun is spent. The Shovel clears a plant and gives no Sun back.

Every rule in this ticket went in behind a failing check first, one slice at a time, in `tests/planting.test.ts` — ten checks, each of which was run and watched to fail before the code that satisfied it.

### Added

- **The Seed Bank.** React shows the plants the level allows, each with its Sun cost, plus the Shovel. A packet you cannot use is greyed out and says why, in two different words: *Recharging* is spent time, *Not enough Sun* is spent money.
- **Planting.** `choose` takes a Seed Packet or the Shovel; `place` puts the chosen plant into a Square, spends exactly its cost, starts its Recharge and puts the packet down.
- **The Shovel.** `shovel` clears the plant out of a Square for no Sun back, and will not clear a Lawn Mower.
- **Recharge.** A packet you have just used cannot be chosen again for 7.5 seconds, and the countdown lives in the rules so the Seed Bank and the rules cannot disagree about whether it is ready.
- **Lawn Mowers on the board.** Every Row now starts with one, and the Square it stands in refuses a plant. They are drawn but do not do anything yet; running and being spent is ticket 06.
- `src/game/plants.ts`, the plant roster as data — cost and Recharge per plant, keyed by name, so the next nine plants are entries rather than branches.
- `PEASHOOTER_SUN_COST` and `PEASHOOTER_RECHARGE` in `balance.ts`, marked as the original's where they are believed to be.

### Changed

- **A Square holds one thing, whatever it is.** The rules now ask what occupies a Square rather than whether a plant does, because the first thing that shares a Square with a plant is a Lawn Mower and the next will be a Zombie walking over one. `occupantAt` is that one question.
- **A refused plant costs nothing at all** — no Sun, and the packet stays chosen so the next click can be somewhere else. The ticket did not say what happens to the choice; keeping it is what makes a misclick free.
- **The chosen packet is game state**, for the same reason the selected Square is: it decides what the next command does, and whether it can be chosen at all is a rule about Recharge, not about how the Seed Bank looks. Three commands were added to the seam, and the spec's list of them now says so.
- `drawBoard` takes the game state rather than a list of the things it draws today. Every remaining ticket puts something new on the lawn, and a growing parameter list would have meant changing that signature and its caller ten times over for nothing.
- The rules moved up into `App`, so the Seed Bank and the lawn share one state. The holder is built once and kept, because the canvas restarts its frame loop when its props change.

### Fixed

- **The Lawn Mower stands in the first Column.** In the original it has its own strip to the left of the lawn, which is not one of the nine plantable Columns; this board has no such strip. The mower therefore occupies Column 1, which cannot be planted, so the lawn is eight Columns wide to plant rather than nine. Recorded in the spec as a deliberate difference. It is the price of making "a Square holding a Lawn Mower refuses a plant" something a player can meet, rather than a rule that only exists in a check.

### Not done

- The chosen packet does not follow the pointer (user story 15). It needs hover tracking on the canvas, and it is a nicety rather than a rule, so it waits.
- The Peashooter does not shoot. That is ticket 04.

### Checked

- 45 checks pass, up from 35. Typecheck clean, production build clean.
- Played in a real browser: 21 checks over real mouse clicks at real pixel coordinates — refusing a plant on a mower, gathering Sun until a Peashooter is affordable, planting for exactly 100, watching the packet grey out and say *Recharging*, then clearing the plant with the Shovel and confirming no Sun came back. Two of those checks failed first for the wrong reason, on colours in the test harness rather than in the game, which is why they are worth having.

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
