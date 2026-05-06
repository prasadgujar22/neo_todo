# Neo To-Do (Vite + React)

Neo To-Do is a polished, minimal React todo app built with Vite. It persists state to localStorage, supports shareable links, and provides a clean, responsive UI for desktop and mobile.

**Live app:** https://neo-todo-peach.vercel.app/

## Getting Started

```bash
npm install       # install dependencies
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview production build
npm test          # run tests
```

## Features

- Add todos, toggle complete, delete, and clear completed
- Inline empty state when no todos exist
- Stats bar: total, active, completed
- Today's date displayed in the header
- Persist todos to `localStorage`
- **Share via Link** — encodes your list into a compressed, shortened URL (via TinyURL serverless proxy) that anyone can open to see your todos
  - Uses `lz-string` compression (~56% smaller than plain JSON) in the URL hash so state never hits the server
  - Falls back to clipboard copy when the Web Share API is unavailable
- Accessible labels and keyboard-friendly controls (Enter to add; toggle with click, keyboard, or select)
- Minimal dependencies — no UI libraries
- Responsive UI with a clean, contemporary look
- Adapts to OS color scheme: light by default, dark in dark mode

## Architecture

| Path | Purpose |
|------|---------|
| `src/` | React app source |
| `src/components/` | `TodoItem`, `TodoList`, `Stats`, `ShareButton` |
| `src/utils/shareUrl.js` | Encode/decode todo state to/from URL hash |
| `api/shorten.js` | Vercel serverless function — proxies TinyURL to avoid CORS |
| `tests/` | Node built-in test runner suite |

## Deployment

Hosted on Vercel: https://neo-todo-peach.vercel.app/

The `api/shorten.js` serverless function is deployed automatically by Vercel alongside the static build.

## Screenshots

### Empty state

![Neo To-Do empty state](docs/screenshots/neo-todo-empty.png)

### Todo list with tasks

![Neo To-Do with sample tasks](docs/screenshots/neo-todo-with-tasks.png)

## Notes

- Local, self-contained app — no backend required for core functionality.
- The share URL API (`/api/shorten`) requires a Vercel (or compatible) serverless environment.
