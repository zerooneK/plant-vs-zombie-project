import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { drawBoard } from '../draw/board.ts'
import { layout, pointOnBoard, squareAtPoint } from '../draw/layout.ts'
import type { BoardLayout, Viewport } from '../draw/layout.ts'
import { startFrames } from '../draw/frames.ts'
import { SHOVEL, apply, type Choice, type GameState } from '../game/sim.ts'
import { BOARD_ROWS, MOWER_COLUMN, hasLawnMower, type Occupant, type Row, type Square } from '../game/board.ts'

function isSameSquare(a: Square | null, b: Square | null): boolean {
  if (a === null || b === null) {
    return a === b
  }
  return a.row === b.row && a.column === b.column
}

/** One Seed Packet, as the Seed Bank is told about it. */
export interface PacketView {
  readonly name: string
  readonly cost: number
  /** False while the packet is Recharging, which is how the bank greys it out. */
  readonly ready: boolean
}

/** What the interface is told about the rules, and only when it has changed. */
export interface Report {
  readonly selected: Square | null
  readonly sun: number
  readonly chosen: Choice | null
  readonly packets: readonly PacketView[]
  /**
   * The Rows that have spent their Lawn Mower, in order.
   *
   * In the report rather than worked out in the interface, because the answer is
   * the rules' and not the picture's - and because it changes only when a mower
   * runs, which is a handful of times in a level rather than sixty times a second.
   */
  readonly spent: readonly Row[]
  /** Whether the level has been lost. */
  readonly gameOver: boolean
}

/**
 * The rules, held by whoever started the level and shared with the canvas.
 *
 * A plain ref rather than React state, because the rules advance sixty times a
 * second and React re-rendering at that rate fights the game. See
 * docs/adr/0001-react-for-game-ui.md.
 */
export interface GameRef {
  current: GameState
}

/**
 * Whether a click actually took Sun off the lawn. The rules do not report
 * back, so the interface compares the state it already holds - the same way it
 * notices a change in the selection.
 */
function tookSun(before: GameState, after: GameState): boolean {
  return after.tokens.length !== before.tokens.length
}

function samePackets(a: readonly PacketView[], b: readonly PacketView[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (packet, index) =>
        packet.name === b[index]?.name &&
        packet.cost === b[index]?.cost &&
        packet.ready === b[index]?.ready,
    )
  )
}

/**
 * Whether React has already been told this. A Recharge is counted in steps, and
 * sixty steps a second would re-render React sixty times a second to change a
 * word from "unavailable" to nothing, so readiness is compared as a yes or a no
 * and the countdown is left off on purpose.
 */
function isSameReport(told: Report | null, report: Report): boolean {
  return (
    told !== null &&
    isSameSquare(told.selected, report.selected) &&
    told.sun === report.sun &&
    told.chosen === report.chosen &&
    told.gameOver === report.gameOver &&
    sameRows(told.spent, report.spent) &&
    samePackets(told.packets, report.packets)
  )
}

function sameRows(a: readonly Row[], b: readonly Row[]): boolean {
  return a.length === b.length && a.every((row, index) => row === b[index])
}

/**
 * The Rows that have spent their Lawn Mower, found by asking the lawn.
 *
 * Asked the same way the drawing and the rules ask, one Row at a time, so that
 * the words on the page, the mark on the grass and the rule that saves a Row are
 * all looking at the same thing.
 */
function rowsWithoutAMower(occupants: readonly Occupant[]): Row[] {
  const spent: Row[] = []

  for (let row = 0; row < BOARD_ROWS; row++) {
    if (!hasLawnMower(occupants, { row, column: MOWER_COLUMN })) {
      spent.push(row)
    }
  }

  return spent
}

/** The canvas size the player sees, and the board drawn to fit it. */
interface Geometry {
  readonly view: Viewport
  readonly board: BoardLayout
}

/**
 * The lawn canvas.
 *
 * The rules live in a ref, not in React state, and the animation loop drives
 * them at a fixed rate. React is told about the Sun held, the selection, the
 * chosen packet and the Seed Bank only when one of them really changes, so it
 * re-renders when the player acts rather than sixty times a second.
 */
export function Lawn({ game, onChange }: { game: GameRef; onChange: (report: Report) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const geometryRef = useRef<Geometry | null>(null)
  const toldRef = useRef<Report | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) {
      return
    }
    const context = canvas.getContext('2d')
    if (context === null) {
      return
    }

    const measure = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * ratio)
      canvas.height = Math.round(rect.height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const view = { width: rect.width, height: rect.height }
      geometryRef.current = { view, board: layout(view) }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)

    const stop = startFrames(
      () => {
        game.current = apply(game.current, { kind: 'advance' })
      },
      () => {
        const geometry = geometryRef.current
        if (geometry === null) {
          return
        }
        const state = game.current
        drawBoard(context, geometry.view, geometry.board, state)

        // The only place React hears about the rules, and only when the Sun
        // held, the selection, the chosen packet, a packet's readiness, the Rows
        // that have spent their mower or the level's being over has really changed.
        const report: Report = {
          selected: state.selected,
          sun: state.sun,
          chosen: state.chosen,
          spent: rowsWithoutAMower(state.occupants),
          gameOver: state.gameOver,
          packets: state.seedBank.map((packet) => ({
            name: packet.name,
            cost: packet.cost,
            ready: packet.stepsUntilReady === 0,
          })),
        }
        if (!isSameReport(toldRef.current, report)) {
          toldRef.current = report
          onChange(report)
        }
      },
    )

    return () => {
      stop()
      observer.disconnect()
    }
  }, [game, onChange])

  const onClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      const geometry = geometryRef.current
      if (canvas === null || geometry === null) {
        return
      }

      const rect = canvas.getBoundingClientRect()
      const onScreen = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      const before = game.current

      // Sun is taken before a Square is used. A click aimed at a piece of Sun is
      // a click on that Sun, not a misclick on the grass underneath it.
      const collected = apply(before, {
        kind: 'collect',
        point: pointOnBoard(onScreen, geometry.board),
      })
      if (tookSun(before, collected)) {
        game.current = collected
        return
      }

      const square = squareAtPoint(onScreen, geometry.board)
      if (square === null) {
        return
      }

      // What a click on the lawn does depends on what is chosen in the Seed
      // Bank: the Shovel clears, a Seed Packet plants, and with nothing chosen
      // the click only marks the Square.
      if (before.chosen === SHOVEL) {
        game.current = apply(before, { kind: 'shovel', square })
        return
      }

      if (before.chosen !== null) {
        game.current = apply(before, { kind: 'place', square })
        return
      }

      game.current = apply(before, { kind: 'select', square })
    },
    [game],
  )

  return <canvas className="lawn" onClick={onClick} ref={canvasRef} />
}
