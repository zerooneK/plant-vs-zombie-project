import { BOARD_ROWS, MOWER_COLUMN, SQUARE_HEIGHT, everySquare, hasLawnMower } from '../game/board.ts'
import type { Planted, Square } from '../game/board.ts'
import type { SunToken } from '../game/sun.ts'
import type { Shot } from '../game/shots.ts'
import { plantBeingEaten, zombieX, type Zombie } from '../game/zombies.ts'
import { PLANTS } from '../game/plants.ts'
import { SUN_RADIUS } from '../game/balance.ts'
import type { GameState } from '../game/sim.ts'
import { centreOf, place } from './layout.ts'
import type { BoardLayout, Viewport } from './layout.ts'

const BACKGROUND = '#22301f'
const LAWN_EVEN = '#7cb342'
const LAWN_ODD = '#689f38'
const SELECTED_FILL = 'rgba(255, 235, 59, 0.38)'
const SELECTED_EDGE = '#fdd835'
const SUN_RAYS = '#f9a825'
const SUN_FILL = '#fdd835'
const SUN_CORE = '#fff9c4'
const RAYS = 8
const PLANT_LEAF = '#2e7d32'
const PLANT_LEAF_EDGE = '#1b5e20'
const PLANT_FACE = '#66bb6a'
const SUNFLOWER_PETAL = '#fdd835'
const SUNFLOWER_CENTRE = '#f9a825'
const NUT_SHELL = '#c68642'
const NUT_EDGE = '#6b4423'
const NUT_SEAM = '#8d5524'
const MOWER_BODY = '#b0bec5'
const MOWER_EDGE = '#546e7a'
const MOWER_HANDLE = '#ef5350'
const SPENT_MOWER_EDGE = 'rgba(255, 255, 255, 0.3)'
const SNOW_HEAD = '#7fb3cc'
const SNOW_FACE = '#dcedf7'
const SHROOM_CAP = '#a9a49b'
const SHROOM_FACE = '#e6e2da'
const CHILLED_SKIN = '#8ea9c4'
const CHILLED_SKIN_EDGE = '#4a5f7a'
const PEA = '#b7e04b'
const PEA_EDGE = '#33691e'
const ZOMBIE_SKIN = '#9e9e9e'
const ZOMBIE_SKIN_EDGE = '#616161'
const ZOMBIE_SHIRT = '#5d4037'
const ZOMBIE_LEG = '#37474f'
const FLAG_CLOTH = '#e53935'
const FLAG_EDGE = '#b71c1c'
const FLAG_POLE = '#a1887f'
const ZOMBIE_WIDTH = 0.62
const PEA_RADIUS = 8

/**
 * The colour of one Square's grass, which alternates in stripes across the lawn.
 *
 * Asked of the Square rather than worked out here, so that a bite taken out of a
 * plant can be filled in with the grass the plant was standing on - and cannot be
 * filled in with the wrong stripe if the stripes ever change.
 */
function lawnColour(square: Square): string {
  return (square.row + square.column) % 2 === 0 ? LAWN_EVEN : LAWN_ODD
}

/**
 * A plant as a plain green head with a stalk, so that what is standing on
 * the lawn can be told apart from bare grass at a glance. The real artwork is
 * ticket 20; this is a shape, not a picture.
 *
 * A plant being eaten has a bite taken out of it, on the side the Zombie is
 * standing, and the bite grows as the plant's health goes down - so a player can
 * see how much of their plant is left without reading a number. The original
 * shows it by redrawing the plant as it is chewed; there is no such artwork here
 * yet, so the bite is cut out of the shape and filled in with the grass behind,
 * which says the same thing in a placeholder's way. The health it is drawn from
 * is the rules', so the plant on the screen is exactly as eaten as the plant in
 * the state.
 *
 * Each plant is a different shape, because a placeholder that is the same shape
 * for every plant is not a simplification, it is a plant that cannot be told from
 * the thing it replaces. Colours and outlines only: the art pass replaces all of
 * them with the real artwork, and until then there has to be enough of each to
 * name. A Peashooter is a green head on a stalk and a Sunflower is a yellow one; a
 * Wall-nut is a wide nut sitting on the grass and a Tall-nut is a narrow one
 * standing up out of it; and the three shooters that are variations on the
 * Peashooter are that same head in a different colour, a different size, or with
 * two faces where the others have one - the shape of the difference each of them
 * actually makes, so the picture is not having to annotate itself.
 */
