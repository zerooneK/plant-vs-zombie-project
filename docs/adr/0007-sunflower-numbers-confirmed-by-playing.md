# 0007: The Sunflower's numbers stand, and what decides a Sunflower's fate is when a Zombie arrives

**Status:** accepted

**Date:** 2026-09-29

## Context

The Sunflower's numbers were written at ticket 09 and held with confidence as the original's: 50 Sun, 300 health, and one piece of 25 Sun every 24.25 seconds. Its `balance.ts` note said the production interval made the plant *a worse deal than the sky* — the sky gives 25 every ten seconds — and that it "pays because you plant several and they run at once".

That was an argument, not a measurement. Level 1-1's Wave spacing was set at ticket 08 against a Peashooter and nothing else, so no plan that spends its first Sun on something that does not shoot had ever been played. Ticket 11 is the balance pass `docs/plan.md` has been promising since before the Sunflower existed, and it asked three things: does an economy-first plan still win, is a Sunflower planted in the open punished, and is any number wrong.

## The measurement

Seven checks play Level 1-1's shipped schedule through the rules and read the result. **The Rows are read off that schedule rather than written down**, because which Rows a level attacks, and when, is a fact about the level and not about the file making the claim.

**An economy-first plan wins, and the spacing did not have to move.** Two Sunflowers in Rows the schedule never sends a Zombie down, then Peashooters: won at 172.9 seconds, a margin of **+22.9 seconds** after the last Wave walks in, against 173.2 for the defence-only plan the spacing was balanced against. The economy plan finishes a *fraction of a second sooner* than spending the same Sun on shooting. That is a real but very small margin, and it is the correct shape for a first level — a large one would mean the economy was strictly better and the decision was not one.

**A player who plants nothing still loses, at 142.3 seconds** — unchanged by the Sunflower's arrival, since such a player never gets near one. It was 142 seconds in a comment and is now a number in a check.

**What decides a Sunflower's fate is when a Zombie arrives, not which Row it walks down.** This is where the pass corrected itself most sharply, and the correction is the interesting part.

The ticket's claim was that a Sunflower planted in the first Column is eaten before it has made back what it cost. The first check written from that sentence found one Row where it breaks even *exactly* — two pieces against a cost of 50 — and nearly recorded that as the rule. Measuring every Row instead showed the claim was wrong:

| Row | first Wave | made | against a cost of 50 | eaten at |
|---|---|---|---|---|
| 1 | never | 125 | **+75** | never |
| 2 | 50s | 75 | **+25** | 84.9s |
| 3 | 25s | 50 | **+0** | 59.9s |
| 4 | 80s | 100 | **+50** | 114.9s |
| 5 | never | 125 | **+75** | never |

**Every attacked Row in Level 1-1 pays for its Sunflower**, and only because the level is long enough to let them. The single break-even Row is the one the first Wave reaches earliest, and it is the tightest the level ever makes it — not a rule about Rows.

The arithmetic underneath is the same throughout. A Sunflower earns its 50 Sun back at two pieces, **48.5 seconds** after it is planted. A Zombie needs **42.3 seconds** to cross the whole lawn and two more to eat it. So a Sunflower comes out ahead only where a Zombie takes **more than about fifty seconds to arrive**, and the twenty-five seconds of empty lawn the level opens with is the whole margin. Against the first Wave at twenty-five seconds that is a photo-finish; against a Wave at eighty it is comfortable.

A check written from one Row would have missed all of that, and would have kept missing it: the Row it hard-coded is not the Row the schedule attacks first, and nothing about the number would have changed when the schedule did.

## Decision

**The Sunflower's three numbers stand.** Each is confirmed for a different reason, and each is read *out of the rules* rather than asserted against a literal sitting beside it — the first version of that check compared a local constant to a local constant and would have passed unchanged if the Sunflower had been re-priced.

- **Cost 50.** Read by charging for one: the level opens with 50, a Sunflower takes all of it, and half of that buys a Peashooter. It is the only number in the game that decides what the first click of a level is for.
- **Interval 24.25s.** Read by watching when the Sun arrives, and confirmed *because of* what it makes possible. The payback is longer than the lawn is wide, so a Sunflower is a bet on a Zombie arriving late. A shorter interval would have made the plant safe everywhere and the placement decision would have gone with it. **The number is the decision.**
- **Health 300.** Worth exactly two seconds of a Zombie standing still, against a Wall-nut's forty. Not raised: a tougher Sunflower would be a different plant, one that could hold a Row by itself.

**Level 1-1's Wave spacing does not move.** It leaves room for an economy, and the margin is small.

## What this settles for later

Level 1-1 leaves two of its five Rows unattacked, and that is load-bearing rather than incidental: it is the only place an economy is safe in the first level at all, and a schedule that attacked every Row would remove it. A check says so directly, because the contrast the Sunflower checks draw would silently become a comparison of two identical Rows and report a result meaning nothing.

It also fixes the shape of the choice for every later level. A Sunflower's whole value is *how long before a Zombie reaches it*, and payback is 48.5 seconds — so a level whose schedule reaches every Row inside that window has no use for one at all, and one that reaches them later has a use for as many as it can afford. That is a property of the schedule rather than of the plant, and it is worth knowing before the schedules get denser rather than longer.
