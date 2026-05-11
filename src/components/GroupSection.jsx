import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableTodoItem from './SortableTodoItem.jsx'

export default function GroupSection({ group, todos, onToggle, onDelete, onUpdate, onDeleteGroup, onRenameGroup, isUngrouped }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState(group?.title ?? '')

  const containerId = isUngrouped ? 'ungrouped' : String(group.id)
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  const title = isUngrouped ? 'Ungrouped' : group.title
  const icon  = isUngrouped ? '📋' : '📁'

  const saveRename = () => {
    const title = draftTitle.trim()
    if (title && !isUngrouped) onRenameGroup(group.id, title)
    setDraftTitle(title || group?.title || '')
    setIsRenaming(false)
  }

  return (
    <div
      className={[
        'group-section',
        isOver     ? 'group-section--over'      : '',
        isUngrouped? 'group-section--ungrouped' : '',
        collapsed  ? 'group-section--collapsed' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className={`group-header${isUngrouped ? ' group-header--ungrouped' : ''}`}>
        <button
          className="group-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          <span className={`group-chevron${collapsed ? ' group-chevron--collapsed' : ''}`}>▾</span>
        </button>

        <span className="group-title-icon">{icon}</span>
        {isRenaming ? (
          <input
            className="group-title-input"
            value={draftTitle}
            autoFocus
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename()
              if (e.key === 'Escape') { setDraftTitle(group.title); setIsRenaming(false) }
            }}
            aria-label={`Rename ${title}`}
          />
        ) : (
          <h2 className="group-title">{title}</h2>
        )}
        <span className="group-count">{todos.length}</span>

        {!isUngrouped && !isRenaming && (
          <button
            className="group-edit-btn"
            onClick={() => { setDraftTitle(group.title); setIsRenaming(true) }}
            aria-label={`Rename group ${title}`}
            title="Rename group"
          >
            ✎
          </button>
        )}

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

      {!collapsed && (
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
                onUpdate={onUpdate}
              />
            ))}
            {todos.length === 0 && (
              <li className="group-empty" aria-hidden="true">
                Drop tasks here or add one above.
              </li>
            )}
          </ul>
        </SortableContext>
      )}
    </div>
  )
}
