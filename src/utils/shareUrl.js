// Encode/decode todo state to/from a shareable URL hash
// Format: <origin>/<path>#share=<lz-compressed-uri-component>

import LZString from 'lz-string'
import { normalizeTodoState } from './todoState.js'

const SHARE_PARAM = 'share'

export function encodeTodoState(state) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(normalizeTodoState(state)))
}

export function decodeTodoState(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return normalizeTodoState(JSON.parse(json))
  } catch {
    return null
  }
}

// Backward-compatible names retained for older callers/tests.
export const encodeTodos = (todos) => encodeTodoState({ todos, groups: [] })
export const decodeTodos = (encoded) => decodeTodoState(encoded)?.todos ?? null

/** Returns todo state from the URL hash if a share param is present, otherwise null. */
export function getSharedTodoState() {
  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams(hash)
  const encoded = params.get(SHARE_PARAM)
  if (!encoded) return null
  return decodeTodoState(encoded)
}

/** Backward-compatible helper that returns only todos. */
export function getSharedTodos() {
  return getSharedTodoState()?.todos ?? null
}

/** Builds a full shareable URL encoding todos and groups. */
export function buildShareUrl(state) {
  const encoded = encodeTodoState(state)
  const url = new URL(window.location.href)
  url.hash = `${SHARE_PARAM}=${encoded}`
  return url.toString()
}
