// SM-2 spaced-repetition algorithm — STUB.
//
// Future pass: a small, pure implementation of SM-2. Given a card's
// current scheduling state and a quality grade (0–5) for the latest
// review, return the updated state (interval, repetition count, ease
// factor, and next due date).
//
// Keeping this pure (no storage, no clock side effects beyond an injected
// "now") makes it trivial to unit test and to drive from the useSM2 hook.

/**
 * @typedef {Object} CardState
 * @property {number} repetitions  Consecutive correct reviews.
 * @property {number} interval     Days until next review.
 * @property {number} easeFactor   SM-2 ease factor (>= 1.3).
 * @property {number} [dueAt]       Epoch ms when the card is next due.
 */

/** Sensible starting state for a brand-new card. */
export const INITIAL_CARD_STATE = {
  repetitions: 0,
  interval: 0,
  easeFactor: 2.5,
}

/**
 * Apply one SM-2 review to a card's state.
 * @param {CardState} _state Current scheduling state.
 * @param {number} _quality  Recall quality, 0 (blackout) to 5 (perfect).
 * @param {number} [_now]    Epoch ms "now" (injected for testability).
 * @returns {CardState} Updated scheduling state.
 */
export function review(_state, _quality, _now) {
  throw new Error('review: not implemented (stub)')
}