function drawPlant(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
): void {
  const square = plant.square
  const centre = centreOf(square, board)
  const head = board.squareWidth * 0.26
  // Named for what it is rather than for a side: this file is full of lefts and
  // rights that mean the way along a Row, and a bare `left` next to a Zombie
  // walking leftwards reads as one of them.
  const healthLeft = healthFraction(plant)

  if (plant.name === 'wall-nut' || plant.name === 'tall-nut') {
    drawNut(context, plant, board, centre, healthLeft)
    return
  }

  // A plant that makes Sun is drawn as a flower and a plant that shoots is drawn as
  // a head on a stalk, because the Seed Bank offers both and a player choosing
  // between them needs to see which one they put down.
  const flower = plant.name === 'sunflower'

  // The four shooters are told apart by one visible thing each, which is the test
  // the test bed is judged by: it exists so that a person can go and look at a
  // plant, and a plant that cannot be told from the thing beside it is a plant
  // nobody is looking at. So a Peashooter is the plain green head, a Snow Pea is
  // that same head gone pale and frosty, a Repeater has two faces where the others
  // have one, and a Puff-shroom is a small grey cap on a short stalk rather than a
  // head at all.
  //
  // Each of those is one visible thing and each is the plant's actual difference:
  // the Snow Pea is the one that is cold, the Repeater is the one with two of
  // everything, and the Puff-shroom is the small one. Colours and one mark, all of
  // which the art pass replaces - and none of which is a number, because a player
  // choosing between four shooters is looking at the lawn, not reading it.
  const cold = plant.name === 'snow-pea'
  const twice = plant.name === 'repeater'
  const shroom = plant.name === 'puff-shroom'

  // The Puff-shroom is drawn smaller and on a shorter stalk because that is what
  // makes it read as a shroom rather than as a small Peashooter, and because the
  // limit on it is that it is a small thing that shoots a short way.
  const size = shroom ? 0.7 : 1
  const cap = head * size
  const stalk = cap * (shroom ? 1.1 : 2.1)

  const body = flower ? SUNFLOWER_PETAL : cold ? SNOW_HEAD : shroom ? SHROOM_CAP : PLANT_LEAF
  const face = flower ? SUNFLOWER_CENTRE : cold ? SNOW_FACE : shroom ? SHROOM_FACE : PLANT_FACE

  context.fillStyle = PLANT_LEAF_EDGE
  context.fillRect(centre.x - cap * 0.15, centre.y, cap * 0.3, stalk)

  context.fillStyle = body
  context.beginPath()
  context.arc(centre.x, centre.y, cap, 0, Math.PI * 2)
  context.fill()

  // Two faces for the Repeater, side by side, where every other shooter has one.
  // The whole of what makes a Repeater a Repeater is that there are two of
  // everything, so two faces is the one mark that says so without a caption.
  if (twice) {
    context.fillStyle = face
    for (const offset of [-0.3, 0.3]) {
      context.beginPath()
      context.arc(centre.x + cap * offset, centre.y, cap * 0.42, 0, Math.PI * 2)
      context.fill()
    }
  } else {
    context.fillStyle = face
    context.beginPath()
    context.arc(centre.x, centre.y, cap * 0.55, 0, Math.PI * 2)
    context.fill()
  }

  // Nothing is cut out of a plant that is untouched, so the shape a healthy plant
  // is drawn as is the shape it always was.
  // Cut out of whatever head this plant actually has, so a partly eaten Puff-shroom
  // is a partly eaten Puff-shroom rather than a bite drawn across a head that is no
  // longer the size it was.
  const bite = cap * 0.9 * (1 - healthLeft)
  if (bite > 0) {
    context.fillStyle = lawnColour(square)
    context.beginPath()
    context.arc(centre.x + cap * 0.5, centre.y - cap * 0.1, bite, 0, Math.PI * 2)
    context.fill()
  }
}

