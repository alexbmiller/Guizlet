// Text input for "place name or ZIP → bbox" flow.
// Not wired to Nominatim yet — onSubmit just bubbles the raw string up.
export default function PlaceSearch({ value, onChange, onSubmit }) {
  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <form className="place-search" onSubmit={handleSubmit}>
      <input
        type="text"
        className="place-search__input"
        placeholder="Enter a place name or ZIP (e.g. Lewisville, TX)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Place name or ZIP"
      />
      <button type="submit" className="place-search__submit">
        Search
      </button>
    </form>
  )
}
