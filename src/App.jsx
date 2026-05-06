import { useMemo, useRef, useState } from 'react'
import Stats from './components/Stats.jsx'
import TodoList from './components/TodoList.jsx'
import GroupSection from './components/GroupSection.jsx'
import ShareButton from './components/ShareButton.jsx'
import { formatDayAndDate } from './dateFormatter.js'
import { getSharedTodos } from './utils/shareUrl.js'

// Minimal, accessible React Todo app with localStorage persistence
const STORAGE_KEY = 'neo_todo.todos'
const GROUPS_KEY = 'neo_todo.groups'

function getInitialTodos() {
  // Shared URL takes priority over local storage
  const shared = getSharedTodos()
  if (shared) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shared))
    history.replaceState(null, '', window.location.pathname + window.location.search)
    return shared
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getInitialGroups() {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function EmptyState() {
  return (
    <div className="empty" aria-live="polite">
      <div className="empty-icon">✨</div>
      <div className="empty-text">No todos yet. Add your first task to get started.</div>
    </div>
  )
}

export default function App() {
  const [todos, setTodosState] = useState(getInitialTodos)
  const [groups, setGroupsState] = useState(getInitialGroups)
  const [input, setInput] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [newGroupInput, setNewGroupInput] = useState('')
  const [showGroupInput, setShowGroupInput] = useState(false)

  // Persisted setters
  const setTodos = (updater) => {
    setTodosState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const setGroups = (updater) => {
    setGroupsState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next))
      return next
    })
  }

  // --- Todo actions ---
  const addTodo = (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return
    const newTodo = {
      id: Date.now(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
      groupId: selectedGroupId || null
    }
    setTodos((t) => [newTodo, ...t])
    setInput('')
  }

  const toggleTodo = (id) => {
    setTodos((list) => list.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const deleteTodo = (id) => {
    setTodos((list) => list.filter((t) => t.id !== id))
  }

  const clearCompleted = () => {
    setTodos((list) => list.filter((t) => !t.completed))
  }

  // --- Group actions ---
  const createGroup = (title) => {
    const trimmed = title?.trim()
    if (!trimmed) return
    const group = { id: Date.now(), title: trimmed, createdAt: new Date().toISOString() }
    setGroups((g) => [...g, group])
    setNewGroupInput('')
    setShowGroupInput(false)
    setSelectedGroupId(String(group.id))
  }

  const deleteGroup = (groupId) => {
    // Ungroup todos that belonged to this group — don't nuke them
    setTodos((list) =>
      list.map((t) => (t.groupId === groupId ? { ...t, groupId: null } : t))
    )
    setGroups((g) => g.filter((grp) => grp.id !== groupId))
    if (String(selectedGroupId) === String(groupId)) setSelectedGroupId('')
  }

  // --- Derived ---
  const total = todos.length
  const active = todos.filter((t) => !t.completed).length
  const completed = total - active

  const ungroupedTodos = useMemo(
    () => todos.filter((t) => !t.groupId),
    [todos]
  )

  const todayLabel = useMemo(() => formatDayAndDate(), [])

  const handleTodoKeyDown = (e) => {
    if (e.key === 'Enter') addTodo(input)
  }

  const handleGroupKeyDown = (e) => {
    if (e.key === 'Enter') createGroup(newGroupInput)
  }

  const hasContent = total > 0 || groups.length > 0

  return (
    <div className="neo-todo-root" aria-label="Neo To-Do">
      <header className="header">
        <h1 className="title">Neo To-Do</h1>
        <p className="subtitle">A polished, minimal React todo app</p>
        <p className="today" aria-label="Today">{todayLabel}</p>
      </header>

      <section className="card" aria-label="Todo panel">
        {/* Add task row */}
        <div className="inputRow">
          <input
            aria-label="New todo"
            className="new-todo"
            placeholder="What needs to be done?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleTodoKeyDown}
          />
          {groups.length > 0 && (
            <select
              className="group-select"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              aria-label="Select group for new task"
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>{g.title}</option>
              ))}
            </select>
          )}
          <button className="addBtn" onClick={() => addTodo(input)} aria-label="Add todo">Add</button>
        </div>

        {/* Group creation row */}
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
            <button className="newGroupBtn" onClick={() => setShowGroupInput(true)}>
              + New Group
            </button>
          )}
        </div>

        {/* Content */}
        {!hasContent ? (
          <EmptyState />
        ) : (
          <div className="content">
            {/* Grouped sections */}
            {groups.map((group) => (
              <GroupSection
                key={group.id}
                group={group}
                todos={todos.filter((t) => String(t.groupId) === String(group.id))}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onDeleteGroup={deleteGroup}
              />
            ))}

            {/* Ungrouped todos */}
            {ungroupedTodos.length > 0 && (
              <div className={groups.length > 0 ? 'group-section group-section--ungrouped' : ''}>
                {groups.length > 0 && (
                  <div className="group-header group-header--ungrouped">
                    <span className="group-title-icon">📋</span>
                    <h2 className="group-title">Ungrouped</h2>
                    <span className="group-count">{ungroupedTodos.length}</span>
                  </div>
                )}
                <TodoList todos={ungroupedTodos} onToggle={toggleTodo} onDelete={deleteTodo} />
              </div>
            )}
          </div>
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
          <ShareButton todos={todos} />
        </div>
      </section>
    </div>
  )
}
