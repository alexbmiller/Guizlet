// Disambiguation dropdown for place search. Shows the candidate matches
// Nominatim returned so the user picks the right one (e.g. Carrollton's ZIP
// vs. the Paris arrondissement that also answers to "75007").
//
// `results` is null before any search, [] never (an empty match throws
// upstream and surfaces as `error`), or an array of PlaceCandidate.
export default function SearchResults({ searching, results, error, onPick }) {
  if (searching) {
    return (
      <div className="search-results search-results--status" role="status">
        <span className="spinner spinner--inline" aria-hidden="true" />
        Searching…
      </div>
    )
  }

  if (error) {
    return (
      <div className="search-results search-results--status search-results--error" role="alert">
        {error}
      </div>
    )
  }

  if (!results) return null

  return (
    <ul className="search-results" role="listbox" aria-label="Matching places">
      {results.map((place) => (
        <li key={place.placeId} role="option" aria-selected="false">
          <button
            type="button"
            className="search-results__item"
            onClick={() => onPick(place)}
          >
            <span className="search-results__label">{place.label}</span>
            <span className="search-results__kind">{place.kind}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
