import { useCallback, useRef, useState } from 'react'
import { Lawn } from './ui/Lawn.tsx'
import type { GameRef, PacketView, Report } from './ui/Lawn.tsx'
import type { Row, Square } from './game/board.ts'
import { SHOVEL, apply, initialGameState, type Choice } from './game/sim.ts'
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
  return `${names.slice(0, -1).join(', ')} and ${names[spent.length - 1]! + 1} have no Lawn Mower left`
}

/**
 * The name of each plant as a player knows it.
 *
 * Wording belongs to the interface, not to the rules: the rules hold a name
 * they can compare, and this is the English for it.
 */
const PLANT_NAMES: Record<PlantName, string> = {
  peashooter: 'Peashooter',
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
    holder.current = { current: initialGameState(freshSeed()) }
  }
  const game = holder.current

  const [report, setReport] = useState<Report>({
    selected: null,
    sun: game.current.sun,
    chosen: null,
    spent: [],
    gameOver: game.current.gameOver,
    packets: game.current.seedBank.map((packet) => ({
      name: packet.name,
      cost: packet.cost,
      ready: true,
    })),
  })

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
          <p aria-hidden={report.gameOver}>
            Click a Sun to collect it. Choose a Seed Packet, then click a Square to plant it.
          </p>
          <p aria-hidden={report.gameOver}>
            Zombies walk in from the right. A Peashooter shoots the nearest one in its own Row. A
            Zombie that reaches a plant stops and eats it. One that reaches the left edge sets off
            that Row's Lawn Mower, which clears the Row once and is then gone. If that Row is
            breached again the level is lost.
          </p>
          {report.gameOver && (
            <p className="app__game-over" role="status">
              Game Over. A Zombie got in at the left of the board and this level is lost.
            </p>
          )}
        </div>
      </header>

      <SeedBank
        packets={report.packets}
        chosen={report.chosen}
        sun={report.sun}
        onChoose={choose}
        playable={!report.gameOver}
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
