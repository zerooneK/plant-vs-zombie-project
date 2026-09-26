import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { drawBoard } from '../draw/board.ts'
import { layout, squareAtPoint } from '../draw/layout.ts'
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

/**
 * The lawn canvas.
 *
 * The rules live in a ref, not in React state, and the animation loop drives
 * them at a fixed rate. React is told about the selection only when it
 * actually changes, so it re-renders when the player acts rather than sixty
 * times a second. See docs/adr/0001-react-for-game-ui.md.
 */
/** The canvas size the player sees, and the board drawn to fit it. */
interface Geometry {
  readonly view: Viewport
  readonly board: BoardLayout
}

export function Lawn({ onSelected }: { onSelected: (square: Square | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<GameState>(initialGameState())
  const geometryRef = useRef<Geometry | null>(null)
  const toldRef = useRef<Square | null>(null)

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
        drawBoard(context, geometry.view, geometry.board, state.selected)

        // The only place React hears about the rules, and only when the
        // selection has really changed.
        if (!isSameSquare(state.selected, toldRef.current)) {
          toldRef.current = state.selected
          onSelected(state.selected)
        }
      },
    )

    return () => {
      stop()
      observer.disconnect()
    }
  }, [onSelected])

  const onClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const geometry = geometryRef.current
    if (canvas === null || geometry === null) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const square = squareAtPoint(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      geometry.board,
    )
    stateRef.current = apply(stateRef.current, { kind: 'select', square })
  }, [])

  return <canvas className="lawn" onClick={onClick} ref={canvasRef} />
}
