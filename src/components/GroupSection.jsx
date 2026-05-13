import { useState, useMemo, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableTodoItem from './SortableTodoItem.jsx'

const IconFolder = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2H5.38a1.5 1.5 0 0 1 1.06.44l.62.62h5.44A1.5 1.5 0 0 1 14 4.5v7A1.5 1.5 0 0 1 12.5 13h-10A1.5 1.5 0 0 1 1 11.5v-8Z" fill="currentColor" opacity=".9"/>
  </svg>
)

const IconClipboard = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M5 1.5A1.5 1.5 0 0 1 6.5 0h2A1.5 1.5 0 0 1 10 1.5H11A1.5 1.5 0 0 1 12.5 3v10A1.5 1.5 0 0 1 11 14.5H4A1.5 1.5 0 0 1 2.5 13V3A1.5 1.5 0 0 1 4 1.5h1Zm1.5-1a.5.5 0 0 0-.5.5V2h4v-.5a.5.5 0 0 0-.5-.5h-3Zm-2 2a.5.5 0 0 0-.5.5V13a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5H10v.5a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5V2.5H4.5Z" fill="currentColor"/>
  </svg>
)

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

function sortByDate(list, order) {
  const dir = order === 'desc' ? -1 : 1
  return [...list].sort((a, b) => {
    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : (order === 'desc' ? -Infinity : Infinity)
    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : (order === 'desc' ? -Infinity : Infinity)
    if (aDate !== bDate) return dir * (aDate - bDate)
    return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  })
}

export default function GroupSection({ group, todos, onToggle, onDelete, onUpdate, onDeleteGroup, onRenameGroup, isUngrouped, isDragging }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState(group?.title ?? '')
  const [sortOrder, setSortOrder] = useState(null) // null = no sort (natural/drag order)

  // Clear sort when drag starts so dnd-kit's live reordering isn't overridden
  useEffect(() => {
    if (isDragging) setSortOrder(null)
  }, [isDragging])

  const containerId = isUngrouped ? 'ungrouped' : String(group.id)
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  const title = isUngrouped ? 'Ungrouped' : group.title
  const icon = isUngrouped ? <IconClipboard /> : <IconFolder />

  const sortedTodos = useMemo(
    () => sortOrder ? sortByDate(todos, sortOrder) : todos,
    [todos, sortOrder]
  )

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
          <span className={`group-chevron${collapsed ? ' group-chevron--collapsed' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
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

        {/* Sort toggle — inside the group header, right-aligned */}
        <div className="group-sort-row">
          <button
            className={`sortBtn${sortOrder === 'asc' ? ' sortBtn--active' : ''}`}
            onClick={() => setSortOrder(sortOrder === 'asc' ? null : 'asc')}
            aria-pressed={sortOrder === 'asc'}
            title="Sort by earliest due date first"
          >
            ↑ Oldest
          </button>
          <button
            className={`sortBtn${sortOrder === 'desc' ? ' sortBtn--active' : ''}`}
            onClick={() => setSortOrder(sortOrder === 'desc' ? null : 'desc')}
            aria-pressed={sortOrder === 'desc'}
            title="Sort by latest due date first"
          >
            ↓ Latest
          </button>
        </div>

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
        <SortableContext items={sortedTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul
            ref={setNodeRef}
            className={`todo-list sortable-list${sortedTodos.length === 0 ? ' sortable-list--empty' : ''}`}
          >
            {sortedTodos.map((t) => (
              <SortableTodoItem
                key={t.id}
                todo={t}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
            {sortedTodos.length === 0 && (
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
