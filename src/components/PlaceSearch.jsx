// Text input for the "place name or ZIP → candidates" search. Submitting
// (Enter or the button) bubbles the raw string up; the parent runs the
// Nominatim lookup and shows matches in a dropdown for the user to pick.
export default function PlaceSearch({ value, onChange, onSubmit, loading }) {
  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed && !loading) onSubmit(trimmed)
  }

  return (
    <form className="place-search" onSubmit={handleSubmit}>
      <input
        type="text"
        className="place-search__input"
        placeholder="Enter a place name or ZIP (e.g. Carrollton, TX)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Place name or ZIP"
      />
      <button
        type="submit"
        className="place-search__submit"
        disabled={loading || !value.trim()}
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
