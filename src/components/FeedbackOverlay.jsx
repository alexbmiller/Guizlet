// Small right/wrong banner shown over the answer grid after a choice.
// `result` is 'correct' | 'wrong' | null (hidden).
export default function FeedbackOverlay({ result, correctAnswer }) {
  if (!result) return null
  const isCorrect = result === 'correct'
  return (
    <div className={`feedback feedback--${result}`} role="status">
      <span className="feedback__mark">{isCorrect ? '✓' : '✗'}</span>
      <span className="feedback__text">
        {isCorrect ? 'Correct' : `Answer: ${correctAnswer}`}
      </span>
    </div>
  )
}
