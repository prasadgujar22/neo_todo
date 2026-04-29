import TodoItem from './TodoItem.jsx'

export default function TodoList({ todos, onToggle, onDelete }) {
  if (todos.length === 0) return null
  return (
    <ul className="todo-list" role="list">
      {todos.map((t) => (
        <TodoItem key={t.id} todo={t} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  )
}
