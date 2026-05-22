import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import Stats from './components/Stats.jsx'
import GroupSection from './components/GroupSection.jsx'
import SortableTodoItem from './components/SortableTodoItem.jsx'
import ShareButton from './components/ShareButton.jsx'
import { formatDayAndDate } from './dateFormatter.js'
import { getSharedTodoState } from './utils/shareUrl.js'
import { makeId, normalizeGroups, normalizeTodos } from './utils/todoState.js'
import { readJsonStorage, writeJsonStorage } from './utils/storage.js'
import { getDateInputValue } from './utils/dateInput.js'
import { isSupabaseConfigured, signInWithGoogle, signOut, supabase } from './utils/supabaseClient.js'
import {
  loadRemoteTodoState,
  saveRemoteTodoState,
} from './utils/supabaseTodoStore.js'
import { shouldUseRemoteTodoState } from './utils/syncDecision.js'
import {
  MAX_NOTIFICATION_DELAY_MS,
  getDueNotificationCandidates,
  getDueNotificationToken,
  getNextDueNotification,
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  showTaskDueNotification,
} from './utils/notifications.js'

const STORAGE_KEY = 'neo_todo.todos'
const GROUPS_KEY = 'neo_todo.groups'
const NOTIFIED_TASKS_KEY = 'neo_todo.notified_due_tasks'
const PRIORITIES = ['low', 'medium', 'high']
const MOUSE_DRAG_DISTANCE_PX = 4
const TOUCH_DRAG_DELAY_MS = 180
const TOUCH_DRAG_TOLERANCE_PX = 8
const REMOTE_SAVE_DELAY_MS = 600

function getInitialState() {
  const shared = getSharedTodoState()
  if (shared) {
    writeJsonStorage(STORAGE_KEY, shared.todos)
    writeJsonStorage(GROUPS_KEY, shared.groups)
    history.replaceState(null, '', window.location.pathname + window.location.search)
    return shared
  }

  return {
    todos: normalizeTodos(readJsonStorage(STORAGE_KEY, [])),
    groups: normalizeGroups(readJsonStorage(GROUPS_KEY, [])),
  }
}

function EmptyState() {
  return (
    <div className="empty" aria-live="polite">
      <div className="empty-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="2" strokeOpacity=".25"/>
          <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity=".35"/>
        </svg>
      </div>
      <div className="empty-text">No todos yet. Add your first task to get started.</div>
    </div>
  )
}

// Removed legacy DragGhost in favor of unified SortableTodoItem overlay

