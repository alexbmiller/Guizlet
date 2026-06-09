import { useMemo } from 'react'
import CardMap from './CardMap.jsx'
import ExplorerMap from './ExplorerMap.jsx'
import AnswerButton from './AnswerButton.jsx'
import FeedbackOverlay from './FeedbackOverlay.jsx'

// A single quiz card: two map panels (the static prompt + the interactive
// explorer) above the 2x2 multiple-choice grid. Presentational — session
// logic (scoring, advancing) lives in QuizView.
//
// `chosen` is the picked answer string once the user has answered, else null.
export default function QuizCard({ card, networkGeometries, chosen, onAnswer }) {
  const locked = chosen != null
  const result = locked ? (chosen === card.streetName ? 'correct' : 'wrong') : null

  // Bounds of the whole deck area (every street) — the explorer frames this so
  // the target is somewhere on the roamable map to be found.
  const areaBounds = useMemo(() => {
    let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity
    for (const [lat, lon] of [card.streetGeometry, ...networkGeometries].flat()) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
    }
    if (!Number.isFinite(minLat)) return null
    return [[minLat, minLon], [maxLat, maxLon]]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, networkGeometries])

  function stateFor(choice) {
    if (!locked) return 'idle'
    if (choice === chosen) return choice === card.streetName ? 'correct' : 'wrong'
    // Reveal the right answer when the user picked wrong.
    if (choice === card.streetName && chosen !== card.streetName) return 'reveal'
    return 'idle'
  }

  return (
    <div className="quizcard">
      <div className="quizcard__maps">
        <figure className="quizcard__panel">
          <CardMap
            cardId={card.id}
            streetGeometry={card.streetGeometry}
            networkGeometries={networkGeometries}
          />
          <figcaption className="quizcard__caption">The street to name</figcaption>
        </figure>

        <figure className="quizcard__panel">
          <ExplorerMap areaBounds={areaBounds} resetKey={card.id} />
          <figcaption className="quizcard__caption">
            Explore — find where it is
          </figcaption>
        </figure>
      </div>

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
