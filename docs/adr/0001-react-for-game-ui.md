# Use React for the game UI, but keep React out of the game loop

The battle lawn is drawn on a plain canvas driven by one `requestAnimationFrame` loop, never by React re-renders. React owns the menus, the seed bar and the HUD, and the HUD updates a few times a second rather than every frame. A canvas-only option was proposed first and declined in favour of React for familiarity's sake, so the risk that React fights the 60fps loop is handled by that split rather than ignored.
