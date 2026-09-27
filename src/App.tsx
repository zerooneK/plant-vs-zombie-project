import { useCallback, useRef, useState } from 'react'
import { Lawn } from './ui/Lawn.tsx'
import type { GameRef, PacketView, Report } from './ui/Lawn.tsx'
import type { Square } from './game/board.ts'
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
        <p>Click a Sun to collect it. Choose a Seed Packet, then click a Square to plant it.</p>
      </header>

      <SeedBank
        packets={report.packets}
        chosen={report.chosen}
        sun={report.sun}
        onChoose={choose}
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
      </footer>
    </div>
  )
}

/** One Seed Packet, and whether it can be chosen right now. */
function Packet({
  packet,
  chosen,
  affordable,
  onChoose,
}: {
  packet: PacketView
  chosen: boolean
  affordable: boolean
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
      disabled={!packet.ready}
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
 */
function SeedBank({
  packets,
  chosen,
  sun,
  onChoose,
}: {
  packets: readonly PacketView[]
  chosen: Choice | null
  sun: number
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
          onChoose={onChoose}
        />
      ))}

      <button
        className={`packet packet--shovel${chosen === SHOVEL ? ' packet--chosen' : ''}`}
        onClick={() => onChoose(SHOVEL)}
        type="button"
      >
        <span className="packet__name">Shovel</span>
        <span className="packet__note">Clears a plant</span>
      </button>
    </div>
  )
}
