import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDueNotificationCandidates,
  getDueNotificationToken,
  getNextDueNotification,
  getTaskDueTime,
} from '../src/utils/notifications.js'

test('due notification token changes when task due date changes', () => {
  assert.equal(getDueNotificationToken({
    id: 'task-1',
    dueDate: '2026-05-22T09:30',
  }), 'task-1:2026-05-22T09:30')
})

test('due notification candidates include only active unnotified due tasks', () => {
  const now = new Date('2026-05-22T10:00:00').getTime()
  const notified = new Set(['already:2026-05-22T09:00'])
  const candidates = getDueNotificationCandidates([
    { id: 'due', text: 'Due now', dueDate: '2026-05-22T10:00', completed: false },
    { id: 'later', text: 'Later', dueDate: '2026-05-22T11:00', completed: false },
    { id: 'done', text: 'Done', dueDate: '2026-05-22T08:00', completed: true },
    { id: 'already', text: 'Already sent', dueDate: '2026-05-22T09:00', completed: false },
  ], notified, now)

  assert.deepEqual(candidates.map((todo) => todo.id), ['due'])
})

test('date-only due notifications use local midnight', () => {
  assert.equal(
    getTaskDueTime({ dueDate: '2026-05-22' }),
    new Date(2026, 4, 22).getTime()
  )
})

test('next due notification chooses the earliest future active task', () => {
  const now = new Date('2026-05-22T10:00:00').getTime()
  const next = getNextDueNotification([
    { id: 'late', text: 'Late', dueDate: '2026-05-22T09:00', completed: false },
    { id: 'second', text: 'Second', dueDate: '2026-05-22T12:00', completed: false },
    { id: 'first', text: 'First', dueDate: '2026-05-22T11:00', completed: false },
  ], new Set(), now)

  assert.equal(next.todo.id, 'first')
  assert.equal(next.token, 'first:2026-05-22T11:00')
})
