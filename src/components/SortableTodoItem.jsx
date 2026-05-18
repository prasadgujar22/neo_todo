import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const PRIORITY_CYCLE = [undefined, 'low', 'medium', 'high']
const PRIORITY_LABELS = { low: 'Low', medium: 'Med', high: 'High' }

function formatDueDatePart(dueDate) {
  if (!dueDate) return null
  const date = new Date(dueDate)
  if (isNaN(date.getTime())) return dueDate
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(date)
}

function formatDueTimePart(dueDate) {
  if (!dueDate || !dueDate.includes('T')) return null
  const date = new Date(dueDate)
  if (isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date)
}

export default function SortableTodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(todo.text)
  const [editingDate, setEditingDate] = useState(false)
  const dateInputRef = useRef(null)

  // Swipe state
  const swipeContainerRef = useRef(null)
  const swipeDeleteBgRef = useRef(null)
  const swipeStartX = useRef(null)
  const swipeStartY = useRef(null)
  const swipeDeltaX = useRef(0)
  const isSwiping = useRef(false)
  const swipeAnimFrame = useRef(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const saveEdit = () => {
    const text = draft.trim()
    if (text && text !== todo.text) onUpdate(todo.id, { text })
    setDraft(text || todo.text)
    setIsEditing(false)
  }

  const handleTextKeyDown = (e) => {
    if (isEditing && e.key === 'Enter') saveEdit()
    if (isEditing && e.key === 'Escape') { setDraft(todo.text); setIsEditing(false) }
    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onToggle(todo.id)
    }
  }

  const cyclePriority = (e) => {
    e.stopPropagation()
    const cur = PRIORITY_CYCLE.indexOf(todo.priority)
    const next = PRIORITY_CYCLE[(cur + 1) % PRIORITY_CYCLE.length]
    onUpdate(todo.id, { priority: next })
  }

  const handleDateChange = (e) => {
    onUpdate(todo.id, { dueDate: e.target.value || undefined })
    setEditingDate(false)
  }

  const handleDateBlur = () => {
    setEditingDate(false)
  }

  const openDateEdit = (e) => {
    e.stopPropagation()
    setEditingDate(true)
    // showPicker() is Chrome/Firefox only; Safari needs .click() fallback
    setTimeout(() => {
      const el = dateInputRef.current
      if (!el) return
      if (typeof el.showPicker === 'function') {
        try { el.showPicker() } catch { el.click() }
      } else {
        el.click()
      }
    }, 50)
  }

  // ── Swipe-to-delete gesture handlers ──────────────────────────────────────

  const applySwipeTranslate = (x) => {
    const el = swipeContainerRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = `translateX(${x}px)`
  }

  const snapSwipeBack = () => {
    const el = swipeContainerRef.current
    if (!el) return
    el.style.transition = 'transform 0.25s ease'
    el.style.transform = 'translateX(0)'
    swipeDeltaX.current = 0
    if (swipeDeleteBgRef.current) swipeDeleteBgRef.current.style.opacity = '0'
  }

  const handleTouchStart = (e) => {
    // Don't interfere when dnd-kit is actively dragging
    if (isDragging) return
    // Only track single-finger touches
    if (e.touches.length !== 1) return

    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
    isSwiping.current = false
    if (swipeDeleteBgRef.current) swipeDeleteBgRef.current.style.opacity = '1'
  }

  const handleTouchMove = (e) => {
    if (isDragging) return
    if (swipeStartX.current === null) return

    const dx = e.touches[0].clientX - swipeStartX.current
    const dy = e.touches[0].clientY - swipeStartY.current

    // Determine swipe axis on first significant movement
    if (!isSwiping.current) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      if (Math.abs(dy) > Math.abs(dx)) {
        // Predominantly vertical — let dnd-kit / scroll handle it
        swipeStartX.current = null
        return
      }
      isSwiping.current = true
    }

    // We own this gesture — prevent scroll
    e.preventDefault()

    const container = swipeContainerRef.current
    const itemWidth = container ? container.offsetWidth : 300
    // Clamp: only allow sliding left (negative), not right past 0
    const clamped = Math.max(-itemWidth, Math.min(0, dx))
    swipeDeltaX.current = clamped

    if (swipeAnimFrame.current) cancelAnimationFrame(swipeAnimFrame.current)
    swipeAnimFrame.current = requestAnimationFrame(() => applySwipeTranslate(clamped))
  }

  const handleTouchEnd = () => {
    if (isDragging) return
    if (!isSwiping.current) {
      swipeStartX.current = null
      if (swipeDeleteBgRef.current) swipeDeleteBgRef.current.style.opacity = '0'
      return
    }

    const container = swipeContainerRef.current
    const itemWidth = container ? container.offsetWidth : 300
    const threshold = itemWidth * 0.4

    if (Math.abs(swipeDeltaX.current) >= threshold) {
      // Crossed threshold — animate off-screen then delete
      const el = swipeContainerRef.current
      if (el) {
        el.style.transition = 'transform 0.18s ease'
        el.style.transform = `translateX(-${itemWidth}px)`
      }
      setTimeout(() => onDelete(todo.id), 180)
    } else {
      // Snap back
      snapSwipeBack()
    }

    swipeStartX.current = null
    isSwiping.current = false
  }

  // Disable pointer events on drag handle while a horizontal swipe is in progress
  // so that dnd-kit doesn't accidentally intercept the touch.
  const dragHandleStyle = isSwiping.current ? { pointerEvents: 'none' } : {}

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`todo-item priority-${todo.priority ?? 'none'} ${todo.completed ? 'completed' : ''} ${isDragging ? 'is-dragging' : ''}`}
    >
      {/* ── Swipe wrapper ── */}
      <div
        className="swipe-container"
        ref={swipeContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Red delete background revealed as user swipes left */}
        <div className="swipe-delete-bg" ref={swipeDeleteBgRef} aria-hidden="true">
          <span className="swipe-delete-icon">
            <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
              <path d="M5.5 1h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1ZM2 3.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H12v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4H2.5a.5.5 0 0 1-.5-.5ZM4 4v8h7V4H4Zm2 1.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Z" fill="currentColor"/>
            </svg>
          </span>
        </div>

        {/* Actual item content row */}
        <div className="swipe-content">
          <button
            className="drag-handle"
            style={dragHandleStyle}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${todo.text} to reorder`}
          >
            ⠿
          </button>

          <button
            aria-label={todo.completed ? 'Mark as not completed' : 'Mark as completed'}
            className="toggle"
            onClick={() => onToggle(todo.id)}
          >
            <span aria-hidden="true">{todo.completed ? '✔' : ''}</span>
          </button>

          <div className="todo-main">
            {isEditing ? (
              <input
                className="todo-edit-input"
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={handleTextKeyDown}
                aria-label={`Edit ${todo.text}`}
              />
            ) : (
              <span
                className="text"
                onClick={() => onToggle(todo.id)}
                onKeyDown={handleTextKeyDown}
                role="button"
                aria-label={`Toggle ${todo.text}`}
                tabIndex={0}
              >
                {todo.text}
              </span>
            )}
            <span className="todo-meta">
              <button
                className={`priority-badge priority-badge-${todo.priority ?? 'none'} priority-badge--btn`}
                onClick={cyclePriority}
                aria-label={`Priority: ${todo.priority ?? 'none'}, click to change`}
                title="Click to change priority"
              >
                {todo.priority ? PRIORITY_LABELS[todo.priority] : '+ priority'}
              </button>

              {editingDate ? (
                <input
                  ref={dateInputRef}
                  type="datetime-local"
                  className="due-date-input due-date-input--inline"
                  defaultValue={todo.dueDate ?? ''}
                  onChange={handleDateChange}
                  onBlur={handleDateBlur}
                  autoFocus
                  aria-label="Edit due date"
                />
              ) : (
                <button
                  className="due-date-btn"
                  onClick={openDateEdit}
                  aria-label={todo.dueDate ? `Due ${formatDueDatePart(todo.dueDate)}${formatDueTimePart(todo.dueDate) ? ` at ${formatDueTimePart(todo.dueDate)}` : ''}, click to edit` : 'Set due date'}
                  title="Click to edit due date"
                >
                  {todo.dueDate ? (
                    <>
                      <span>{'📅 ' + formatDueDatePart(todo.dueDate)}</span>
                      {formatDueTimePart(todo.dueDate) && (
                        <span className="due-time">{formatDueTimePart(todo.dueDate)}</span>
                      )}
                    </>
                  ) : '+ due date'}
                </button>
              )}
            </span>
          </div>

          <button
            className="edit"
            onClick={() => { setDraft(todo.text); setIsEditing(true) }}
            aria-label={`Edit ${todo.text}`}
          >
            ✎
          </button>
          <button
            aria-label={`Delete ${todo.text}`}
            className="delete"
            onClick={() => onDelete(todo.id)}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M5.5 1h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1ZM2 3.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H12v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4H2.5a.5.5 0 0 1-.5-.5ZM4 4v8h7V4H4Zm2 1.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </li>
  )
}
