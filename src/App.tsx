import { useState } from 'react'
import { Lawn } from './ui/Lawn.tsx'
import type { Square } from './game/board.ts'

/** Player-facing wording. Rows and Columns count from one, not zero. */
function describeSquare(square: Square | null): string {
  if (square === null) {
    return 'nothing'
  }
  return `Row ${square.row + 1}, Column ${square.column + 1}`
}

export function App() {
  const [selected, setSelected] = useState<Square | null>(null)

  return (
    <div className="app">
      <header className="app__header">
        <h1>Lawn Defence</h1>
        <p>Click a Square on the lawn.</p>
      </header>
      <Lawn onSelected={setSelected} />
      <footer className="app__footer">
        Selected: <strong>{describeSquare(selected)}</strong>
      </footer>
    </div>
  )
}
