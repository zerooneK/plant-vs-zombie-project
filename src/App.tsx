import { useCallback, useRef, useState } from 'react'
import { Lawn } from './ui/Lawn.tsx'
import type { GameRef, PacketView, Report } from './ui/Lawn.tsx'
import type { Row, Square } from './game/board.ts'
import { SHOVEL, apply, initialGameState, type Choice } from './game/sim.ts'
import { LEVEL_1_1, LEVELS, type Level } from './game/levels.ts'
import type { PlantName } from './game/plants.ts'

/** Player-facing wording. Rows and Columns count from one, not zero. */
function describeSquare(square: Square | null): string {
  if (square === null) {
    return 'nothing'
  }
  return `Row ${square.row + 1}, Column ${square.column + 1}`
}

/**
 * The Rows that have spent their Lawn Mower, in words.
 *
 * The board already marks each one with a dashed footprint where its mower stood,
 * and this says the same thing again in English - because the mark is something a
 * player learns to read once and then stops noticing, and "which Rows are one
 * mistake from ending this level" is a question worth being able to answer without
 * looking away from the lawn.
 */
function describeSpentRows(spent: readonly Row[]): string {
  if (spent.length === 0) {
    return 'every Row still has its Lawn Mower'
  }
  if (spent.length === 1) {
    return `Row ${spent[0]! + 1} has no Lawn Mower left`
  }
  const names = spent.map((row) => `Row ${row + 1}`)
  // The names are already counted up to one here, and the last of them used to
  // have a "+ 1" hung off it as well - inside a template that is string
  // concatenation, so two spent Rows read "Row 3 and Row 41". It only ever showed
  // up with exactly two Rows spent, which nothing had ever put on the screen
  // before: a screenshot of a level that happened to lose two at once did.
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} have no Lawn Mower left`
}

/**
 * The name of each plant as a player knows it.
 *
 * Wording belongs to the interface, not to the rules: the rules hold a name
 * they can compare, and this is the English for it.
 */
const PLANT_NAMES: Record<PlantName, string> = {
  peashooter: 'Peashooter',
  'snow-pea': 'Snow Pea',
  repeater: 'Repeater',
  'puff-shroom': 'Puff-shroom',
  sunflower: 'Sunflower',
  'wall-nut': 'Wall-nut',
  'tall-nut': 'Tall-nut',
  'potato-mine': 'Potato Mine',
  'cherry-bomb': 'Cherry Bomb',
}

/** What the player is holding, in words. */
function describeChoice(choice: Choice | null): string {
  if (choice === null) {
    return 'nothing'
  }
  if (choice === SHOVEL) {
    return 'Shovel'
  }
  return PLANT_NAMES[choice]
}

/**
 * A seed chosen here, outside the rules, so that two playthroughs do not drop
 * Sun in exactly the same places. The rules never ask the machine for a random
 * number - they work everything out from the seed they are given, which is what
 * keeps a check written against one seed a check forever.
 */
function freshSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}

/**
 * The Level this page was asked to play, named in its own address.
 *
 * This is not level select. Nothing here is unlocked and nothing is chosen from
 * a menu, which is ticket 20; all it does is let the address name a Level, which
 * is what a Level already is - the rules begin from one, and say which.
 *
 * It exists because the test bed has to be reachable in a browser. A check can
 * build whatever Level it needs, and a person cannot: the one thing that is not a
 * check about this game is whether the Wall-nut and the Tall-nut look like two
 * different plants, and the answer to that is a screenshot. The address is the
 * smallest way to reach a Level that is not the one the game starts on, and the
 * rules are not asked anything about it - they do not know what a URL is, and
 * this is read once before the game exists, so it cannot change anything while a
 * level is being played.
 *
 * An address naming a Level that does not exist gets the one the game starts on,
 * rather than a blank lawn: a mistyped query string is a wrong request, and the
 * rules' own answer to a Level nobody defined is the first one.
 */
function levelFromTheAddress(): Level {
  const asked = new URLSearchParams(window.location.search).get('level')

  if (asked !== null && Object.hasOwn(LEVELS, asked)) {
    return LEVELS[asked] as Level
  }

  return LEVEL_1_1
}

export function App() {
  // The rules are held here, once, and shared with the canvas that drives them:
  // the Seed Bank has to send commands to the same state the lawn draws, and
  // neither of them may re-render React sixty times a second to do it.
  //
  // The holder is built once and kept, because the canvas restarts its frame
  // loop whenever its props change, and a new holder on every render would hand
  // it a new one each time.
  const holder = useRef<GameRef | null>(null)
  if (holder.current === null) {
    holder.current = { current: initialGameState(freshSeed(), levelFromTheAddress()) }
  }
  const game = holder.current

  const [report, setReport] = useState<Report>({
    selected: null,
    sun: game.current.sun,
    chosen: null,
    spent: [],
    outcome: game.current.outcome,
    flagWaveWarning: game.current.flagWaveWarning,
    packets: game.current.seedBank.map((packet) => ({
      name: packet.name,
      cost: packet.cost,
      ready: true,
    })),
  })

  // A level that has ended has stopped, whichever way it ended, so everything that
  // is laid over the help text is laid over the same thing and the help area keeps
  // one height.
  const ended = report.outcome !== 'playing'

  const choose = useCallback((choice: Choice) => {
    const before = game.current
    const after = apply(before, { kind: 'choose', choice })
    if (after === before) {
      return
    }
    game.current = after
  }, [])

  return (
    <div className="app">
      <header className="app__header">
        <h1>Lawn Defence</h1>
        {/* The help text stays on the page when the level is lost, and the banner
            is laid over it rather than taking its place. Swapping one for the other
            changes how tall this is, which moves the canvas up the page - so the
            board would jump at the exact moment a player is looking at the lawn they
            lost on, and the Zombies frozen on it would all move a little. */}
        <div className="app__help">
          <p aria-hidden={ended}>
            Click a Sun to collect it. Choose a Seed Packet, then click a Square to plant it.
          </p>
          <p aria-hidden={ended}>
            Zombies walk in from the right. A Peashooter shoots the nearest one in its own Row. A
            Zombie that reaches a plant stops and eats it. One that reaches the left edge sets off
            that Row's Lawn Mower, which clears the Row once and is then gone. If that Row is
            breached again the level is lost.
          </p>
          {ended && (
            <p className={`app__banner app__banner--${report.outcome}`} role="status">
              {report.outcome === 'won'
                ? 'Level complete. The last Wave has come and the lawn is clear.'
                : 'Game Over. A Zombie got in at the left of the board and this level is lost.'}
            </p>
          )}
          {/* The Flag Wave is announced while the level is still being played, and is
              laid over the help text for the same reason the ending banner is: an
              announcement that pushed the help text down would move the canvas up the
              page, and the whole point of announcing a Wave is that the player looks
              at the lawn. */}
          {report.flagWaveWarning && !ended && (
            <p className="app__banner app__banner--flag-wave" role="status">
              A huge wave of Zombies is coming. It is the last one.
            </p>
          )}
        </div>
      </header>

      <SeedBank
        packets={report.packets}
        chosen={report.chosen}
        sun={report.sun}
        onChoose={choose}
        playable={report.outcome === 'playing'}
      />

      <Lawn game={game} onChange={setReport} />

      <footer className="app__footer">
        <p>
          Sun: <strong>{report.sun}</strong>
        </p>
        <p>
          Holding: <strong>{describeChoice(report.chosen)}</strong>
        </p>
        <p>
          Selected: <strong>{describeSquare(report.selected)}</strong>
        </p>
        {/* This line stays after Game Over too. It is still true - the Row still has
            no mower - and a footer that loses a line gives its height to the canvas,
            so the board would resize at the moment the level is lost. */}
        <p>
          Lawn Mowers: <strong>{describeSpentRows(report.spent)}</strong>
        </p>
      </footer>
    </div>
  )
}

/** One Seed Packet, and whether it can be chosen right now. */
function Packet({
  packet,
  chosen,
  affordable,
  playable,
  onChoose,
}: {
  packet: PacketView
  chosen: boolean
  affordable: boolean
  playable: boolean
  onChoose: (choice: Choice) => void
}) {
  const name = packet.name as PlantName
  const classes = ['packet']
  if (!packet.ready) {
    classes.push('packet--recharging')
  }
  if (!affordable) {
    classes.push('packet--unaffordable')
  }
  if (chosen) {
    classes.push('packet--chosen')
  }

  return (
    <button
      className={classes.join(' ')}
      disabled={!packet.ready || !playable}
      onClick={() => onChoose(name)}
      type="button"
    >
      <span className="packet__name">{PLANT_NAMES[name]}</span>
      <span className="packet__cost">{packet.cost}</span>
      {!packet.ready && <span className="packet__note">Recharging</span>}
      {packet.ready && !affordable && <span className="packet__note">Not enough Sun</span>}
    </button>
  )
}

/**
 * The Seed Bank: the plants this level allows, each showing what it costs, plus
 * the Shovel. A packet that is Recharging is disabled rather than hidden, so a
 * player can see what they will have to wait for.
 *
 * Everything in the bank is disabled once the level is over. The rules refuse a
 * plant on a level that has been lost whatever this does, so it is not what stops
 * a player planting - it is so the bank does not go on looking available on a
 * board where nothing is. A Seed Packet that looks usable on a lost level is a
 * small lie told sixty times a second.
 */
function SeedBank({
  packets,
  chosen,
  sun,
  playable,
  onChoose,
}: {
  packets: readonly PacketView[]
  chosen: Choice | null
  sun: number
  playable: boolean
  onChoose: (choice: Choice) => void
}) {
  return (
    <div className="seed-bank">
      {packets.map((packet) => (
        <Packet
          key={packet.name}
          packet={packet}
          chosen={chosen === packet.name}
          affordable={sun >= packet.cost}
          playable={playable}
          onChoose={onChoose}
        />
      ))}

      <button
        className={`packet packet--shovel${chosen === SHOVEL ? ' packet--chosen' : ''}`}
        disabled={!playable}
        onClick={() => onChoose(SHOVEL)}
        type="button"
      >
        <span className="packet__name">Shovel</span>
        <span className="packet__note">Clears a plant</span>
      </button>
    </div>
  )
}
