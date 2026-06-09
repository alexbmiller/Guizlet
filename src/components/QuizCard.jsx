import CardMap from './CardMap.jsx'
import AnswerButton from './AnswerButton.jsx'
import FeedbackOverlay from './FeedbackOverlay.jsx'

// A single quiz card: the map prompt + the 2x2 multiple-choice grid.
// Presentational — session logic (scoring, advancing) lives in QuizView.
//
// `chosen` is the picked answer string once the user has answered, else null.
export default function QuizCard({ card, networkGeometries, chosen, onAnswer }) {
  const locked = chosen != null
  const result = locked ? (chosen === card.streetName ? 'correct' : 'wrong') : null

  function stateFor(choice) {
    if (!locked) return 'idle'
    if (choice === chosen) return choice === card.streetName ? 'correct' : 'wrong'
    // Reveal the right answer when the user picked wrong.
    if (choice === card.streetName && chosen !== card.streetName) return 'reveal'
    return 'idle'
  }

  return (
    <div className="quizcard">
      <CardMap
        cardId={card.id}
        streetGeometry={card.streetGeometry}
        networkGeometries={networkGeometries}
      />

      <h2 className="quizcard__question">What is the name of this street?</h2>

      <div className="quizcard__answers">
        {card.choices.map((choice) => (
          <AnswerButton
            key={choice}
            label={choice}
            state={stateFor(choice)}
            disabled={locked}
            onClick={() => onAnswer(choice)}
          />
        ))}
      </div>

      <div className="quizcard__feedback">
        <FeedbackOverlay result={result} correctAnswer={card.streetName} />
      </div>
    </div>
  )
}
