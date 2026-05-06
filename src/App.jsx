import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import Stats from './components/Stats.jsx'
import GroupSection from './components/GroupSection.jsx'
import ShareButton from './components/ShareButton.jsx'
import { formatDayAndDate } from './dateFormatter.js'
import { getSharedTodos } from './utils/shareUrl.js'

const STORAGE_KEY = 'neo_todo.todos'
const GROUPS_KEY = 'neo_todo.groups'

function getInitialTodos() {
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
  } catch { return [] }
}

function getInitialGroups() {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function EmptyState() {
  return (
    <div className="empty" aria-live="polite">
      <div className="empty-icon">✨</div>
      <div className="empty-text">No todos yet. Add your first task to get started.</div>
    </div>
  )
}

// Ghost card shown under the cursor while dragging
function DragGhost({ todo }) {
  if (!todo) return null
  return (
    <li className={`todo-item drag-overlay ${todo.completed ? 'completed' : ''}`}>
      <span className="drag-handle" aria-hidden="true">⠿</span>
      <span className="toggle" aria-hidden="true">{todo.completed ? '✔' : ''}</span>
      <span className="text">{todo.text}</span>
    </li>
  )
}

export default function App() {
  const [todos, setTodosState] = useState(getInitialTodos)
  const [groups, setGroupsState] = useState(getInitialGroups)
  const [input, setInput] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [newGroupInput, setNewGroupInput] = useState('')
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [activeId, setActiveId] = useState(null)

  // dnd sensors — require a 5px move before activating so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } })
  )

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

  // ── Todo actions ─────────────────────────────────────────────────────────
  const addTodo = (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return
    setTodos((t) => [{
      id: Date.now(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
      groupId: selectedGroupId ? Number(selectedGroupId) : null,
    }, ...t])
    setInput('')
  }

  const toggleTodo = (id) =>
    setTodos((list) => list.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))

  const deleteTodo = (id) =>
    setTodos((list) => list.filter((t) => t.id !== id))

  const clearCompleted = () =>
    setTodos((list) => list.filter((t) => !t.completed))

  // ── Group actions ─────────────────────────────────────────────────────────
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
    setTodos((list) => list.map((t) => (t.groupId === groupId ? { ...t, groupId: null } : t)))
    setGroups((g) => g.filter((grp) => grp.id !== groupId))
    if (String(selectedGroupId) === String(groupId)) setSelectedGroupId('')
  }

  // ── Drag-and-drop helpers ─────────────────────────────────────────────────

  /** Map any id (todo id OR container id) → container key ('ungrouped' | 'NNN') */
  const getContainer = (id, todoList) => {
    const todo = todoList.find((t) => t.id === id)
    if (todo) return todo.groupId != null ? String(todo.groupId) : 'ungrouped'
    if (id === 'ungrouped') return 'ungrouped'
    if (groups.find((g) => String(g.id) === String(id))) return String(id)
    return null
  }

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragOver = ({ active, over }) => {
    if (!over) return
    setTodos((prev) => {
      const fromContainer = getContainer(active.id, prev)
      const toContainer   = getContainer(over.id,   prev) ?? String(over.id)
      if (!fromContainer || !toContainer || fromContainer === toContainer) return prev

      const newGroupId = toContainer === 'ungrouped' ? null : Number(toContainer)
      const activeTodo = { ...prev.find((t) => t.id === active.id), groupId: newGroupId }
      const withoutActive = prev.filter((t) => t.id !== active.id)
      const overItemIdx = withoutActive.findIndex((t) => t.id === over.id)

      if (overItemIdx !== -1) {
        const result = [...withoutActive]
        result.splice(overItemIdx, 0, activeTodo)
        return result
      }
      // Dropping on an empty container
      return [...withoutActive, activeTodo]
    })
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return

    setTodos((prev) => {
      const fromContainer = getContainer(active.id, prev)
      const toContainer   = getContainer(over.id,   prev)
      // Cross-container moves were handled in onDragOver — only handle same-container reorder here
      if (!fromContainer || !toContainer || fromContainer !== toContainer) return prev

      const containerTodos = prev.filter(
        (t) => (t.groupId != null ? String(t.groupId) : 'ungrouped') === fromContainer
      )
      const otherTodos = prev.filter(
        (t) => (t.groupId != null ? String(t.groupId) : 'ungrouped') !== fromContainer
      )
      const oldIndex = containerTodos.findIndex((t) => t.id === active.id)
      const newIndex = containerTodos.findIndex((t) => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev

      return [...otherTodos, ...arrayMove(containerTodos, oldIndex, newIndex)]
    })
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const total     = todos.length
  const active    = todos.filter((t) => !t.completed).length
  const completed = total - active

  const ungroupedTodos = useMemo(() => todos.filter((t) => t.groupId == null), [todos])
  const todayLabel     = useMemo(() => formatDayAndDate(), [])
  const activeTodo     = useMemo(() => todos.find((t) => t.id === activeId), [todos, activeId])
  const hasContent     = total > 0 || groups.length > 0

  const handleTodoKeyDown  = (e) => { if (e.key === 'Enter') addTodo(input) }
  const handleGroupKeyDown = (e) => { if (e.key === 'Enter') createGroup(newGroupInput) }

  return (
    <div className="neo-todo-root" aria-label="Neo To-Do">
      <header className="header">
        <h1 className="title">Neo To-Do</h1>
        <p className="subtitle">A polished, minimal React todo app</p>
        <p className="today" aria-label="Today">{todayLabel}</p>
      </header>

      <section className="card" aria-label="Todo panel">
        {/* ── Add task row ── */}
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

        {/* ── Group creation row ── */}
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

        {/* ── Content ── */}
        {!hasContent ? (
          <EmptyState />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="content">
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

              {(ungroupedTodos.length > 0 || groups.length > 0) && (
                <GroupSection
                  isUngrouped
                  todos={ungroupedTodos}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              )}
            </div>

            {/* Ghost card under cursor */}
            <DragOverlay>
              {activeTodo ? <DragGhost todo={activeTodo} /> : null}
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
          <ShareButton todos={todos} />
        </div>
      </section>
    </div>
  )
}
