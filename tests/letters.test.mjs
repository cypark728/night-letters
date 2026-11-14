import test from 'node:test'
import assert from 'node:assert/strict'
import { LETTERS, letterForDate, nextLetter, letterGroup } from '../src/lib/date.ts'

test('November 9 is letter 11 and weekends do not consume letters', () => {
  assert.equal(letterForDate('2026-11-09')?.number, 11)
  assert.equal(letterForDate('2026-11-13')?.number, 15)
  assert.equal(letterForDate('2026-11-14'), undefined)
  assert.equal(letterForDate('2026-11-15'), undefined)
  assert.equal(nextLetter('2026-11-13')?.date, '2026-11-16')
  assert.equal(letterForDate('2026-11-16')?.number, 16)
})
test('30 unique weekday letters stop at December 4', () => {
  assert.equal(LETTERS.length, 30)
  assert.equal(new Set(LETTERS.map(l => l.date)).size, 30)
  assert.equal(LETTERS[0].date, '2026-10-26')
  assert.equal(LETTERS[29].date, '2026-12-04')
  assert.equal(nextLetter('2026-12-04'), undefined)
  for (const l of LETTERS) assert.ok(![0,6].includes(new Date(l.date + 'T12:00:00').getDay()))
})
test('Sunday reading groups preserve five-letter rounds', () => {
  assert.deepEqual(letterGroup('2026-11-13').map(l => l.number), [11,12,13,14,15])
  assert.deepEqual(letterGroup('2026-12-04').map(l => l.number), [26,27,28,29,30])
})
