// SM-2 spaced-repetition algorithm — minimal, pure implementation.
//
// Guizlet uses a BINARY right/wrong signal (multiple-choice quiz), not the
// classic 0–5 self-rating UX. We map that binary onto SM-2 quality grades:
//   correct -> q = 5 (perfect recall)
//   wrong   -> q = 2 (failed recall)
// and apply the standard SM-2 ease/interval update, with two Guizlet tweaks
// called out in the scope brief:
//   - a wrong answer reschedules the card after a SHORT 10-minute interval
//     (so the user sees it again this session), and
//   - ease has a hard floor of 1.3.
//
// Intervals are stored in MINUTES (not days) so the 10-minute lapse interval
// and the multi-day mature intervals share one unit. nextReview is epoch ms.
// `now` is injected for testability.

export const MIN_EASE = 1.3
const MS_PER_MIN = 60 * 1000
const MIN_PER_DAY = 24 * 60
const LAPSE_INTERVAL_MIN = 10 // wrong answer -> see again in 10 minutes

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * Fresh scheduling state for a brand-new card. New cards are due immediately
 * (nextReview = now), so a new area's first session surfaces every card.
 * @param {number} [now] Epoch ms.
 * @returns {{ease:number, interval:number, repetitions:number, nextReview:number, lastSeen:number|null}}
 */
export function initialCardState(now = Date.now()) {
  return {
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: now, // due immediately
    lastSeen: null,
  }
}

/**
 * Apply one review to a card's SM-2 state.
 * @param {object} state   Current scheduling state (see initialCardState).
 * @param {boolean} correct Whether the user answered correctly.
 * @param {number} [now]   Epoch ms "now".
 * @returns {object} Updated scheduling state.
 */
export function review(state, correct, now = Date.now()) {
  const quality = correct ? 5 : 2

  // Standard SM-2 ease update, floored at MIN_EASE.
  const ease = Math.max(
    MIN_EASE,
    state.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  )

  let repetitions
  let interval // minutes

  if (!correct) {
    // Lapse: reset the streak, show again soon.
    repetitions = 0
    interval = LAPSE_INTERVAL_MIN
  } else {
    repetitions = state.repetitions + 1
    if (repetitions === 1) {
      interval = MIN_PER_DAY // 1 day
    } else if (repetitions === 2) {
      interval = 6 * MIN_PER_DAY // 6 days
    } else {
      // Mature card: grow the previous interval by the ease factor.
      interval = Math.round(state.interval * ease)
    }
  }

  return {
    ease: round2(ease),
    interval,
    repetitions,
    nextReview: now + interval * MS_PER_MIN,
    lastSeen: now,
  }
}

/**
 * Choose the next card to show.
 * Priority: most-overdue DUE card, else the oldest UNSEEN card, else null.
 * @param {Array<{id:string, sm2:object}>} cards
 * @param {number} [now] Epoch ms.
 * @param {string|null} [excludeId] Card id to skip (e.g. the one just answered).
 * @returns {object|null}
 */
export function pickNext(cards, now = Date.now(), excludeId = null) {
  const pool = cards.filter((c) => c.id !== excludeId)

  // Due cards (nextReview in the past). Most overdue = smallest nextReview.
  const due = pool.filter((c) => c.sm2.nextReview <= now)
  if (due.length > 0) {
    return due.reduce((best, c) =>
      c.sm2.nextReview < best.sm2.nextReview ? c : best,
    )
  }

  // Otherwise the oldest never-seen card, in deck order.
  const unseen = pool.find((c) => c.sm2.lastSeen == null)
  return unseen ?? null
}

/** Count of cards currently due (handy for UI / session-end checks). */
export function dueCount(cards, now = Date.now()) {
  return cards.filter((c) => c.sm2.nextReview <= now).length
}
