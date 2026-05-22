# Neo To-Do

Neo To-Do is a polished, minimal React todo app built with Vite. It supports local-only use, optional Supabase-backed Google sign-in with cloud sync, shareable links, and a clean responsive UI for desktop and mobile.

**Live app:** https://neo-todo-peach.vercel.app/

**Current release:** v0.4.4

## Features

- Add todos with the **Add** button or by pressing **Enter**
- Optional **Google sign-in** through Supabase Auth
- Signed-in users sync tasks and groups to Supabase Postgres
- Existing local tasks migrate to Supabase automatically on first sign-in when the cloud account is empty
- Mark tasks complete/incomplete from the checkbox-style toggle or task text
- Edit todo text inline
- Add **due date + time** and low/medium/high priority when creating a task
- Due date field uses `datetime-local` — pick both date and time in one step
- Optional browser notifications alert you when active tasks reach their due date
- **Click the priority badge on any task** to cycle through none → Low → Med → High inline
- **Click the due date on any task** to edit it inline (Safari-safe, shows full datetime picker)
- Time displayed on its own line below the date in accent colour for easy scanning
- Delete individual todos with undo support
- Clear all completed todos in one click with undo support
- Inline empty state when there are no tasks or groups
- Stats bar for total, active, and completed tasks
- Today's formatted date displayed in the header
- Create custom task groups with **+ New Group**
- Rename or delete groups; deleted-group tasks move back to **Ungrouped**
- Assign new tasks directly to a selected group from the add-task row
- View tasks in collapsible group sections with animated chevrons
- Keep unassigned tasks in the built-in **Ungrouped** section
- **Per-group sort toggle** — each group header has independent **↑ Oldest first** / **↓ Latest first** buttons to sort tasks by due date; groups can be sorted differently from each other
- Drag and drop tasks to reorder within a group
- Drag and drop tasks between groups, including the **Ungrouped** section
- Pointer, touch, and keyboard drag support via `@dnd-kit`
- **Compact drag ghost** centered under the cursor — shows task name, priority dot, and due date for context while reordering
- Persist todos and groups locally for anonymous use
- Persist todos and groups to Supabase for signed-in users
- **Share via Link** — encodes todos and groups into a compressed URL and optionally shortens it through the supported TinyURL API
  - Uses `lz-string` compression in the URL hash so shared todo state does not hit the server
  - Uses the Web Share API when available and falls back to clipboard copy or a manual-copy URL field
  - Falls back to the full compressed URL if TinyURL is unavailable or not configured
- Installable/offline-capable PWA via `vite-plugin-pwa`
- Accessible labels and keyboard-friendly controls
- Minimal UI dependencies — no component library
- Responsive UI with a clean, contemporary look
- Adapts to OS color scheme: light by default, dark in dark mode

## Screenshots

### Empty state

![Neo To-Do empty state](docs/screenshots/neo-todo-empty.png)

### Todo list with tasks

![Neo To-Do with sample tasks](docs/screenshots/neo-todo-with-tasks.png)

## Tech stack

- React 19
- Vite 8
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for drag-and-drop sorting and cross-group moves
- `@supabase/supabase-js` for Google SSO and cloud persistence
- `lz-string` for compact share-link payloads
- Vercel serverless function for TinyURL shortening through the authenticated TinyURL API
- `vite-plugin-pwa` for installable/offline support
- CSS custom properties for responsive light/dark theming
- Node's built-in test runner for utility tests
- ESLint for code quality
- GitHub Actions for CI
- Vercel for hosting

## Architecture

```text
.github/workflows/
  ci.yml                      # GitHub Actions: test, lint, build
api/
  shorten.js                  # Vercel serverless TinyURL API proxy with URL allow-listing
supabase/
  migrations/                 # Supabase migration files for GitHub/CLI deployments
  schema.sql                  # Supabase tables, indexes, and row-level security policies
src/
  App.jsx                     # Main todo/group state, persistence, sharing, and drag/drop orchestration
  dateFormatter.js            # Formats the header day/date label
  components/
    GroupSection.jsx          # Droppable, collapsible/renamable group sections with per-group sort
    ShareButton.jsx           # Share-link creation, Web Share API, clipboard, and manual fallback
    SortableTodoItem.jsx      # Draggable/sortable editable todo row powered by @dnd-kit
    Stats.jsx                 # Total / active / completed counters
  utils/
    dateInput.js              # datetime-local value helper (local-timezone aware)
    notifications.js          # Browser notification permission, scheduling, and delivery helpers
    shareUrl.js               # Encode/decode todo+group state to/from URL hash
    syncDecision.js           # Remote/local sync precedence helpers
    supabaseClient.js         # Supabase client and auth helpers
    supabaseTodoStore.js      # Supabase todo/group load and save helpers
    storage.js                # Safe localStorage read/write helpers
    todoState.js              # State validation, normalization, and ID helpers
tests/
  dateFormatter.test.js       # Date-formatting coverage
  dateInput.test.js           # Date input value helper coverage
  notifications.test.js       # Due notification scheduling coverage
  shareUrl.test.js            # Share payload coverage
  shorten.test.js             # Shortener API validation coverage
  syncDecision.test.js        # Supabase empty-state sync coverage
  todoState.test.js           # State normalizer coverage
```

## Getting started

Prerequisites:

- Node.js 24+
- npm

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

### Supabase Google sign-in

Neo To-Do works without Supabase, but Google sign-in and cloud sync require a Supabase project.

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations` through your Supabase GitHub integration or Supabase CLI.
   - If applying manually, run the equivalent `supabase/schema.sql` in Supabase SQL Editor.
3. In Supabase Auth providers, enable Google and add your Google OAuth client credentials.
4. In Supabase Auth URL configuration, add your local and production app URLs as allowed redirect URLs.
5. Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Restart the dev server after changing env vars.

### Share link shortening

The app can share full compressed links without any extra setup. To enable TinyURL shortening without the deprecated TinyURL endpoint, create a TinyURL API token and add it as a server-side environment variable:

```bash
TINYURL_API_TOKEN=your-tinyurl-api-token
```

On Vercel, add this under **Settings → Environment Variables**, then redeploy.

Run tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## CI

GitHub Actions runs on pushes and pull requests to `main`:

```bash
npm ci
npm test
npm run lint
npm run build
```

## Deployment

Neo To-Do is hosted on Vercel:

https://neo-todo-peach.vercel.app/

Production builds are generated with:

```bash
npm run build
```

The `api/shorten.js` serverless function is deployed automatically by Vercel alongside the static build.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## Notes

- Core todo and group management still works without a backend.
- Anonymous todos and groups are saved in the current browser/profile through `localStorage`.
- Signed-in todos and groups are saved to Supabase with row-level security policies scoped to the current user.
- Due task notifications are browser/device-local. The app schedules them while open and catches overdue tasks when reopened. Some mobile browsers only expose notifications after the app is installed/opened as a PWA.
- The date header uses `Intl.DateTimeFormat`, so output follows the user's runtime locale by default.
- Due date+time uses `hour12: true` so AM/PM is always shown regardless of OS locale.
- The share URL API (`/api/shorten`) requires Vercel or another compatible serverless environment.
- The shortener endpoint only accepts app share URLs to avoid becoming a public open-shortener proxy.

hello from antigravity
