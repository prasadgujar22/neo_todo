import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Swipe-to-delete tuning. Distance ratios are relative to row width; velocity is px/ms.
const SWIPE_DIRECTION_LOCK_PX = 8
const SWIPE_COMMIT_RATIO = 0.35
const SWIPE_REVEAL_RATIO = 0.18
const SWIPE_FLICK_VELOCITY = 0.6
const SWIPE_FLICK_MIN_DISTANCE = 40
const SWIPE_OVERSHOOT_RESISTANCE = 0.45

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
  const swipeContentRef = useRef(null)
  const swipeDeleteBgRef = useRef(null)
  const swipeStartX = useRef(null)
  const swipeStartY = useRef(null)
  const swipeLastX = useRef(0)
  const swipeLastTime = useRef(0)
  const swipeVelocity = useRef(0)
  const swipeDeltaX = useRef(0)
  const isSwiping = useRef(false)
  const swipeAnimFrame = useRef(null)
  const suppressNextClick = useRef(false)
  const [swipeArmed, setSwipeArmed] = useState(false)

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
  // Native non-passive listeners (attached via useEffect below) so that
  // preventDefault() during a horizontal drag reliably blocks page scroll —
  // React's synthetic touchmove is passive and cannot cancel scrolling.

  const setSwipeDeleteVisuals = (progress, armed) => {
    if (swipeDeleteBgRef.current) {
      swipeDeleteBgRef.current.style.setProperty('--swipe-reveal', String(progress))
      swipeDeleteBgRef.current.style.opacity = progress > 0 ? '1' : '0'
    }
    setSwipeArmed((prev) => (prev === armed ? prev : armed))
  }

  const applySwipeTranslate = (x) => {
    const el = swipeContentRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = `translateX(${x}px)`
  }

  const snapSwipeBack = () => {
    const el = swipeContentRef.current
    if (el) {
      el.style.transition = 'transform 0.22s cubic-bezier(.2,.8,.2,1)'
      el.style.transform = 'translateX(0)'
    }
    swipeDeltaX.current = 0
    setSwipeDeleteVisuals(0, false)
  }

  const resetSwipeState = () => {
    swipeStartX.current = null
    swipeStartY.current = null
    isSwiping.current = false
    swipeVelocity.current = 0
    if (swipeAnimFrame.current) {
      cancelAnimationFrame(swipeAnimFrame.current)
      swipeAnimFrame.current = null
    }
  }

  useEffect(() => {
    const el = swipeContainerRef.current
    if (!el) return

    const onTouchStart = (e) => {
      if (isDragging) return
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      swipeStartX.current = t.clientX
      swipeStartY.current = t.clientY
      swipeLastX.current = t.clientX
      swipeLastTime.current = e.timeStamp
      swipeVelocity.current = 0
      isSwiping.current = false
      // Don't reveal the red bg yet — wait until we know it's a horizontal swipe.
    }

    const onTouchMove = (e) => {
      if (isDragging) return
      if (swipeStartX.current === null) return

      const t = e.touches[0]
      const dx = t.clientX - swipeStartX.current
      const dy = t.clientY - swipeStartY.current

      if (!isSwiping.current) {
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        if (absDx < SWIPE_DIRECTION_LOCK_PX && absDy < SWIPE_DIRECTION_LOCK_PX) return
        // Bias toward vertical: only claim the gesture if dx clearly dominates.
        if (absDy >= absDx) {
          swipeStartX.current = null
          return
        }
        // Only commit to a left-swipe (right-swipes do nothing).
        if (dx > 0) {
          swipeStartX.current = null
          return
        }
        isSwiping.current = true
      }

      // We own the gesture — block page scroll.
      if (e.cancelable) e.preventDefault()

      const container = swipeContainerRef.current
      const itemWidth = container ? container.offsetWidth : 300
      const commitDistance = itemWidth * SWIPE_COMMIT_RATIO

      // Rubber-band resistance past the commit point so it feels physical.
      let visual = dx
      if (visual < -commitDistance) {
        const over = -commitDistance - visual
        visual = -commitDistance - over * SWIPE_OVERSHOOT_RESISTANCE
      }
      const clamped = Math.max(-itemWidth, Math.min(0, visual))
      swipeDeltaX.current = clamped

      // Track velocity (px/ms) over the most recent frame for flick detection.
      const dt = e.timeStamp - swipeLastTime.current
      if (dt > 0) {
        swipeVelocity.current = (t.clientX - swipeLastX.current) / dt
      }
      swipeLastX.current = t.clientX
      swipeLastTime.current = e.timeStamp

      const revealProgress = Math.min(1, Math.abs(clamped) / commitDistance)
      setSwipeDeleteVisuals(revealProgress, Math.abs(dx) >= commitDistance)

      if (swipeAnimFrame.current) cancelAnimationFrame(swipeAnimFrame.current)
      swipeAnimFrame.current = requestAnimationFrame(() => applySwipeTranslate(clamped))
    }

    const onTouchEnd = () => {
      if (isDragging) {
        resetSwipeState()
        setSwipeDeleteVisuals(0, false)
        return
      }
      if (!isSwiping.current) {
        resetSwipeState()
        setSwipeDeleteVisuals(0, false)
        return
      }

      const container = swipeContainerRef.current
      const itemWidth = container ? container.offsetWidth : 300
      const commitDistance = itemWidth * SWIPE_COMMIT_RATIO
      const distance = Math.abs(swipeDeltaX.current)
      // Negative velocity = moving left (toward delete).
      const flicking =
        swipeVelocity.current <= -SWIPE_FLICK_VELOCITY &&
        distance >= SWIPE_FLICK_MIN_DISTANCE

      if (distance >= commitDistance || flicking) {
        setSwipeDeleteVisuals(1, true)
        const contentEl = swipeContentRef.current
        if (contentEl) {
          contentEl.style.transition = 'transform 0.18s ease-out'
          contentEl.style.transform = `translateX(-${itemWidth}px)`
        }
        // Suppress the synthetic click that fires after touchend on the
        // underlying button/text so the swipe doesn't also toggle the todo.
        suppressNextClick.current = true
        setTimeout(() => { suppressNextClick.current = false }, 500)
        setTimeout(() => onDelete(todo.id), 180)
      } else if (distance >= SWIPE_REVEAL_RATIO * itemWidth) {
        // Partial reveal that didn't commit — snap back, but suppress click
        // so accidentally tapping a control mid-swipe doesn't fire.
        suppressNextClick.current = true
        setTimeout(() => { suppressNextClick.current = false }, 400)
        snapSwipeBack()
      } else {
        snapSwipeBack()
      }

      resetSwipeState()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
    // isDragging is read inside the handlers; keep them in sync by re-binding.
    // onDelete/todo.id are stable per item but included for correctness.
    // The other helpers (snapSwipeBack, setSwipeBg, resetSwipeState,
    // applySwipeTranslate) only operate on refs and the setSwipeArmed setter,
    // both of which are stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, onDelete, todo.id])

  // Capture-phase click guard: a successful swipe (or a long partial drag)
  // suppresses the immediately-following click anywhere in the row, so the
  // swipe gesture never accidentally toggles, edits, or opens the date picker.
  const handleClickCapture = (e) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      e.preventDefault()
      e.stopPropagation()
    }
  }

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
        onClickCapture={handleClickCapture}
      >
        {/* Red delete background revealed as user swipes left */}
        <div
          className={`swipe-delete-bg ${swipeArmed ? 'swipe-delete-bg--armed' : ''}`}
          ref={swipeDeleteBgRef}
          aria-hidden="true"
        >
          <span className="swipe-delete-icon">
            <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
              <path d="M5.5 1h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1ZM2 3.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H12v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4H2.5a.5.5 0 0 1-.5-.5ZM4 4v8h7V4H4Zm2 1.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Z" fill="currentColor"/>
            </svg>
          </span>
        </div>

        {/* Actual item content row */}
        <div className="swipe-content" ref={swipeContentRef}>
          <button
            className="drag-handle"
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
