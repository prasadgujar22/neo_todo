import test from 'node:test'
import assert from 'node:assert/strict'
import { getDateInputValue } from '../src/utils/dateInput.js'

test('getDateInputValue formats a date for input[type=datetime-local]', () => {
  const date = new Date('2026-05-11T15:45:00Z')
  assert.match(getDateInputValue(date), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
})

test('getDateInputValue uses local calendar date', () => {
  const date = new Date(2026, 4, 11, 9, 30)
  assert.equal(getDateInputValue(date), '2026-05-11T09:30')
})
