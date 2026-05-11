import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' }

export default function SortableTodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(todo.text)
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`todo-item priority-${todo.priority} ${todo.completed ? 'completed' : ''} ${isDragging ? 'is-dragging' : ''}`}
    >
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
          <span className={`priority-badge priority-badge-${todo.priority}`}>{PRIORITY_LABELS[todo.priority]}</span>
          {todo.dueDate && <time dateTime={todo.dueDate}>Due {todo.dueDate}</time>}
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
        🗑
      </button>
    </li>
  )
}
