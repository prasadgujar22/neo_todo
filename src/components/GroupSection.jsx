import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableTodoItem from './SortableTodoItem.jsx'

export default function GroupSection({ group, todos, onToggle, onDelete, onDeleteGroup, isUngrouped }) {
  const containerId = isUngrouped ? 'ungrouped' : String(group.id)
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  const title = isUngrouped ? 'Ungrouped' : group.title
  const icon = isUngrouped ? '📋' : '📁'

  return (
    <div
      className={[
        'group-section',
        isOver ? 'group-section--over' : '',
        isUngrouped ? 'group-section--ungrouped' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className={`group-header${isUngrouped ? ' group-header--ungrouped' : ''}`}>
        <span className="group-title-icon">{icon}</span>
        <h2 className="group-title">{title}</h2>
        <span className="group-count">{todos.length}</span>
        {!isUngrouped && (
          <button
            className="group-delete-btn"
            onClick={() => onDeleteGroup(group.id)}
            aria-label={`Delete group ${title}`}
            title="Delete group (tasks will be ungrouped)"
          >
            ✕
          </button>
        )}
      </div>

      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={`todo-list sortable-list${todos.length === 0 ? ' sortable-list--empty' : ''}`}
        >
          {todos.map((t) => (
            <SortableTodoItem
              key={t.id}
              todo={t}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
          {todos.length === 0 && (
            <li className="group-empty" aria-hidden="true">
              Drop tasks here or add one above.
            </li>
          )}
        </ul>
      </SortableContext>
    </div>
  )
}
