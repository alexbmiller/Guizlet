// One multiple-choice answer button.
//
// `state` drives the post-answer styling:
//   'idle'    — not yet answered (or this option wasn't involved)
//   'correct' — the chosen option, and it was right (green)
//   'wrong'   — the chosen option, and it was wrong (red)
//   'reveal'  — not chosen, but this is the correct answer (pulses green)
export default function AnswerButton({ label, state = 'idle', disabled, onClick }) {
  return (
    <button
      type="button"
      className={`answer answer--${state}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}
