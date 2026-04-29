export default function TodoItem({ todo, onToggle, onDelete }) {
  const handleTextKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle(todo.id)
    }
  }

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
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
      <button aria-label={`Delete ${todo.text}`} className="delete" onClick={() => onDelete(todo.id)}>🗑</button>
    </li>
  )
}
