import assert from 'node:assert/strict'
import test from 'node:test'
import {
  shouldSaveRemoteTodoState,
  shouldUseRemoteTodoState,
} from '../src/utils/syncDecision.js'

test('initialized empty remote state wins over stale local state', () => {
  assert.equal(shouldUseRemoteTodoState({
    initialized: true,
    todos: [],
    groups: [],
  }), true)
})

test('uninitialized empty remote state allows first local migration', () => {
  assert.equal(shouldUseRemoteTodoState({
    initialized: false,
    todos: [],
    groups: [],
  }), false)
})

test('existing remote rows are used even before sync marker backfill', () => {
  assert.equal(shouldUseRemoteTodoState({
    initialized: false,
    todos: [{ id: 'todo-1' }],
    groups: [],
  }), true)
})

test('empty remote saves require an explicit user mutation', () => {
  assert.equal(shouldSaveRemoteTodoState({ todos: [], groups: [] }, false), false)
  assert.equal(shouldSaveRemoteTodoState({ todos: [], groups: [] }, true), true)
})

test('non-empty remote saves are allowed without user mutation', () => {
  assert.equal(shouldSaveRemoteTodoState({
    todos: [{ id: 'todo-1' }],
    groups: [],
  }, false), true)
})
