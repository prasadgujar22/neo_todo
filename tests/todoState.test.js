import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeTodos,
  normalizeGroups,
  makeId,
  normalizePriority,
} from '../src/utils/todoState.js'

test('normalizers keep only valid todos and groups with string ids', () => {
  const todos = normalizeTodos([
    { id: 123, text: '  Keep me  ', completed: 0, groupId: 456, priority: 'urgent', dueDate: '2026-05-12' },
    { id: 'bad', text: '', completed: false },
    null,
  ])
  const groups = normalizeGroups([
    { id: 456, title: '  Work  ' },
    { id: 'empty', title: '   ' },
  ])

  assert.deepEqual(todos, [{
    id: '123',
    text: 'Keep me',
    completed: false,
    createdAt: null,
    groupId: '456',
    dueDate: '2026-05-12',
    priority: 'medium',
  }])
  assert.deepEqual(groups, [{ id: '456', title: 'Work', createdAt: null }])
})

test('makeId creates unique string ids', () => {
  assert.equal(typeof makeId(), 'string')
  assert.notEqual(makeId(), makeId())
})

test('normalizePriority accepts only known priorities', () => {
  assert.equal(normalizePriority('low'), 'low')
  assert.equal(normalizePriority('medium'), 'medium')
  assert.equal(normalizePriority('high'), 'high')
  assert.equal(normalizePriority('urgent'), 'medium')
})
