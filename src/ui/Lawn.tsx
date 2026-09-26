import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { drawBoard } from '../draw/board.ts'
import { layout, pointOnBoard, squareAtPoint } from '../draw/layout.ts'
import type { BoardLayout, Viewport } from '../draw/layout.ts'
import { startFrames } from '../draw/frames.ts'
import { apply, initialGameState } from '../game/sim.ts'
import type { GameState } from '../game/sim.ts'
import type { Square } from '../game/board.ts'

function isSameSquare(a: Square | null, b: Square | null): boolean {
  if (a === null || b === null) {
    return a === b
  }
  return a.row === b.row && a.column === b.column
}

/** What the interface is told about the rules, and only when it has changed. */
export interface Report {
  readonly selected: Square | null
  readonly sun: number
}

/**
 * Whether a click actually took Sun off the lawn. The rules do not report
 * back, so the interface compares the state it already holds - the same way it
 * notices a change in the selection.
 */
function tookSun(before: GameState, after: GameState): boolean {
  return after.tokens.length !== before.tokens.length
}

function isSameReport(told: Report | null, report: Report): boolean {
  return told !== null && isSameSquare(told.selected, report.selected) && told.sun === report.sun
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
 * The lawn canvas.
 *
 * The rules live in a ref, not in React state, and the animation loop drives
 * them at a fixed rate. React is told about the Sun held and the selection only
 * when one of them actually changes, so it re-renders when the player acts
 * rather than sixty times a second. See docs/adr/0001-react-for-game-ui.md.
 */
/** The canvas size the player sees, and the board drawn to fit it. */
interface Geometry {
  readonly view: Viewport
  readonly board: BoardLayout
}

export function Lawn({ onChange }: { onChange: (report: Report) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<GameState>(initialGameState(freshSeed()))
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
        stateRef.current = apply(stateRef.current, { kind: 'advance' })
      },
      () => {
        const geometry = geometryRef.current
        if (geometry === null) {
          return
        }
        const state = stateRef.current
        drawBoard(context, geometry.view, geometry.board, state.selected, state.tokens)

        // The only place React hears about the rules, and only when the Sun
        // held or the selection has really changed.
        const report: Report = { selected: state.selected, sun: state.sun }
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
  }, [onChange])

  const onClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const geometry = geometryRef.current
    if (canvas === null || geometry === null) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const onScreen = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const before = stateRef.current

    // Sun is taken before a Square is marked. A click aimed at a piece of Sun
    // is a click on that Sun, not a misclick on the grass underneath it.
    const collected = apply(before, { kind: 'collect', point: pointOnBoard(onScreen, geometry.board) })
    if (tookSun(before, collected)) {
      stateRef.current = collected
      return
    }

    stateRef.current = apply(before, {
      kind: 'select',
      square: squareAtPoint(onScreen, geometry.board),
    })
  }, [])

  return <canvas className="lawn" onClick={onClick} ref={canvasRef} />
}
