// Card generation — turn a ranked street list into multiple-choice cards.
//
// Each card: { id, streetName, streetGeometry, choices: [4 names] }.
// The correct answer is `streetName`; the UI compares the chosen choice to it.
//
// DISTRACTOR HEURISTIC (chosen to avoid trivial giveaways):
// For a target like "Cherrywood Lane" we want three plausible wrong answers,
// not "Main St" / "I-35" / "FM 407". We score every other street name by
//   (1) whether it shares the same final token / street-type suffix
//       ("Lane", "St", "Ave", "Dr"…), and
//   (2) how close it is in character length to the target.
// We then sample three from the closest-matching window (a window, not the
// strict top-3, so repeated plays vary). If the area is too sparse to fill the
// window we fall back to any remaining names. Correct-answer position is
// randomized across the four slots.

import { initialCardState } from './sm2.js'

export const DECK_CAP = 50
const CHOICE_COUNT = 4
const CANDIDATE_WINDOW = 14 // pool we sample distractors from

/**
 * Generate a capped, ranked deck of multiple-choice cards.
 * @param {Array<{name:string, geometry:[number,number][], highway:string, highwayRank:number, osmId:number}>} streets
 *   Expected pre-sorted by prominence (fetchStreets does this), but we don't rely on it.
 * @param {{cap?: number, now?: number}} [opts]
 * @returns {Array<{id:string, streetName:string, streetGeometry:[number,number][], choices:string[], highway:string, sm2:object}>}
 */
export function generateCards(streets, opts = {}) {
  const cap = opts.cap ?? DECK_CAP
  const now = opts.now ?? Date.now()

  // Unique by name, most prominent first.
  const ranked = [...streets].sort(
    (a, b) =>
      b.highwayRank - a.highwayRank ||
      b.geometry.length - a.geometry.length ||
      a.name.localeCompare(b.name),
  )

  // Distractors are drawn from the full set of names in the area (more
  // plausible neighbors), not only the capped deck.
  const allNames = [...new Set(ranked.map((s) => s.name))]

  if (allNames.length < CHOICE_COUNT) {
    throw new Error(
      'Not enough named streets in this area to build a quiz. Try a larger or denser area.',
    )
  }

  const deck = ranked.slice(0, cap)

  return deck.map((street) => {
    const distractors = pickDistractors(street.name, allNames)
    const choices = shuffle([street.name, ...distractors])
    return {
      id: String(street.osmId),
      streetName: street.name,
      streetGeometry: street.geometry,
      highway: street.highway,
      choices,
      sm2: initialCardState(now),
    }
  })
}

// --- distractor selection ------------------------------------------------

function pickDistractors(correctName, allNames) {
  const correctSuffix = lastToken(correctName)
  const correctLen = correctName.length

  const scored = allNames
    .filter((n) => n !== correctName)
    .map((n) => ({
      name: n,
      sameSuffix: lastToken(n) === correctSuffix ? 0 : 1, // 0 sorts first
      lenDiff: Math.abs(n.length - correctLen),
    }))
    .sort((a, b) => a.sameSuffix - b.sameSuffix || a.lenDiff - b.lenDiff)

  const window = scored.slice(0, Math.min(CANDIDATE_WINDOW, scored.length))
  const picked = sampleN(window, CHOICE_COUNT - 1).map((c) => c.name)

  // Sparse-area fallback: top up from anything left if the window was small.
  if (picked.length < CHOICE_COUNT - 1) {
    for (const c of scored) {
      if (picked.length >= CHOICE_COUNT - 1) break
      if (!picked.includes(c.name)) picked.push(c.name)
    }
  }
  return picked
}

// Final whitespace-delimited token, e.g. "Cherrywood Lane" -> "Lane".
function lastToken(name) {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1].toLowerCase()
}

// --- small array helpers (Math.random is fine in browser app code) -------

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sampleN(arr, n) {
  return shuffle(arr).slice(0, n)
}
