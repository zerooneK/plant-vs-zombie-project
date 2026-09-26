import { useState } from 'react'
import { Lawn } from './ui/Lawn.tsx'
import type { Report } from './ui/Lawn.tsx'
import type { Square } from './game/board.ts'
import { STARTING_SUN } from './game/balance.ts'

/** Player-facing wording. Rows and Columns count from one, not zero. */
function describeSquare(square: Square | null): string {
  if (square === null) {
    return 'nothing'
  }
  return `Row ${square.row + 1}, Column ${square.column + 1}`
}

export function App() {
  const [report, setReport] = useState<Report>({ selected: null, sun: STARTING_SUN })

  return (
    <div className="app">
      <header className="app__header">
        <h1>Lawn Defence</h1>
        <p>Click a Sun to collect it. Click a Square to mark it.</p>
      </header>
      <Lawn onChange={setReport} />
      <footer className="app__footer">
        <p>
          Sun: <strong>{report.sun}</strong>
        </p>
        <p>
          Selected: <strong>{describeSquare(report.selected)}</strong>
        </p>
      </footer>
    </div>
  )
}
