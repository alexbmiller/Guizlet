// Persisted state via localStorage, with JSON (de)serialization and a robust
// fallback when storage is unavailable (private mode, quota, SSR).
//
// Also exports the plain read/write helpers, because some state (the active
// deck) is keyed dynamically by area and is easier to persist imperatively
// than through a hook whose key changes.

import { useCallback, useEffect, useRef, useState } from 'react'

/** Read+parse a JSON value from localStorage, or return `fallback`. */
export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** Serialize+write a JSON value. Returns false if storage threw (e.g. quota). */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Remove a key. */
export function removeJSON(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * useState mirrored to localStorage. Re-reads when `key` changes, writes on
 * every value change.
 * @template T
 * @param {string} key
 * @param {T | (() => T)} initialValue
 * @returns {[T, (v: T | ((prev: T) => T)) => void]}
 */
export function useLocalStorage(key, initialValue) {
  const resolveInitial = useCallback(
    () =>
      readJSON(
        key,
        typeof initialValue === 'function' ? initialValue() : initialValue,
      ),
    // initialValue is intentionally only read on (re)mount / key change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  const [value, setValue] = useState(resolveInitial)

  // Re-read when the key changes (the initializer only runs once otherwise).
  const firstKey = useRef(key)
  useEffect(() => {
    if (firstKey.current === key) return
    firstKey.current = key
    setValue(resolveInitial())
  }, [key, resolveInitial])

  useEffect(() => {
    writeJSON(key, value)
  }, [key, value])

  return [value, setValue]
}
