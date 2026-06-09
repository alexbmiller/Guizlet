import PlaceSearch from './PlaceSearch.jsx'
import MapView from './MapView.jsx'

// Home screen: pick an area by typing a place/ZIP or by framing the map and
// hitting "Use this view". Existing decks are offered for quick resume.
export default function HomeView({
  query,
  onQueryChange,
  onSearch,
  center,
  zoom,
  onUseThisView,
  decks,
  onResume,
}) {
  return (
    <div className="home">
      <p className="home__lead">
        Pick an area to learn its streets. Type a place or ZIP, or frame the
        map and use the current view.
      </p>

      <PlaceSearch value={query} onChange={onQueryChange} onSubmit={onSearch} />

      <MapView center={center} zoom={zoom} onUseThisView={onUseThisView} />

      {decks.length > 0 && (
        <div className="home__decks">
          <h2 className="home__decks-title">Resume a deck</h2>
          <ul className="home__deck-list">
            {decks.map((d) => (
              <li key={d.areaKey}>
                <button
                  type="button"
                  className="home__deck"
                  onClick={() => onResume(d.areaKey)}
                >
                  <span className="home__deck-label">{d.label}</span>
                  <span className="home__deck-meta">{d.cardCount} cards</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
