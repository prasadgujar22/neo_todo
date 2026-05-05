// Encode/decode todo state to/from a shareable URL hash
// Format: <origin>/<path>#share=<lz-compressed-uri-component>

import LZString from 'lz-string'

const SHARE_PARAM = 'share'

export function encodeTodos(todos) {
  // LZString.compressToEncodedURIComponent produces a URL-safe compressed string
  // (~56% smaller than plain base64 for typical todo payloads)
  return LZString.compressToEncodedURIComponent(JSON.stringify(todos))
}

export function decodeTodos(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
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
