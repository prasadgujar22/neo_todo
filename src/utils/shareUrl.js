// Encode/decode todo state to/from a shareable URL hash
// Format: <origin>/<path>#share=<base64-encoded-json>

const SHARE_PARAM = 'share'

export function encodeTodos(todos) {
  const json = JSON.stringify(todos)
  // encodeURIComponent handles non-ASCII chars before btoa
  return btoa(encodeURIComponent(json))
}

export function decodeTodos(encoded) {
  try {
    const json = decodeURIComponent(atob(encoded))
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Returns todos from the URL hash if a share param is present, otherwise null. */
export function getSharedTodos() {
  const hash = window.location.hash.slice(1) // strip leading '#'
  const params = new URLSearchParams(hash)
  const encoded = params.get(SHARE_PARAM)
  if (!encoded) return null
  return decodeTodos(encoded)
}

/** Builds a full shareable URL encoding the given todos. */
export function buildShareUrl(todos) {
  const encoded = encodeTodos(todos)
  const url = new URL(window.location.href)
  // Use hash so the encoded state never hits the server
  url.hash = `${SHARE_PARAM}=${encoded}`
  return url.toString()
}
