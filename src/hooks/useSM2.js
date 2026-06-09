// useSM2 — React hook wrapping the SM-2 scheduler — STUB.
//
// Future pass: own a deck of cards in state, expose the next due card, and
// a grade(quality) function that advances scheduling via utils/sm2.js.
// Persistence will go through localStorage in a later pass.

import { review, INITIAL_CARD_STATE } from '../utils/sm2.js'

/**
 * Manage a spaced-repetition deck with SM-2 scheduling.
 * @param {Array} _initialCards
 * @returns {{
 *   currentCard: object|null,
 *   grade: (quality:number) => void,
 *   remaining: number,
 * }}
 */
export function useSM2(_initialCards = []) {
  // Reference the underlying scheduler so the wiring is visible even while
  // stubbed. Real implementation lands in a follow-up pass.
  void review
  void INITIAL_CARD_STATE

  throw new Error('useSM2: not implemented (stub)')
}
