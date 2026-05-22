# Changelog

All notable changes to Neo To-Do are documented here.

## [0.4.5] — 2026-05-23

### Fixed
- **Atomic cloud saves** — replaced client-side delete/reinsert sequences with a single Supabase RPC that runs inside one Postgres transaction.
- **Conflict detection** — remote saves now compare `todo_sync_state.updated_at` and surface a warning when another device changed the cloud state first.
- **Stable ordering** — made todo and group load tiebreakers consistently sort by `created_at` ascending after `position`.

## [0.4.4] — 2026-05-22

### Fixed
- **Cloud sync safety** — blocked empty cloud saves unless the browser session has an explicit user edit, preventing startup or browser-refresh edge cases from wiping remote tasks.
- **Mobile notification copy** — clarified notification availability for mobile browsers that do not expose the Web Notification API in normal tabs.

## [0.4.3] — 2026-05-22

### Added
- **Due task notifications** — added browser notification permission controls and local due-date scheduling for active tasks.
- **Notification safeguards** — each task due date notifies once per browser/device, and edited due dates can notify again at the new time.

## [0.4.2] — 2026-05-22

### Fixed
- **Share link shortening** — replaced TinyURL's deprecated unauthenticated endpoint with the supported authenticated TinyURL API.
- **Shortener fallback** — share links now fall back to the full compressed app URL when `TINYURL_API_TOKEN` is not configured or TinyURL is unavailable.

## [0.4.1] — 2026-05-21

### Fixed
- **Cross-device delete sync** — added an initialized sync marker so an intentionally empty cloud todo list does not get repopulated from stale local browser storage on another device.
- **Supabase sync metadata** — added a `todo_sync_state` table and migration with row-level security policies.

## [0.4.0] — 2026-05-21

### Added
- **Supabase Google sign-in** — optional Google SSO via Supabase Auth, with local mode preserved when Supabase env vars are not configured.
- **Cloud todo sync** — signed-in users load and save todos/groups to Supabase Postgres.
- **Local-to-cloud migration** — existing local todos/groups are uploaded on first sign-in when the user's Supabase account has no cloud data yet.
- **Auth status UI** — added a compact sign-in/status bar with sync state and sign-out support.
- **Supabase schema** — added `supabase/schema.sql` with `groups` and `todos` tables, indexes, and row-level security policies.
- **Supabase migration** — added a timestamped migration under `supabase/migrations` for GitHub/CLI deployment.
- **Environment template** — added `.env.example` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## [0.3.7] — 2026-05-20

### Fixed
- **Improved drag-and-drop grab alignment** — swapped the simplified task placeholder (`DragGhost`) for a fully unified `SortableTodoItem` in the drag overlay. The overlay item now uses the exact same layout structure, padding, priority badges, and due dates, which resolves both the pointer alignment offset (jump) and the visual morphing when grabbing tasks.
- **Polished drag overlay aesthetics** — customized CSS borders for the dragged overlay to keep the priority indicator line intact while maintaining a sharp, premium styled-border look.

## [0.3.6] — 2026-05-20

### Changed
- **Improved touch drag reordering** — replaced `PointerSensor` with dedicated `MouseSensor` and `TouchSensor`. Mouse drag activates after 4 px of movement; touch drag requires a 180 ms hold with 8 px tolerance, eliminating false drag triggers during swipes.
- **Explicit drag handle activator** — `setActivatorNodeRef` now wires the grip icon as the dnd-kit activator node, giving it a more precise and reliable touch target.
- **Drag disabled during editing** — drag is suppressed while a task's text or due-date field is focused, preventing gesture conflicts when typing.
- **Drag cancel handler** — `onDragCancel` resets `activeId` on cancelled drags so the overlay is never left orphaned.

### Fixed
- **ESLint clean** — removed unused `sortTodos` import from `App.jsx` and corrected a `setState`-inside-`useEffect` pattern in `GroupSection.jsx`.
- **Date input test** — corrected `dateInput.test.js` to expect the `datetime-local` value format produced by the updated input helper.

