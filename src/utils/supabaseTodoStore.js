import { normalizeGroups, normalizeTodos } from './todoState.js'
import { supabase } from './supabaseClient.js'

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
  if (!supabase) return { todos: [], groups: [] }

  const [groupsResult, todosResult] = await Promise.all([
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
      .order('created_at', { ascending: false }),
  ])

  if (groupsResult.error) throw groupsResult.error
  if (todosResult.error) throw todosResult.error

  return {
    groups: normalizeGroups(groupsResult.data.map(toAppGroup)),
    todos: normalizeTodos(todosResult.data.map(toAppTodo)),
  }
}

export async function saveRemoteTodoState(userId, state) {
  if (!supabase) return

  const groups = normalizeGroups(state.groups)
  const todos = normalizeTodos(state.todos)

  const deleteTodos = await supabase.from('todos').delete().eq('user_id', userId)
  if (deleteTodos.error) throw deleteTodos.error

  const deleteGroups = await supabase.from('groups').delete().eq('user_id', userId)
  if (deleteGroups.error) throw deleteGroups.error

  if (groups.length > 0) {
    const insertGroups = await supabase
      .from('groups')
      .insert(groups.map((group, index) => toDbGroup(group, userId, index)))

    if (insertGroups.error) throw insertGroups.error
  }

  if (todos.length > 0) {
    const groupIds = new Set(groups.map((group) => group.id))
    const insertTodos = await supabase
      .from('todos')
      .insert(todos.map((todo, index) => {
        const groupId = todo.groupId && groupIds.has(todo.groupId) ? todo.groupId : null
        return toDbTodo({ ...todo, groupId }, userId, index)
      }))

    if (insertTodos.error) throw insertTodos.error
  }
}
