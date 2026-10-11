# 0022: Pixel-art characters as letter grids

**Status:** accepted

**Date:** 2026-10-11

Partly supersedes [0017](0017-original-vector-artwork.md): characters move, one at a time, from flat vector shapes to pixel art. 0017's module layout in `src/draw/art/` still stands; its bite cut out of a plant does not, for pixel-art characters.

## Context

The Sunflower was redrawn from the user's own pixel-art picture, and next to it every other character, still in 0017's flat vector style, looked like it came from another game. The user chose to bring every character to the Sunflower's look, from pictures they supply, one character at a time.

The Sunflower's code held everything a pixel-art character needs (the grid, repainting a face, showing a bite, turning letters into a picture, keeping pictures, placing on a Square) in one file. A second character would have copied all of it.

## Decision

**1. One shared module, `src/draw/art/pixel.ts`.** A character file holds only what is its own: a 48 x 48 grid of letters, the colour of each letter, the cells each face repaints, and how it moves. Everything else is shared.

**2. Letters in source, not image files.** A face is a handful of cells repainted, which needs the picture as data. And the game must still open from `file://`, where loading an image file into a canvas and reading it back is blocked.

**3. Shrunk by script, never by eye.** The user's pictures are pixel art enlarged many times. A script reads the middle of each cell, clears the background and ground shadow, and groups the colours; hand fixes are listed in the file's header. The `sprite-maker` sub-agent does this, and copies only what the picture shows.

**4. A bite is a red flash, not a hole.** When a Zombie bites, the whole character is pulled towards red and fades back over a third of a second, as in most games, and a plant being eaten shudders. Nothing is cut out of the picture: a plant keeps working while it is eaten, and a Peashooter with its snout bitten off, still firing, would look like a bug. It also means one picture per face rather than one per amount of health. The cost is that a pixel-art plant does not show how much health it has left.

**5. One size for everyone.** Every character is drawn at one cell size, 42 cells to a Square's width, so one cell, and the outline, is the same on all of them. A character's size on the lawn comes from its picture, not from a number in its file.

**6. Never `#fff9c4`.** Headless checks find Sun on the lawn by that exact colour, so no sprite may use it.

## Consequences

- Until every character is converted, the lawn mixes two styles.
- A new character is a grid, a colour table and a short draw function.
- The user's source pictures live in `.scratch/art/`, which is not versioned.