/**
 * A Wall-nut or a Tall-nut: a brown nut, and the only two plants on the lawn
 * that stand on the grass rather than on a stalk.
 *
 * The two are told apart by shape and not by colour, which is the original's own
 * answer - a Tall-nut is a Wall-nut that is taller, the same nut in a taller
 * shell - and it is the better one here as well: they cost exactly the same Sun,
 * so the Seed Bank offers two packets for 50 and a player has to tell which is
 * which by looking, and two different browns would be a harder thing to name than
 * one brown that is wide and one that is tall.
 *
 * A Wide nut and a tall one. Both are kept inside their own Square, which is a
 * rule about the drawing rather than about the nut: a plant that spills over into
 * the Row below is a plant a player can read as being in the wrong Row, and the
 * whole of reading this board is knowing which Row each thing is standing in. So
 * the Tall-nut is drawn down the height of its own Square and the Wall-nut is
 * wide and squat and sits low in it, and the two are that different at a glance
 * that they read as two plants rather than as one plant at two sizes.
 */
function drawNut(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  healthLeft: number,
): void {
  const tall = plant.name === 'tall-nut'
  const across = board.squareWidth * (tall ? 0.25 : 0.36)
  const down = board.squareHeight * (tall ? 0.44 : 0.17)
  // Where the middle of the nut is, down its own Square. `ellipse` centres on the
  // point it is given rather than hanging from it, so this is the middle and not
  // the foot - reading it as the foot drew the Tall-nut over a third of the way
  // into the Row below, which is the mistake the comment above is about.
  const middleY = centre.y + board.squareHeight * (tall ? 0 : 0.27)

  context.fillStyle = NUT_SHELL
  context.beginPath()
  context.ellipse(centre.x, middleY, across, down, 0, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = NUT_EDGE
  context.lineWidth = Math.max(1.5, 2.5 * board.scale)
  context.stroke()

  // A line up the middle, which is the seam in a nut's shell. It is what tells
  // the two apart when both are partly eaten, where the bite has taken the
  // outline that used to do it.
  context.strokeStyle = NUT_SEAM
  context.beginPath()
  context.moveTo(centre.x, middleY - down)
  context.lineTo(centre.x, middleY + down)
  context.stroke()

  // The bite, out of the side the Zombie is standing, exactly as for every other
  // plant. Sized from the nut rather than from a head radius, so that a Wall-nut
  // at half its health shows half a nut whichever of the two it is.
  const bite = across * 0.9 * (1 - healthLeft)
  if (bite > 0) {
    context.fillStyle = lawnColour(plant.square)
    context.beginPath()
    context.arc(centre.x + across * 0.45, middleY - down * 0.2, bite, 0, Math.PI * 2)
    context.fill()
  }
}

/** How much of a plant is left of it, from none to all, as a number between 0 and 1. */
function healthFraction(plant: Planted): number {
  return Math.max(0, Math.min(1, plant.health / PLANTS[plant.name].health))
}

/**
 * A Lawn Mower as a low grey box with a red handle, drawn at the left end of
 * its Row. It has to be recognisably not a plant, because the two are told apart
 * at a glance and a Row's mower is the last thing standing between a player and
 * Game Over.
 */
function drawLawnMower(
  context: CanvasRenderingContext2D,
  square: Square,
  board: BoardLayout,
): void {
  const centre = centreOf(square, board)
  const width = board.squareWidth * 0.62
  const height = board.squareHeight * 0.34

  context.fillStyle = MOWER_HANDLE
  context.fillRect(centre.x - width * 0.42, centre.y - height * 0.95, width * 0.12, height * 0.6)

  context.fillStyle = MOWER_BODY
  context.fillRect(centre.x - width / 2, centre.y - height / 2, width, height)

  context.strokeStyle = MOWER_EDGE
  context.lineWidth = Math.max(1, 2 * board.scale)
  context.strokeRect(centre.x - width / 2, centre.y - height / 2, width, height)
}

/**
 * The outline a Lawn Mower leaves behind, drawn in a Row that has spent its own.
 *
 * A mower is not left with a flag saying it has run - it is simply not on the lawn
 * any more - so a Row that has spent one looks like a Row whose mower is behind a
 * plant, or one whose mower has yet to be drawn, or a Row that never had one. That
 * is a bad thing to be unable to tell apart, because the difference between a Row
 * that can still be saved and a Row that cannot is the whole of what Game Over
 * turns on, and a player watching a Zombie walk down a Row needs to know which one
 * they are watching before it gets there rather than after.
 *
 * So the Row says so, by marking where its mower stood. Drawn as a dashed footprint
 * of the mower's own shape and nothing else: it is a mark on the grass, not a
 * mower, and it is in the same place and the same size as the mower it stands for.
 * Drawn before the plants, so that a plant in that Square - which is allowed, since
 * a spent mower's Square is bare grass like any other - sits on top of it rather
 * than the mark being drawn over a plant.
 *
 * Which Rows these are is asked of the lawn with the same question the rules ask
 * when they work out whether a Row can be saved, and for the same reason: the
 * picture and the rules cannot come to different answers about which Rows still
 * have a mower, because there is only one answer and both of them look it up.
 */
function drawSpentMower(context: CanvasRenderingContext2D, square: Square, board: BoardLayout): void {
  const centre = centreOf(square, board)
  const width = board.squareWidth * 0.62
  const height = board.squareHeight * 0.34

  context.save()
  context.strokeStyle = SPENT_MOWER_EDGE
  context.lineWidth = Math.max(1, 2 * board.scale)
  context.setLineDash([4 * board.scale, 4 * board.scale])
  context.strokeRect(centre.x - width / 2, centre.y - height / 2, width, height)
  context.restore()
}

/**
 * A Zombie: a grey head and shoulders with a brown shirt, drawn walking along its
 * own Row.
 *
 * It has to be tellable from a plant at a glance and from the Lawn Mower next
 * door, because telling them apart is the whole of reading the board. The
 * figures are upright where a plant is a round head on a stalk, and a Zombie is
 * the only thing on the lawn drawn taller than its Row is wide.
 *
 * Drawn from the place the rules put it - `zombieX` rather than a Column -
 * because a Zombie is between Squares on its way across them, and rounding it to
 * a Square would make it stutter instead of walk.
 *
 * A Zombie that is eating reaches out for the plant it is standing at, which is
 * how a player tells a Zombie eating from one merely walking past: the reaching is
 * drawn only when the rules say there is a plant under this Zombie, asked of the
 * same question the rules ask, so the picture cannot show eating where the rules
 * are walking on.
 */
function drawZombie(
  context: CanvasRenderingContext2D,
  zombie: Zombie,
  eating: boolean,
  board: BoardLayout,
): void {
  const centre = place({ x: zombieX(zombie), y: middleOfRow(zombie.row) }, board)
  const width = board.squareWidth * ZOMBIE_WIDTH
  const head = width * 0.34
  const headY = centre.y - board.squareHeight * 0.18

  // A slowed Zombie is drawn in cold colours, because a Zombie walking at half speed
  // and a Zombie walking at its usual speed are the same picture otherwise, and the
  // whole of a Snow Pea is that difference - a player who cannot see which Zombies
  // are slowed cannot tell what their Snow Peas are for. Read from the state rather
  // than from anything worked out here, so the picture cannot show a Zombie slowed
  // where the rules have it walking.
  const skin = zombie.stepsSlowed > 0 ? CHILLED_SKIN : ZOMBIE_SKIN
  const skinEdge = zombie.stepsSlowed > 0 ? CHILLED_SKIN_EDGE : ZOMBIE_SKIN_EDGE

  if (eating) {
    // Two arms out to the left, which is the way the Zombie came and the side the
    // plant is on. The lower one is at the height of the middle of the Square,
    // because that is where a plant's head is drawn and an arm that reached for a
    // plant at head height would be reaching over it. Drawn in the skin colour and
    // in front of the body, so they read as arms rather than as part of it.
    context.fillStyle = skin
    context.fillRect(centre.x - width, headY - head * 0.18, width * 0.72, head * 0.42)
    context.fillRect(centre.x - width, centre.y - head * 0.28, width * 0.72, head * 0.42)
  }

  context.fillStyle = ZOMBIE_LEG
  context.fillRect(centre.x - width * 0.26, centre.y + head * 0.4, width * 0.2, head * 0.9)
  context.fillRect(centre.x + width * 0.06, centre.y + head * 0.4, width * 0.2, head * 0.9)

  context.fillStyle = ZOMBIE_SHIRT
  context.fillRect(centre.x - width * 0.34, centre.y - head * 0.5, width * 0.68, head * 1.1)

  context.fillStyle = skin
  context.beginPath()
  context.arc(centre.x, headY, head, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = skinEdge
  context.lineWidth = Math.max(1, 2 * board.scale)
  context.stroke()

  // The flag goes on last, over the body rather than behind it, and its pole
  // overlaps the shirt. Drawn behind, the pole was hidden by the Zombie standing in
  // front of it and the flag floated over the lawn on its own, which is a thing
  // near a Zombie rather than a thing the Zombie is carrying.
  if (zombie.name === 'flag') {
    drawFlag(context, centre, board)
  }
}

/**
 * The flag a Flag Zombie carries, on a pole it holds out behind it.
 *
 * Drawn behind the Zombie rather than in front, and out of the side the Zombie walks
 * from, so that it reads as something being held rather than something stuck on. A
 * Flag Zombie is otherwise an ordinary Zombie - the same health as any other, and
 * the Wave that sends it is what makes the Wave hard - so with no flag on the
 * screen there is nothing to tell it apart, and a player who has been told the Flag
 * Wave is coming would have no way of seeing that this is the Zombie they are
 * looking for.
 *
 * The pole is drawn first and the Zombie over it, so that the Zombie looks to be
 * holding it: the pole disappears behind the shirt where the two meet.
 */
function drawFlag(
  context: CanvasRenderingContext2D,
  centre: { x: number; y: number },
  board: BoardLayout,
): void {
  // The pole runs from the Zombie's hand to above its head, rather than being a
  // shape of its own hung at some height: a flag whose pole stopped short of the
  // body floated over the lawn like a decoration, and a player looking at it was
  // looking at something near a Zombie rather than at something it was carrying.
  const hand = centre.y + board.squareHeight * 0.06
  const top = hand - board.squareHeight * 0.62
  const poleX = centre.x + board.squareWidth * ZOMBIE_WIDTH * 0.3
  const thickness = Math.max(2, board.squareWidth * 0.045)

  context.fillStyle = FLAG_POLE
  context.fillRect(poleX - thickness / 2, top, thickness, hand - top)

  context.fillStyle = FLAG_CLOTH
  context.beginPath()
  context.moveTo(poleX, top + thickness)
  context.lineTo(poleX + board.squareWidth * 0.34, top + (hand - top) * 0.16)
  context.lineTo(poleX, top + (hand - top) * 0.34)
  context.closePath()
  context.fill()

  context.strokeStyle = FLAG_EDGE
  context.lineWidth = Math.max(1, 1.5 * board.scale)
  context.stroke()
}

/**
 * One pea: a small green disc on its way to a Zombie.
 *
 * Drawn as a dot rather than anything more particular, because its speed is the
 * thing a player reads: a pea that crosses a Column in a third of a second is a
 * flick of green, and anything that trailed behind it would lie about that.
 *
 * Much lighter than the lawn it crosses, and outlined heavily, because a pea's
 * natural green is within a shade or two of both lawn stripes and of a plant -
 * drawn in its own colour it was a ring on grass, which is a thing a player has
 * to be told about rather than a thing they can see.
 *
 * `withOthers` is how many peas are in the air at this same place, and a Repeater's
 * two peas leave on the same step at the same speed for the whole of their flight -
 * which means they are also at the same place for the whole of their flight, and drawn
 * where the rules put them they are one disc rather than two. The whole of a Repeater
 * is that there are two of everything, so the picture has to say so: a cluster is drawn
 * as that many peas, spread just far enough apart to be counted at a glance. It is the
 * one place this drawing knowingly shows something other than a position the rules
 * gave it, and it is a position *inside* the cluster rather than a different one.
 */
function drawShot(
  context: CanvasRenderingContext2D,
  shot: Shot,
  board: BoardLayout,
  withOthers: number,
  thisIndexInItsCluster: number,
): void {
  const radius = PEA_RADIUS * board.scale
  // Spread along the Row rather than up and down it, so a cluster of peas reads as
  // peas travelling together rather than as a taller thing standing in the Row.
  //
  // The spacing is more than a diameter, which is the whole of why two peas are
  // visible at all: two discs of the same radius whose centres are less than a
  // diameter apart are one disc, and a first attempt at this put them half a radius
  // apart, which drew a pair as a slightly wider single pea. A lone pea gets no
  // offset at all, which is most of them.
  const alone =
    withOthers < 2
      ? 0
      : (thisIndexInItsCluster - (withOthers - 1) / 2) * radius * 2.4
  const centre = place({ x: shot.x + alone, y: middleOfRow(shot.row) }, board)

  context.fillStyle = PEA
  context.beginPath()
  context.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = PEA_EDGE
  context.lineWidth = Math.max(1, 1.5 * board.scale)
  context.stroke()
}

/** How far down its Row something is, in the board's own units. */
function middleOfRow(row: number): number {
  return (row + 0.5) * SQUARE_HEIGHT
}

/**
 * One piece of Sun: a plain yellow disc with a pale centre and short rays.
 * Drawn from the place the rules gave it, scaled by the same number that
 * scales the board, so it is always exactly where the rules think it is.
 */
function drawSun(context: CanvasRenderingContext2D, token: SunToken, board: BoardLayout): void {
  const centre = place({ x: token.x, y: token.y }, board)
  const radius = SUN_RADIUS * board.scale

  context.fillStyle = SUN_RAYS
  for (let ray = 0; ray < RAYS; ray++) {
    const angle = (ray / RAYS) * Math.PI * 2
    context.beginPath()
    context.arc(centre.x, centre.y, radius * 1.2, angle - 0.2, angle + 0.2)
    context.fill()
  }

  context.fillStyle = SUN_FILL
  context.beginPath()
  context.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = SUN_CORE
  context.beginPath()
  context.arc(centre.x, centre.y, radius * 0.5, 0, Math.PI * 2)
  context.fill()
}

/**
 * Paints the lawn: five Rows crossed by nine Columns of mown stripes, whatever
 * is standing in them, the selected Square marked, and the Sun lying on it.
 * Placeholder colours only - the real artwork is ticket 20.
 *
 * It is handed the whole game state rather than a list of the things it happens
 * to draw today. Every remaining ticket puts something new on the lawn, and a
 * growing parameter list would mean changing this signature, and its caller,
 * ten times over for no gain.
 */
export function drawBoard(
  context: CanvasRenderingContext2D,
  view: Viewport,
  board: BoardLayout,
  state: GameState,
): void {
  context.fillStyle = BACKGROUND
  context.fillRect(0, 0, view.width, view.height)

  for (const square of everySquare()) {
    context.fillStyle = lawnColour(square)
    context.fillRect(
      board.offsetX + square.column * board.squareWidth,
      board.offsetY + square.row * board.squareHeight,
      board.squareWidth,
      board.squareHeight,
    )
  }

  // Every Row that has spent its mower says so on the lawn, before anything is
  // drawn standing on it. Asked of the lawn rather than remembered, so that a mark
  // cannot be left behind by a mower that is somehow there again, or go missing
  // from a Row that has one.
  for (let row = 0; row < BOARD_ROWS; row++) {
    const square: Square = { row, column: MOWER_COLUMN }
    if (!hasLawnMower(state.occupants, square)) {
      drawSpentMower(context, square, board)
    }
  }

  if (state.selected !== null) {
    const centre = centreOf(state.selected, board)
    const left = centre.x - board.squareWidth / 2
    const top = centre.y - board.squareHeight / 2

    context.fillStyle = SELECTED_FILL
    context.fillRect(left, top, board.squareWidth, board.squareHeight)

    context.strokeStyle = SELECTED_EDGE
    context.lineWidth = Math.max(2, 3 * board.scale)
    context.strokeRect(left, top, board.squareWidth, board.squareHeight)
  }

  for (const occupant of state.occupants) {
    if (occupant.kind === 'plant') {
      drawPlant(context, occupant, board)
    } else {
      drawLawnMower(context, occupant.square, board)
    }
  }

  // Peas in the same Row and at the same place are a cluster - a Repeater's two, or
  // one pea from two Repeaters in a Row - and each is told which of them it is so
  // they can be drawn side by side. A pea a whole pea-width away from its neighbour is
  // travelling alone, whatever else is in the Row.
  for (const shot of state.shots) {
    const cluster = state.shots.filter(
      (other) => other.row === shot.row && Math.abs(other.x - shot.x) <= PEA_RADIUS,
    )
    drawShot(context, shot, board, cluster.length, cluster.findIndex((o) => o.id === shot.id))
  }

  // Zombies are drawn last, over the plants and the peas, because a Zombie is
  // what is on top of the lawn from a player's point of view: it is the thing
  // that has to be dealt with. Which also means a Zombie eating a plant is drawn
  // over that plant, arms and all, so the two of them are read as one thing
  // rather than as a Zombie standing near a plant.
  for (const zombie of state.zombies) {
    const eating = plantBeingEaten(zombie, state.occupants) !== undefined
    drawZombie(context, zombie, eating, board)
  }

  for (const token of state.tokens) {
    drawSun(context, token, board)
  }
}
