// Placeholder for the future quiz mode: a map with one street highlighted
// where the user types or selects the name. Static stub only this pass —
// see CLAUDE.md scope brief. No SM-2, no map highlighting, no answer
// checking yet.
export default function QuizMode() {
  return (
    <section className="quiz" aria-label="Quiz mode (coming soon)">
      <h2 className="quiz__title">Quiz mode</h2>
      <p className="quiz__coming-soon">Coming soon</p>

      <div className="quiz__stub">
        <div className="quiz__map-placeholder">
          <span>Highlighted street will appear here</span>
        </div>
        <div className="quiz__answer-placeholder">
          <input
            type="text"
            placeholder="Type the street name…"
            disabled
            aria-label="Street name answer (disabled stub)"
          />
          <button type="button" disabled>
            Check
          </button>
        </div>
      </div>
    </section>
  )
}
