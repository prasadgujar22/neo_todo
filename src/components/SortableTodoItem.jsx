import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortableTodoItem({ todo, onToggle, onDelete }) {
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

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(todo.id)
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`todo-item ${todo.completed ? 'completed' : ''} ${isDragging ? 'is-dragging' : ''}`}
    >
      {/* Drag handle */}
      <button
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        tabIndex={-1}
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
