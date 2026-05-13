const PRIORITIES = ['low', 'medium', 'high']

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function normalizePriority(priority) {
  return PRIORITIES.includes(priority) ? priority : 'medium'
}

export function normalizeTodos(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const text = String(item.text ?? '').trim()
      if (!text) return null
      return {
        id: String(item.id ?? makeId()),
        text,
        completed: item.completed === true,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
        groupId: item.groupId == null || item.groupId === '' ? null : String(item.groupId),
        dueDate: isValidDueDate(item.dueDate) ? item.dueDate : '',
        priority: normalizePriority(item.priority),
      }
    })
    .filter(Boolean)
}

export function normalizeGroups(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const title = String(item.title ?? '').trim()
      if (!title) return null
      return {
        id: String(item.id ?? makeId()),
        title,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
      }
    })
    .filter(Boolean)
}

export function normalizeTodoState(value) {
  if (Array.isArray(value)) return { todos: normalizeTodos(value), groups: [] }
  if (!value || typeof value !== 'object') return { todos: [], groups: [] }
  return {
    todos: normalizeTodos(value.todos),
    groups: normalizeGroups(value.groups),
  }
}

function isValidDueDate(value) {
  if (typeof value !== 'string' || !value) return false
  // Accept YYYY-MM-DD (date-only) or YYYY-MM-DDTHH:MM (datetime-local)
  return (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/).test(value)
}