export default function App() {
  const initialState = useMemo(() => getInitialState(), [])
  const [todos, setTodos] = useState(() => initialState.todos)
  const [groups, setGroups] = useState(() => initialState.groups)
  const [input, setInput] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [newTodoDueDate, setNewTodoDueDate] = useState(() => getDateInputValue())
  const [newTodoPriority, setNewTodoPriority] = useState('medium')
  const [newGroupInput, setNewGroupInput] = useState('')
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [undo, setUndo] = useState(null)
  const [session, setSession] = useState(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'Connecting...' : 'Local mode')
  const [syncError, setSyncError] = useState('')
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission())
  const [notificationStatus, setNotificationStatus] = useState('')
  const todosRef = useRef(todos)
  const groupsRef = useRef(groups)
  const notifiedTokensRef = useRef(new Set(readJsonStorage(NOTIFIED_TASKS_KEY, [])))
  const remoteReadyRef = useRef(false)
  const saveQueueRef = useRef(Promise.resolve())
  const saveRunRef = useRef(0)

  useEffect(() => {
    todosRef.current = todos
    writeJsonStorage(STORAGE_KEY, todos)
  }, [todos])

  useEffect(() => {
    groupsRef.current = groups
    writeJsonStorage(GROUPS_KEY, groups)
  }, [groups])

  useEffect(() => {
    if (!supabase) return undefined
    let ignore = false

    supabase.auth.getSession().then(({ data, error }) => {
      if (ignore) return
      if (error) {
        setSyncError(error.message)
        setSyncStatus('Auth unavailable')
        setAuthBusy(false)
        return
      }
      setSession(data.session)
      if (!data.session) setSyncStatus('Local mode')
      setAuthBusy(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setSyncStatus('Local mode')
      setAuthBusy(false)
    })

    return () => {
      ignore = true
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const userId = session?.user?.id
    remoteReadyRef.current = false

    if (!userId) {
      return undefined
    }

    let cancelled = false

    const loadUserState = async () => {
      setSyncError('')
      setSyncStatus('Syncing...')
      try {
        const remote = await loadRemoteTodoState(userId)
        if (cancelled) return

        const localSnapshot = {
          todos: todosRef.current,
          groups: groupsRef.current,
        }
        const hasLocalState = localSnapshot.todos.length > 0 || localSnapshot.groups.length > 0

        if (shouldUseRemoteTodoState(remote)) {
          setTodos(remote.todos)
          setGroups(remote.groups)
        } else if (hasLocalState) {
          await saveRemoteTodoState(userId, localSnapshot)
        }

        if (!cancelled) {
          remoteReadyRef.current = true
          setSyncStatus('Synced')
        }
      } catch (error) {
        if (!cancelled) {
          setSyncError(error.message)
          setSyncStatus('Sync failed')
        }
      }
    }

    loadUserState()

    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !remoteReadyRef.current) return undefined

    const timeoutId = window.setTimeout(async () => {
      const saveRun = saveRunRef.current + 1
      saveRunRef.current = saveRun
      setSyncError('')
      setSyncStatus('Saving...')
      try {
        saveQueueRef.current = saveQueueRef.current
          .catch(() => {})
          .then(() => saveRemoteTodoState(userId, { todos, groups }))

        await saveQueueRef.current
        if (saveRunRef.current === saveRun) setSyncStatus('Synced')
      } catch (error) {
        if (saveRunRef.current === saveRun) {
          setSyncError(error.message)
          setSyncStatus('Sync failed')
        }
      }
    }, REMOTE_SAVE_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [todos, groups, session?.user?.id])

  useEffect(() => {
    if (notificationPermission !== 'granted') return undefined

    let cancelled = false
    let timeoutId = null
    const notifiedTokens = notifiedTokensRef.current

    const markNotified = (token) => {
      notifiedTokens.add(token)
      writeJsonStorage(NOTIFIED_TASKS_KEY, [...notifiedTokens])
    }

    const notifyDueTasks = async () => {
      const candidates = getDueNotificationCandidates(todos, notifiedTokens)
      for (const todo of candidates) {
        if (cancelled) return
        const token = getDueNotificationToken(todo)
        if (!token) continue

        try {
          const sent = await showTaskDueNotification(todo)
          if (sent) markNotified(token)
        } catch (error) {
          console.error('Notification failed:', error)
        }
      }
    }

    const scheduleNextDueTask = () => {
      if (cancelled) return
      const nextDue = getNextDueNotification(todos, notifiedTokens)
      if (!nextDue) return

      const delay = Math.min(
        Math.max(nextDue.dueTime - Date.now(), 0),
        MAX_NOTIFICATION_DELAY_MS
      )
      timeoutId = window.setTimeout(async () => {
        await notifyDueTasks()
        scheduleNextDueTask()
      }, delay)
    }

    notifyDueTasks().then(scheduleNextDueTask)

    return () => {
      cancelled = true
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [todos, notificationPermission])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: TOUCH_DRAG_DELAY_MS,
        tolerance: TOUCH_DRAG_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const withUndo = (message, action) => {
    setUndo({ message, todos, groups })
    action()
  }

  const restoreUndo = () => {
    if (!undo) return
    setTodos(undo.todos)
    setGroups(undo.groups)
    setUndo(null)
  }

  const handleSignIn = async () => {
    setAuthBusy(true)
    setSyncError('')
    try {
      await signInWithGoogle()
    } catch (error) {
      setSyncError(error.message)
      setAuthBusy(false)
    }
  }

  const handleSignOut = async () => {
    setAuthBusy(true)
    setSyncError('')
    try {
      await signOut()
      remoteReadyRef.current = false
      setSyncStatus('Local mode')
    } catch (error) {
      setSyncError(error.message)
    } finally {
      setAuthBusy(false)
    }
  }

  const enableNotifications = async () => {
    setNotificationStatus('')
    try {
      const permission = await requestNotificationPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        setNotificationStatus('Due task notifications enabled')
      } else if (permission === 'denied') {
        setNotificationStatus('Notifications are blocked in this browser')
      }
    } catch (error) {
      setNotificationStatus(error.message)
    }
  }

  const addTodo = (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return
    setTodos((t) => [{
      id: makeId(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
      groupId: selectedGroupId || null,
      dueDate: newTodoDueDate,
      priority: newTodoPriority,
    }, ...t])
    setInput('')
  }

  const updateTodo = (id, patch) =>
    setTodos((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const toggleTodo = (id) =>
    setTodos((list) => list.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))

  const deleteTodo = (id) => withUndo('Task deleted', () =>
    setTodos((list) => list.filter((t) => t.id !== id))
  )

  const clearCompleted = () => withUndo('Completed tasks cleared', () =>
    setTodos((list) => list.filter((t) => !t.completed))
  )

  const createGroup = (title) => {
    const trimmed = title?.trim()
    if (!trimmed) return
    const group = { id: makeId(), title: trimmed, createdAt: new Date().toISOString() }
    setGroups((g) => [...g, group])
    setNewGroupInput('')
    setShowGroupInput(false)
    setSelectedGroupId(group.id)
  }

  const renameGroup = (groupId, title) =>
    setGroups((g) => g.map((grp) => (grp.id === groupId ? { ...grp, title } : grp)))

  const deleteGroup = (groupId) => {
    const group = groups.find((g) => g.id === groupId)
    const confirmed = window.confirm(`Delete group "${group?.title ?? 'Untitled'}"? Tasks will move to Ungrouped.`)
    if (!confirmed) return
    withUndo('Group deleted', () => {
      setTodos((list) => list.map((t) => (t.groupId === groupId ? { ...t, groupId: null } : t)))
      setGroups((g) => g.filter((grp) => grp.id !== groupId))
      if (selectedGroupId === groupId) setSelectedGroupId('')
    })
  }

  const getContainer = (id, todoList) => {
    const itemId = String(id)
    const todo = todoList.find((t) => t.id === itemId)
    if (todo) return todo.groupId ?? 'ungrouped'
    if (itemId === 'ungrouped') return 'ungrouped'
    if (groups.find((g) => g.id === itemId)) return itemId
    return null
  }

  const handleDragStart = ({ active }) => {
    setActiveId(String(active.id))
  }

  const handleDragOver = ({ active, over }) => {
    if (!over) return
    setTodos((prev) => {
      const activeId = String(active.id)
      const overId = String(over.id)
      const fromContainer = getContainer(activeId, prev)
      const toContainer = getContainer(overId, prev) ?? overId
      if (!fromContainer || !toContainer || fromContainer === toContainer) return prev

      const activeSource = prev.find((t) => t.id === activeId)
      if (!activeSource) return prev

      const activeTodo = { ...activeSource, groupId: toContainer === 'ungrouped' ? null : toContainer }
      const withoutActive = prev.filter((t) => t.id !== activeId)
      const overItemIdx = withoutActive.findIndex((t) => t.id === overId)

      if (overItemIdx !== -1) {
        const result = [...withoutActive]
        result.splice(overItemIdx, 0, activeTodo)
        return result
      }
      return [...withoutActive, activeTodo]
    })
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || String(active.id) === String(over.id)) return

    setTodos((prev) => {
      const activeId = String(active.id)
      const overId = String(over.id)
      const fromContainer = getContainer(activeId, prev)
      const toContainer = getContainer(overId, prev)
      if (!fromContainer || !toContainer || fromContainer !== toContainer) return prev

      const containerTodos = prev.filter((t) => (t.groupId ?? 'ungrouped') === fromContainer)
      const otherTodos = prev.filter((t) => (t.groupId ?? 'ungrouped') !== fromContainer)
      const oldIndex = containerTodos.findIndex((t) => t.id === activeId)
      const newIndex = containerTodos.findIndex((t) => t.id === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev

      return [...otherTodos, ...arrayMove(containerTodos, oldIndex, newIndex)]
    })
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const total = todos.length
  const active = todos.filter((t) => !t.completed).length
  const completed = total - active
  const sortedGroups = groups
  const ungroupedTodos = useMemo(() => todos.filter((t) => t.groupId == null), [todos])
  const todayLabel = useMemo(() => formatDayAndDate(), [])
  const activeTodo = useMemo(() => todos.find((t) => t.id === activeId), [todos, activeId])
  const hasContent = total > 0 || groups.length > 0
  const userEmail = session?.user?.email
  const notificationSupported = isNotificationSupported()

  const handleTodoKeyDown = (e) => { if (e.key === 'Enter') addTodo(input) }
  const handleGroupKeyDown = (e) => { if (e.key === 'Enter') createGroup(newGroupInput) }

  return (
    <div className="neo-todo-root" aria-label="Neo To-Do">
      <header className="header">
        <h1 className="title">Neo To-Do</h1>
        <p className="subtitle">A polished, minimal React todo app</p>
        <p className="today" aria-label="Today">{todayLabel}</p>
      </header>

      <section className="card" aria-label="Todo panel">
        <div className="authBar">
          <div className="authStatus">
            <span className={`authStatus-dot ${session ? 'authStatus-dot--online' : ''}`} aria-hidden="true" />
            <span>{userEmail ? `Signed in as ${userEmail}` : syncStatus}</span>
            {session && <span className="authSync">{syncStatus}</span>}
          </div>
          {isSupabaseConfigured ? (
            session ? (
              <button className="authBtn authBtn--secondary" onClick={handleSignOut} disabled={authBusy}>
                Sign out
              </button>
            ) : (
              <button className="authBtn" onClick={handleSignIn} disabled={authBusy}>
                Continue with Google
              </button>
            )
          ) : (
            <span className="authHint">Add Supabase env vars to enable Google sign-in.</span>
          )}
        </div>
        {syncError && <div className="syncError" role="alert">{syncError}</div>}
        <div className="notificationBar">
          <div className="notificationStatus">
            <span
              className={`notificationStatus-dot ${notificationPermission === 'granted' ? 'notificationStatus-dot--on' : ''}`}
              aria-hidden="true"
            />
            <span>
              {notificationPermission === 'granted'
                ? 'Due notifications on'
                : notificationSupported
                  ? 'Due notifications off'
                  : 'Notifications unsupported'}
            </span>
            {notificationStatus && <span className="notificationHint">{notificationStatus}</span>}
          </div>
          {notificationSupported && notificationPermission !== 'granted' && (
            <button
              className="notificationBtn"
              onClick={enableNotifications}
              disabled={notificationPermission === 'denied'}
            >
              Enable
            </button>
          )}
        </div>

        <div className="inputRow inputRow--stackable">
          <label className="field field--task">
            <span className="field-label">Task</span>
            <input
              aria-label="New todo"
              className="new-todo"
              placeholder="What needs to be done?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleTodoKeyDown}
            />
          </label>
          {groups.length > 0 && (
            <label className="field field--compact">
              <span className="field-label">Group</span>
              <select
                className="group-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                aria-label="Select group for new task"
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field field--compact">
            <span className="field-label">Priority</span>
            <select
              className="priority-select"
              value={newTodoPriority}
              onChange={(e) => setNewTodoPriority(e.target.value)}
              aria-label="Select priority for new task"
            >
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="field field--date">
            <span className="field-label">Due date</span>
            <input
              className="due-date-input"
              type="datetime-local"
              value={newTodoDueDate}
              onChange={(e) => setNewTodoDueDate(e.target.value)}
              aria-label="Due date for new task"
            />
          </label>
          <button className="addBtn" onClick={() => addTodo(input)} aria-label="Add todo">Add</button>
        </div>

        <div className="groupRow">
          {showGroupInput ? (
            <div className="groupInputRow">
              <input
                autoFocus
                className="group-name-input"
                placeholder="Group name…"
                value={newGroupInput}
                onChange={(e) => setNewGroupInput(e.target.value)}
                onKeyDown={handleGroupKeyDown}
                aria-label="New group name"
              />
              <button className="groupCreateBtn" onClick={() => createGroup(newGroupInput)}>Create</button>
              <button className="groupCancelBtn" onClick={() => { setShowGroupInput(false); setNewGroupInput('') }}>Cancel</button>
            </div>
          ) : (
            <button className="newGroupBtn" onClick={() => setShowGroupInput(true)}>+ New Group</button>
          )}
        </div>

        {undo && (
          <div className="undoBar" role="status">
            <span>{undo.message}</span>
            <button onClick={restoreUndo}>Undo</button>
            <button aria-label="Dismiss undo" onClick={() => setUndo(null)}>✕</button>
          </div>
        )}

        {!hasContent ? (
          <EmptyState />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="content">
              {sortedGroups.map((group) => (
                <GroupSection
                  key={group.id}
                  group={group}
                  todos={todos.filter((t) => t.groupId === group.id)}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onUpdate={updateTodo}
                  onDeleteGroup={deleteGroup}
                  onRenameGroup={renameGroup}
                  isDragging={!!activeId}
                />
              ))}

              {(ungroupedTodos.length > 0 || groups.length > 0) && (
                <GroupSection
                  isUngrouped
                  todos={ungroupedTodos}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onUpdate={updateTodo}
                  isDragging={!!activeId}
                />
              )}
            </div>

            <DragOverlay>
              {activeTodo ? <SortableTodoItem todo={activeTodo} isOverlay={true} /> : null}
            </DragOverlay>
          </DndContext>
        )}

        <div className="footerBar">
          <Stats total={total} active={active} completed={completed} />
          <button
            className="clearBtn"
            onClick={clearCompleted}
            aria-label="Clear completed"
            disabled={completed === 0}
          >
            Clear completed
          </button>
        </div>
        <div className="shareRow">
          <ShareButton todos={todos} groups={groups} />
        </div>
      </section>
      <footer className="app-version">v{__APP_VERSION__}</footer>
    </div>
  )
}
