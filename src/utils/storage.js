import { useState } from 'react'

export function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`[storage] failed to write ${key}:`, error)
    return false
  }
}

export function useLocalStorageState(key, initializer) {
  const [state, setState] = useState(initializer)

  const setPersistedState = (updater) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      writeJsonStorage(key, next)
      return next
    })
  }

  return [state, setPersistedState]
}
