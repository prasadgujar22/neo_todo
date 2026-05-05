import { useMemo, useRef, useState } from 'react'
import Stats from './components/Stats.jsx'
import TodoList from './components/TodoList.jsx'
import ShareButton from './components/ShareButton.jsx'
import { formatDayAndDate } from './dateFormatter.js'
import { getSharedTodos } from './utils/shareUrl.js'

// Minimal, accessible React Todo app with localStorage persistence
const STORAGE_KEY = 'neo_todo.todos'

function getInitialTodos() {
  // Shared URL takes priority over local storage
  const shared = getSharedTodos()
  if (shared) {
    // Persist the shared list locally so the recipient owns it going forward
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shared))
    // Clean up the URL so it doesn't re-import on every refresh
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
  const [input, setInput] = useState('')

  const setTodos = (updater) => {
    setTodosState((currentTodos) => {
      const nextTodos = typeof updater === 'function' ? updater(currentTodos) : updater
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTodos))
      return nextTodos
    })
  }

  const addTodo = (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return
    const newTodo = {
      id: Date.now(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString()
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

  const total = todos.length
  const active = todos.filter((t) => !t.completed).length
  const completed = total - active

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addTodo(input)
    }
  }

  const visibleTodos = useMemo(() => todos, [todos])
  const todayLabel = useMemo(() => formatDayAndDate(), [])

  return (
    <div className="neo-todo-root" aria-label="Neo To-Do">
      <header className="header">
        <h1 className="title">Neo To-Do</h1>
        <p className="subtitle">A polished, minimal React todo app</p>
        <p className="today" aria-label="Today">{todayLabel}</p>
      </header>

      <section className="card" aria-label="Todo panel">
        <div className="inputRow">
          <input
            aria-label="New todo"
            className="new-todo"
            placeholder="What needs to be done?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="addBtn" onClick={() => addTodo(input)} aria-label="Add todo">Add</button>
        </div>
        {total === 0 ? <EmptyState /> : (
          <div className="content">
            <TodoList todos={visibleTodos} onToggle={toggleTodo} onDelete={deleteTodo} />
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
