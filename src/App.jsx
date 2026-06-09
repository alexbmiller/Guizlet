import { useState } from 'react'
import MapView from './components/MapView.jsx'
import PlaceSearch from './components/PlaceSearch.jsx'
import QuizMode from './components/QuizMode.jsx'

// Default test bed: Lewisville, TX.
const DEFAULT_CENTER = [33.0462, -96.9942]
const DEFAULT_ZOOM = 14

export default function App() {
  // Most recently captured map bounds from the "Use this view" button.
  // Not wired to anything yet — see scope brief in CLAUDE.md.
  const [bounds, setBounds] = useState(null)

  // Place name typed into the search box. Not wired to Nominatim yet.
  const [query, setQuery] = useState('')

  function handleUseThisView(mapBounds) {
    setBounds(mapBounds)
    // First-pass behavior: just log the bounds. Overpass wiring is a
    // follow-up pass.
    console.log('Use this view — current map bounds:', {
      south: mapBounds.getSouth(),
      west: mapBounds.getWest(),
      north: mapBounds.getNorth(),
      east: mapBounds.getEast(),
    })
  }

  function handleSearch(place) {
    // Not wired to Nominatim yet — log for now.
    console.log('Search submitted (not wired):', place)
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Guizlet</h1>
        <p className="app__tagline">Learn the streets of anywhere.</p>
      </header>

      <main className="app__main">
        <section className="app__panel">
          <PlaceSearch
            value={query}
            onChange={setQuery}
            onSubmit={handleSearch}
          />
          <MapView
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            onUseThisView={handleUseThisView}
          />
        </section>

        <QuizMode />
      </main>
    </div>
  )
}
