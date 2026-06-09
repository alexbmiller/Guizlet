import { useEffect, useMemo, useRef, useState } from 'react'
import QuizCard from './QuizCard.jsx'
import { review, pickNext } from '../utils/sm2.js'

const ADVANCE_MS = 1500 // auto-advance delay after answering

/**
 * Drives a quiz session over a deck: picks cards via SM-2, scores answers,
 * shows immediate feedback, auto-advances, and persists scheduling updates.
 *
 * @param {{
 *   deck: object,
 *   onDeckChange: (deck: object) => void,  // persist updated deck
 *   onEnd: (summary: {answered:number, correct:number, total:number}) => void,
 * }} props
 */
export default function QuizView({ deck, onDeckChange, onEnd }) {
  // Pick the opening card once.
  const [currentId, setCurrentId] = useState(() => pickNext(deck.cards)?.id ?? null)
  const [chosen, setChosen] = useState(null)
  const [stats, setStats] = useState({ answered: 0, correct: 0 })
  const timerRef = useRef(null)

  // Clear any pending auto-advance on unmount.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const currentCard = deck.cards.find((c) => c.id === currentId) ?? null

  // Surrounding network = every other card's geometry (current is drawn gold
  // on top by CardMap). Recomputed only when the current card changes.
  const networkGeometries = useMemo(
    () =>
      deck.cards
        .filter((c) => c.id !== currentId)
        .map((c) => c.streetGeometry),
    [deck.cards, currentId],
  )

  function handleAnswer(choice) {
    if (chosen != null || !currentCard) return // ignore double taps
    setChosen(choice)

    const isCorrect = choice === currentCard.streetName
    const answered = stats.answered + 1
    const correct = stats.correct + (isCorrect ? 1 : 0)
    setStats({ answered, correct })

    timerRef.current = setTimeout(() => {
      const now = Date.now()
      const updatedCards = deck.cards.map((c) =>
        c.id === currentCard.id ? { ...c, sm2: review(c.sm2, isCorrect, now) } : c,
      )
      onDeckChange({ ...deck, cards: updatedCards, updatedAt: now })

      const next = pickNext(updatedCards, now, currentCard.id)
      if (next) {
        setCurrentId(next.id)
        setChosen(null)
      } else {
        onEnd({ answered, correct, total: deck.cards.length })
      }
    }, ADVANCE_MS)
  }

  function handleEndSession() {
    clearTimeout(timerRef.current)
    onEnd({ ...stats, total: deck.cards.length })
  }

  if (!currentCard) {
    // Nothing due/unseen — shouldn't happen on a fresh deck, but end cleanly.
    return null
  }

  const cardNumber = Math.min(stats.answered + 1, deck.cards.length)

  return (
    <section className="quizview">
      <header className="quizview__bar">
        <div className="quizview__progress">
          <span className="quizview__count">
            Card {cardNumber} of {deck.cards.length}
          </span>
          <span className="quizview__area">{deck.label}</span>
        </div>
        <button
          type="button"
          className="quizview__end"
          onClick={handleEndSession}
        >
          End session
        </button>
      </header>

      <QuizCard
        card={currentCard}
        networkGeometries={networkGeometries}
        chosen={chosen}
        onAnswer={handleAnswer}
      />
    </section>
  )
}
