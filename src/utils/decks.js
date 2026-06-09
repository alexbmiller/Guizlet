// Deck persistence — one localStorage blob per area, keyed by a stable slug.
//
// A persisted deck holds the generated cards plus their live SM-2 state and
// timestamps, so a session can be resumed across reloads without re-hitting
// the APIs. Key shape: `guizlet:deck:<areaKey>`.

import { readJSON, writeJSON, removeJSON } from '../hooks/useLocalStorage.js'

const DECK_PREFIX = 'guizlet:deck:'

/** Slugify a place label, e.g. "Lewisville, TX" -> "lewisville-tx". */
export function areaKeyFromPlace(label) {
  const slug = (label ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  return slug || 'area'
}

/** Stable key for an ad-hoc "Use this view" area, from its center. */
export function areaKeyFromBounds(bbox) {
  const lat = ((bbox.minlat + bbox.maxlat) / 2).toFixed(3)
  const lon = ((bbox.minlon + bbox.maxlon) / 2).toFixed(3)
  return `view-${lat}-${lon}`
}

function deckStorageKey(areaKey) {
  return `${DECK_PREFIX}${areaKey}`
}

/** Load a persisted deck, or null. */
export function loadDeck(areaKey) {
  return readJSON(deckStorageKey(areaKey), null)
}

/** Persist a deck (stamps updatedAt). Returns the saved object. */
export function saveDeck(deck) {
  const stamped = { ...deck, updatedAt: deck.updatedAt ?? deck.createdAt }
  writeJSON(deckStorageKey(deck.areaKey), stamped)
  return stamped
}

/** Delete a deck. */
export function deleteDeck(areaKey) {
  removeJSON(deckStorageKey(areaKey))
}

/**
 * Build a fresh deck record around generated cards.
 * @param {{areaKey:string, label:string, cards:Array, now:number}} args
 */
export function makeDeck({ areaKey, label, cards, now }) {
  return {
    areaKey,
    label,
    createdAt: now,
    updatedAt: now,
    cards,
  }
}

/**
 * List persisted decks as light summaries (no card payloads), newest first.
 * Scans localStorage for our prefix.
 */
export function listDecks() {
  const summaries = []
  let count = 0
  try {
    count = localStorage.length
  } catch {
    return summaries
  }
  for (let i = 0; i < count; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(DECK_PREFIX)) continue
    const deck = readJSON(key, null)
    if (!deck?.areaKey) continue
    summaries.push({
      areaKey: deck.areaKey,
      label: deck.label,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt ?? deck.createdAt,
      cardCount: Array.isArray(deck.cards) ? deck.cards.length : 0,
    })
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt)
}
