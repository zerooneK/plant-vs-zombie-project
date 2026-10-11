import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INITIAL_PROGRESS,
  deserializeProgress,
  isLevelUnlocked,
  recordWin,
  serializeProgress,
  unlockedLevels,
} from '../src/game/progress.ts'

test('a fresh player begins with Level 1-1 unlocked, and every other level locked', () => {
  assert.equal(isLevelUnlocked(INITIAL_PROGRESS, '1-1'), true)
  assert.equal(isLevelUnlocked(INITIAL_PROGRESS, '1-2'), false)
  assert.equal(isLevelUnlocked(INITIAL_PROGRESS, '1-10'), false)

  assert.deepEqual(unlockedLevels(INITIAL_PROGRESS), ['1-1'])
})

test('winning a level unlocks the next level in Adventure mode, and beating it again does not duplicate progress', () => {
  const after1_1 = recordWin(INITIAL_PROGRESS, '1-1')
  assert.equal(isLevelUnlocked(after1_1, '1-1'), true)
  assert.equal(isLevelUnlocked(after1_1, '1-2'), true)
  assert.equal(isLevelUnlocked(after1_1, '1-3'), false)
  assert.deepEqual(unlockedLevels(after1_1), ['1-1', '1-2'])

  const after1_2 = recordWin(after1_1, '1-2')
  assert.deepEqual(unlockedLevels(after1_2), ['1-1', '1-2', '1-3'])

  // Winning 1-1 again preserves single entry in completed and keeps progress intact
  const repeated = recordWin(after1_2, '1-1')
  assert.deepEqual(repeated.completed, ['1-1', '1-2'])
  assert.deepEqual(unlockedLevels(repeated), ['1-1', '1-2', '1-3'])
})

test('beating a level records the completion time, and beating it again faster updates the best time', () => {
  const win1 = recordWin(INITIAL_PROGRESS, '1-1', 125)
  assert.equal(win1.bestTimes['1-1'], 125)

  // A slower run does not overwrite the personal best
  const win2 = recordWin(win1, '1-1', 140)
  assert.equal(win2.bestTimes['1-1'], 125)

  // A faster run improves the personal best
  const win3 = recordWin(win2, '1-1', 95)
  assert.equal(win3.bestTimes['1-1'], 95)
})

test('a completed level remains unlocked and replayable even if earlier levels are uncompleted', () => {
  // If a player played Level 1-5 directly (e.g. from a URL bookmark) and beat it
  const customProgress = recordWin(INITIAL_PROGRESS, '1-5', 200)
  assert.equal(isLevelUnlocked(customProgress, '1-5'), true)
  assert.equal(isLevelUnlocked(customProgress, '1-6'), true)
  assert.equal(isLevelUnlocked(customProgress, '1-4'), false)
})

test('saved progress can be serialized to storage and restored intact', () => {
  let progress = recordWin(INITIAL_PROGRESS, '1-1', 110)
  progress = recordWin(progress, '1-2', 175)

  const serialized = serializeProgress(progress)
  assert.equal(typeof serialized, 'string')

  const restored = deserializeProgress(serialized)
  assert.deepEqual(restored.completed, ['1-1', '1-2'])
  assert.equal(restored.bestTimes['1-1'], 110)
  assert.equal(restored.bestTimes['1-2'], 175)
  assert.deepEqual(unlockedLevels(restored), ['1-1', '1-2', '1-3'])
})

test('corrupted or missing saved progress safely defaults to a fresh game', () => {
  assert.deepEqual(deserializeProgress(null), INITIAL_PROGRESS)
  assert.deepEqual(deserializeProgress(''), INITIAL_PROGRESS)
  assert.deepEqual(deserializeProgress('not valid json {[[}'), INITIAL_PROGRESS)
  assert.deepEqual(deserializeProgress('{"completed": "not-an-array"}'), INITIAL_PROGRESS)
  assert.deepEqual(deserializeProgress('{"completed": [123, null, "1-1"]}'), {
    completed: ['1-1'],
    bestTimes: {},
  })
})

test('beating all levels progressively unlocks the entire Adventure roster up to 1-10', () => {
  let progress = INITIAL_PROGRESS
  const levels = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '1-10']

  for (const level of levels) {
    assert.equal(isLevelUnlocked(progress, level), true)
    progress = recordWin(progress, level)
  }

  assert.equal(progress.completed.length, 10)
  assert.deepEqual(unlockedLevels(progress), levels)
})





