export const MAX_NOTIFICATION_DELAY_MS = 2_147_483_647
const SERVICE_WORKER_READY_TIMEOUT_MS = 750

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.requestPermission()
}

export function getDueNotificationToken(todo) {
  if (!todo?.id || !todo?.dueDate) return null
  return `${todo.id}:${todo.dueDate}`
}

export function getTaskDueTime(todo) {
  if (!todo?.dueDate) return null
  const dateOnlyMatch = todo.dueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
  }

  const dueTime = new Date(todo.dueDate).getTime()
  return Number.isFinite(dueTime) ? dueTime : null
}

export function getDueNotificationCandidates(todos, notifiedTokens, now = Date.now()) {
  if (!Array.isArray(todos)) return []

  return todos
    .filter((todo) => {
      if (!todo || todo.completed) return false
      const token = getDueNotificationToken(todo)
      const dueTime = getTaskDueTime(todo)
      return Boolean(token && dueTime !== null && dueTime <= now && !notifiedTokens.has(token))
    })
}

export function getNextDueNotification(todos, notifiedTokens, now = Date.now()) {
  if (!Array.isArray(todos)) return null

  return todos.reduce((next, todo) => {
    if (!todo || todo.completed) return next
    const token = getDueNotificationToken(todo)
    const dueTime = getTaskDueTime(todo)
    if (!token || dueTime === null || dueTime <= now || notifiedTokens.has(token)) return next
    if (!next || dueTime < next.dueTime) return { todo, token, dueTime }
    return next
  }, null)
}

export async function showTaskDueNotification(todo) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false

  const options = {
    body: todo.text,
    tag: `neo-todo-due-${todo.id}`,
    renotify: true,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { todoId: todo.id },
  }

  const registration = await getReadyServiceWorkerRegistration()
  if (registration?.showNotification) {
    await registration.showNotification('Task due', options)
    return true
  }

  new Notification('Task due', options)
  return true
}

async function getReadyServiceWorkerRegistration() {
  if (!navigator.serviceWorker?.ready) return null

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => {
      window.setTimeout(() => resolve(null), SERVICE_WORKER_READY_TIMEOUT_MS)
    }),
  ])
}
