# Changelog

All notable changes to Neo To-Do are documented here.

## [0.2.9] — 2026-05-13

### Fixed
- **Sort properly disabled during drag** — removed `sortTodos()` from App.jsx so pre-sorted todos are no longer passed to GroupSection (which was overriding dnd-kit's live reordering at the source). Sort state in GroupSection resets to `null` (deselected) the moment a drag starts via `useEffect`. Sort buttons visually deselect during drag and re-enable after drop. Clicking an already-active sort button now also toggles it off.

## [0.2.8] — 2026-05-13

### Fixed
- **Sort disabled during drag** — sort order is now frozen while a drag is in progress so dnd-kit's live reordering logic is not overridden by re-sorting. Sort resumes as soon as the item is dropped.

## [0.2.7] — 2026-05-13

### Changed
- **Sort order toggle moved to group scope** — each group section (including Ungrouped) now has its own independent ↑ Oldest / ↓ Latest toggle in its header row. Groups can be sorted differently from each other.

## [0.2.6] — 2026-05-13

### Added
- **Sort order toggle** — "↑ Oldest first" / "↓ Latest first" buttons in the task list toolbar let you switch due-date sort direction globally. Tasks without a due date always sort to the bottom. Sort preference is session-only (not persisted).

## [0.2.5] — 2026-05-13

### Fixed
- **Drag ghost now shows priority and due date** — the compact drag pill now includes a coloured priority dot (red/amber/green) and the due date+time alongside the task name, so context is visible while reordering.

## [0.2.4] — 2026-05-13

### Fixed
- **Drag ghost now sticks to pointer on desktop** — replaced full-width drag overlay with a compact pill ghost centered under the cursor via a custom dnd-kit modifier. Eliminates the "floating/detached" visual.
- **Activation distance tuned** — PointerSensor starts drag after 1 px of movement for a more responsive feel.
- **Text selection during drag** — `user-select: none` on todo items and drag handle prevents accidental text selection while dragging.
- **Grabbing cursor** — `body.is-dragging-active` class keeps the grabbing cursor visible even when pointer strays off the ghost.

## [0.2.3] — 2026-05-13

### Fixed
- **Due dates lost after refresh (Chrome & Safari)** — `isValidDueDate` regex now accepts both `YYYY-MM-DD` and `YYYY-MM-DDTHH:MM` formats, fixing datetime-local values being wiped on rehydration from localStorage.
- **Safari select text clipping** — `<select>` elements (Priority, Group) now use `min-height: 44px; height: auto` instead of a fixed `height`, preventing text from being vertically clipped in Safari.
- **Safari datetime-local picker shows only date** — removed `-webkit-appearance: none` which was disabling Safari's native time picker UI.
- **AM/PM clipped on input** — `-webkit-datetime-edit` `min-width` changed from `0` to `1px` preventing AM/PM segment from being squeezed.
- **Due date field width** — `field--date` container widened to `230px` so full `MM/DD/YYYY HH:MM AM` fits without truncation.
- **Safari datetime picker not opening on task badge click** — added `showPicker()` feature detection with `.click()` fallback for Safari.

## [0.2.2] — 2026-05-13

### Added
- **Time support for due dates** — due date fields upgraded from `type="date"` to `type="datetime-local"`. Time displays on its own line in the accent colour below the date in task badges. Fully backward-compatible with existing date-only tasks.
- **AM/PM always shown** — `hour12: true` enforced in time formatting so 12-hour display is consistent across all locales and browsers.
