import TodoList from './TodoList.jsx'

export default function GroupSection({ group, todos, onToggle, onDelete, onDeleteGroup }) {
  return (
    <div className="group-section">
      <div className="group-header">
        <span className="group-title-icon">📁</span>
        <h2 className="group-title">{group.title}</h2>
        <span className="group-count">{todos.length}</span>
        <button
          className="group-delete-btn"
          onClick={() => onDeleteGroup(group.id)}
          aria-label={`Delete group ${group.title}`}
          title="Delete group (tasks will be ungrouped)"
        >
          ✕
        </button>
      </div>
      {todos.length === 0 ? (
        <div className="group-empty">No tasks yet — add one above.</div>
      ) : (
        <TodoList todos={todos} onToggle={onToggle} onDelete={onDelete} />
      )}
    </div>
  )
}
