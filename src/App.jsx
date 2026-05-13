import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import Stats from './components/Stats.jsx'
import GroupSection from './components/GroupSection.jsx'
import ShareButton from './components/ShareButton.jsx'
import { formatDayAndDate } from './dateFormatter.js'
import { getSharedTodoState } from './utils/shareUrl.js'
import { makeId, normalizeGroups, normalizeTodos } from './utils/todoState.js'
import { readJsonStorage, useLocalStorageState, writeJsonStorage } from './utils/storage.js'
import { getDateInputValue } from './utils/dateInput.js'

const STORAGE_KEY = 'neo_todo.todos'
const GROUPS_KEY = 'neo_todo.groups'
const PRIORITIES = ['low', 'medium', 'high']

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
function sortTodos(list) {
  return [...list].sort((a, b) => {
    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    if (aDate !== bDate) return aDate - bDate
    return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  })
}

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

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
const PRIORITY_LABELS_GHOST = { high: 'High', medium: 'Med', low: 'Low' }

function ghostFormatDate(dueDate) {
  if (!dueDate) return null
  const date = new Date(dueDate)
  if (isNaN(date.getTime())) return null
  const datePart = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
  if (!dueDate.includes('T')) return datePart
  const timePart = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
  return `${datePart} ${timePart}`
}

function DragGhost({ todo }) {
  if (!todo) return null
  const dateLabel = ghostFormatDate(todo.dueDate)
  const priorityColor = PRIORITY_COLORS[todo.priority]
  return (
    <div className="drag-ghost">
      <span className="drag-ghost-handle" aria-hidden="true">⠿</span>
      {priorityColor && (
        <span className="drag-ghost-priority" style={{ background: priorityColor }} aria-hidden="true" />
      )}
      <span className="drag-ghost-text">{todo.text}</span>
      {dateLabel && <span className="drag-ghost-date">📅 {dateLabel}</span>}
    </div>
  )
}

function snapToCursorModifier({ transform, draggingNodeRect, activatorEvent }) {
  if (!draggingNodeRect || !activatorEvent) return transform
  const pX = 'clientX' in activatorEvent ? activatorEvent.clientX : (activatorEvent.touches?.[0]?.clientX ?? 0)
  const pY = 'clientY' in activatorEvent ? activatorEvent.clientY : (activatorEvent.touches?.[0]?.clientY ?? 0)
  return {
    ...transform,
    x: transform.x + pX - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + pY - draggingNodeRect.top - draggingNodeRect.height / 2,
  }
}

export default function App() {
  const initialState = useMemo(() => getInitialState(), [])
  const [todos, setTodos] = useLocalStorageState(STORAGE_KEY, () => initialState.todos)
  const [groups, setGroups] = useLocalStorageState(GROUPS_KEY, () => initialState.groups)
  const [input, setInput] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [newTodoDueDate, setNewTodoDueDate] = useState(() => getDateInputValue())
  const [newTodoPriority, setNewTodoPriority] = useState('medium')
  const [newGroupInput, setNewGroupInput] = useState('')
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [undo, setUndo] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
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
    document.body.classList.add('is-dragging-active')
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
    document.body.classList.remove('is-dragging-active')
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

  const total = todos.length
  const active = todos.filter((t) => !t.completed).length
  const completed = total - active
  const sortedGroups = groups
  const ungroupedTodos = useMemo(() => sortTodos(todos.filter((t) => t.groupId == null)), [todos])
  const todayLabel = useMemo(() => formatDayAndDate(), [])
  const activeTodo = useMemo(() => todos.find((t) => t.id === activeId), [todos, activeId])
  const hasContent = total > 0 || groups.length > 0

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
          >
            <div className="content">
              {sortedGroups.map((group) => (
                <GroupSection
                  key={group.id}
                  group={group}
                  todos={sortTodos(todos.filter((t) => t.groupId === group.id))}
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

            <DragOverlay modifiers={[snapToCursorModifier]}>
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
          <ShareButton todos={todos} groups={groups} />
        </div>
      </section>
      <footer className="app-version">v{__APP_VERSION__}</footer>
    </div>
  )
}
