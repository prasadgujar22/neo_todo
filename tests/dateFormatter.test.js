import test from 'node:test'
import assert from 'node:assert/strict'

import { formatDayAndDate } from '../src/dateFormatter.js'

test('formatDayAndDate shows the weekday, month, day, and year', () => {
  const date = new Date('2026-04-30T12:00:00Z')

  const formatted = formatDayAndDate(date, 'en-US', 'UTC')

  assert.equal(formatted, 'Thursday, April 30, 2026')
})
