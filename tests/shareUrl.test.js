import assert from 'node:assert/strict'
import test from 'node:test'
import { encodeTodoState, decodeTodoState } from '../src/utils/shareUrl.js'

test('share payload round-trips todos and groups', () => {
  const state = {
    todos: [
      {
        id: 'todo-1',
        text: 'Ship Neo To-Do upgrades',
        completed: false,
        createdAt: '2026-05-11T00:00:00.000Z',
        groupId: 'group-1',
        dueDate: '2026-05-12',
        priority: 'high',
      },
    ],
    groups: [
      { id: 'group-1', title: 'Launch', createdAt: '2026-05-11T00:00:00.000Z' },
    ],
  }

  const encoded = encodeTodoState(state)
  assert.equal(typeof encoded, 'string')
  assert.deepEqual(decodeTodoState(encoded), state)
})

test('decodeTodoState rejects malformed payloads', () => {
  assert.equal(decodeTodoState('not-a-valid-compressed-value'), null)
})