## [0.3.5] — 2026-05-19

### Fixed
- **Version correction** — bumped package version to match the v0.3.5 tag; the v0.3.4 release had been published under the wrong version string. Functionally identical to v0.3.4.

## [0.3.4] — 2026-05-19

### Fixed
- **Swipe delete icon layering** — the bin icon now stays behind the task content row inside the revealed delete background. Previously the icon was rendering above the sliding row, causing a visible overlap during the swipe.
- **Translation target corrected** — the swipe translate is now applied to the task content element only, not the entire `.swipe-container`, so the delete background stays anchored in place during the gesture.

## [0.3.3] — 2026-05-19

### Fixed
- **Non-passive native touch handling** — swipe gesture listeners are now registered as non-passive via `useEffect` so `preventDefault()` reliably blocks page scroll during a horizontal drag (React's synthetic `onTouchMove` is passive and cannot cancel scrolling).
- **Flick-to-delete** — a fast left flick (≥ 0.6 px/ms velocity, ≥ 40 px distance) triggers deletion without requiring the full 35 % drag threshold.
- **Direction locking** — horizontal swipe is committed after 8 px of lateral movement; diagonal or vertical gestures are ignored, preventing accidental deletes during vertical scroll.
- **Click suppression after swipe** — a `suppressNextClick` guard prevents a `tap` event from toggling a task immediately after a swipe gesture completes.
- **Rubber-band resistance** — swipes past the commit threshold apply 0.45× resistance so the row doesn't fly off-screen, and an "armed" visual state on the delete background signals that release will confirm deletion.

## [0.3.2] — 2026-05-19

### Fixed
- **Removed dark fill on task rows** — stripped both `background: inherit` and `background: var(--card, #fff)` declarations from `.swipe-content` so the row is fully transparent and inherits naturally from the list. The semi-transparent card background in dark mode was causing a visible dark fill over the row.
- **Delete background hidden at rest; revealed on swipe** — `.swipe-delete-bg` now starts at `opacity: 0` (with a `0.15s ease` transition). A `swipeDeleteBgRef` is wired up in `SortableTodoItem`: opacity snaps to `1` the moment a swipe gesture starts (`handleTouchStart`) and returns to `0` when the swipe snaps back (`snapSwipeBack`) or is cancelled without a swipe (`handleTouchEnd` early-return). The red background and bin icon are therefore invisible at rest and fade in cleanly behind the sliding content row during a swipe.

## [0.3.1] — 2026-05-19

### Added
- **Swipe-to-delete on mobile** — on touch devices, swipe a todo item left to reveal a red delete zone with a trash icon. Release past 40% of the item width to confirm deletion; partial swipes snap back smoothly. The existing desktop delete button is unaffected.
- **No-library gesture detection** — implemented with `useRef` + native `onTouchStart` / `onTouchMove` / `onTouchEnd` handlers; zero new dependencies.
- **dnd-kit compatibility preserved** — `touch-action: pan-y` on the swipe layer keeps vertical drag-to-reorder fully functional; `pointer-events: none` is applied to the dnd drag handle while a horizontal swipe is in progress.
- **New CSS classes** — `.swipe-container`, `.swipe-delete-bg`, `.swipe-delete-icon`, `.swipe-content` added to `src/styles.css`.

## [0.3.0] — 2026-05-13

### Fixed
- **Drag restored to original smooth full-row ghost** — reverted the compact pill ghost and `snapToCursorModifier` which introduced jankiness. The overlay is now the original full-width `<li>` row, which dnd-kit positions naturally using the grab offset. This feels smooth on both desktop and mobile.
- **Desktop drag fixed** — `PointerSensor` activation distance kept at 1 px (down from original 5 px) so drag starts immediately on first movement. This was the actual root cause of the original desktop issue — the ghost now locks to the cursor from the first pixel.
- **`user-select: none`** retained on todo items to prevent text selection during drag.

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
