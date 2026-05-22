import { normalizeGroups, normalizeTodos } from './todoState.js'
import { supabase } from './supabaseClient.js'

export class RemoteStateConflictError extends Error {
  constructor() {
    super('Remote tasks changed on another device. Refresh to load the latest tasks before saving again.')
    this.name = 'RemoteStateConflictError'
  }
}

function toDbGroup(group, userId, position) {
  return {
    id: group.id,
    user_id: userId,
    title: group.title,
    created_at: group.createdAt || new Date().toISOString(),
    position,
  }
}

function toDbTodo(todo, userId, position) {
  return {
    id: todo.id,
    user_id: userId,
    group_id: todo.groupId || null,
    text: todo.text,
    completed: todo.completed,
    created_at: todo.createdAt || new Date().toISOString(),
    due_date: todo.dueDate || null,
    priority: todo.priority || 'medium',
    position,
  }
}

function toAppGroup(group) {
  return {
    id: group.id,
    title: group.title,
    createdAt: group.created_at,
  }
}

function toAppTodo(todo) {
  return {
    id: todo.id,
    text: todo.text,
    completed: todo.completed,
    createdAt: todo.created_at,
    groupId: todo.group_id,
    dueDate: todo.due_date || '',
    priority: todo.priority,
  }
}

export async function loadRemoteTodoState(userId) {
  if (!supabase) return { todos: [], groups: [], initialized: false, updatedAt: null }

  const [syncStateResult, groupsResult, todosResult] = await Promise.all([
    supabase
      .from('todo_sync_state')
      .select('initialized,updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('groups')
      .select('id,title,created_at,position')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('todos')
      .select('id,text,completed,created_at,group_id,due_date,priority,position')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (syncStateResult.error) throw syncStateResult.error
  if (groupsResult.error) throw groupsResult.error
  if (todosResult.error) throw todosResult.error

  return {
    initialized: Boolean(syncStateResult.data?.initialized),
    updatedAt: syncStateResult.data?.updated_at ?? null,
    groups: normalizeGroups(groupsResult.data.map(toAppGroup)),
    todos: normalizeTodos(todosResult.data.map(toAppTodo)),
  }
}

export async function saveRemoteTodoState(userId, state, expectedUpdatedAt = null) {
  if (!supabase) return { updatedAt: null }

  const groups = normalizeGroups(state.groups)
  const todos = normalizeTodos(state.todos)
  const groupIds = new Set(groups.map((group) => group.id))
  const normalizedTodos = todos.map((todo) => ({
    ...todo,
    groupId: todo.groupId && groupIds.has(todo.groupId) ? todo.groupId : null,
  }))

  const result = await supabase.rpc('save_todo_state', {
    p_expected_updated_at: expectedUpdatedAt,
    p_groups: groups.map((group, index) => toDbGroup(group, userId, index)),
    p_todos: normalizedTodos.map((todo, index) => toDbTodo(todo, userId, index)),
  })

  if (result.error) throw result.error

  const savedState = result.data?.[0]
  if (savedState?.status === 'conflict') throw new RemoteStateConflictError()

  return { updatedAt: savedState?.updated_at ?? null }
}
