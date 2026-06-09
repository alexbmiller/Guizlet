import { useCallback, useEffect, useRef, useState } from 'react'
import HomeView from './components/HomeView.jsx'
import QuizView from './components/QuizView.jsx'
import { geocodePlace } from './utils/nominatim.js'
import { fetchStreets } from './utils/overpass.js'
import { generateCards } from './utils/cards.js'
import {
  areaKeyFromPlace,
  areaKeyFromBounds,
  loadDeck,
  saveDeck,
  makeDeck,
  listDecks,
} from './utils/decks.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'

// Default test bed: Lewisville, TX.
const DEFAULT_CENTER = [33.0462, -96.9942]
const DEFAULT_ZOOM = 14

// View states: 'home' | 'loading' | 'quiz' | 'summary' | 'error'.
export default function App() {
  const [view, setView] = useState('home')
  const [query, setQuery] = useState('')
  const [deck, setDeck] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingMsg, setLoadingMsg] = useState('')
  const [summary, setSummary] = useState(null)
  const [decks, setDecks] = useState(() => listDecks())

  // Remember the last area studied (a genuine, simple use of the hook).
  const [, setLastArea] = useLocalStorage('guizlet:lastArea', null)

  const abortRef = useRef(null)

  const refreshDecks = useCallback(() => setDecks(listDecks()), [])

  // Shared tail: fetch streets for a bbox, build + persist a deck, start quiz.
  const fetchAndStart = useCallback(
    async ({ areaKey, label, bbox, signal }) => {
      const streets = await fetchStreets(bbox, { signal })
      if (streets.length === 0) {
        throw new Error('No named streets found in this area. Try a larger or denser area.')
      }
      const now = Date.now()
      const cards = generateCards(streets, { now })
      const saved = saveDeck(makeDeck({ areaKey, label, cards, now }))
      setLastArea(areaKey)
      setDeck(saved)
      refreshDecks()
      setView('quiz')
    },
    [refreshDecks, setLastArea],
  )

  // Resume an existing deck without hitting the network.
  const resumeDeck = useCallback((areaKey) => {
    const existing = loadDeck(areaKey)
    if (!existing?.cards?.length) return false
    setDeck(existing)
    setView('quiz')
    return true
  }, [])

  // Text search: geocode -> bbox -> streets -> deck.
  const handleSearch = useCallback(
    async (place) => {
      const areaKey = areaKeyFromPlace(place)
      // Same place already studied? Resume instantly (no API calls).
      if (resumeDeck(areaKey)) return

      const controller = new AbortController()
      abortRef.current = controller
      setErrorMsg('')
      setLoadingMsg('Looking up that place…')
      setView('loading')
      try {
        const bbox = await geocodePlace(place, { signal: controller.signal })
        setLoadingMsg('Fetching streets… this can take a few seconds.')
        await fetchAndStart({ areaKey, label: bbox.label, bbox, signal: controller.signal })
      } catch (err) {
        handleFlowError(err)
      }
    },
    [fetchAndStart, resumeDeck],
  )

  // Map browse: current Leaflet bounds -> bbox -> streets -> deck.
  const handleUseThisView = useCallback(
    async (leafletBounds) => {
      const bbox = {
        minlat: leafletBounds.getSouth(),
        minlon: leafletBounds.getWest(),
        maxlat: leafletBounds.getNorth(),
        maxlon: leafletBounds.getEast(),
      }
      const areaKey = areaKeyFromBounds(bbox)
      if (resumeDeck(areaKey)) return

      const center = [
        (bbox.minlat + bbox.maxlat) / 2,
        (bbox.minlon + bbox.maxlon) / 2,
      ]
      const label = `Map view (${center[0].toFixed(3)}, ${center[1].toFixed(3)})`

      const controller = new AbortController()
      abortRef.current = controller
      setErrorMsg('')
      setLoadingMsg('Fetching streets… this can take a few seconds.')
      setView('loading')
      try {
        await fetchAndStart({ areaKey, label, bbox, signal: controller.signal })
      } catch (err) {
        handleFlowError(err)
      }
    },
    [fetchAndStart, resumeDeck],
  )

  function handleFlowError(err) {
    if (err?.name === 'AbortError') {
      setView('home')
      return
    }
    setErrorMsg(err?.message || 'Something went wrong. Please try again.')
    setView('error')
  }

  function cancelLoading() {
    abortRef.current?.abort()
    setView('home')
  }

  // Persist scheduling updates as the user answers.
  function handleDeckChange(updated) {
    setDeck(updated)
    saveDeck(updated)
  }

  function handleEndSession(result) {
    setSummary(result)
    refreshDecks()
    setView('summary')
  }

  function goHome() {
    setErrorMsg('')
    refreshDecks()
    setView('home')
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Guizlet</h1>
        <p className="app__tagline">Learn the streets of anywhere.</p>
      </header>

      <main className="app__main">
        {view === 'home' && (
          <HomeView
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            onUseThisView={handleUseThisView}
            decks={decks}
            onResume={resumeDeck}
          />
        )}

        {view === 'loading' && (
          <div className="status status--loading">
            <div className="spinner" aria-hidden="true" />
            <p>{loadingMsg}</p>
            <button type="button" className="btn-secondary" onClick={cancelLoading}>
              Cancel
            </button>
          </div>
        )}

        {view === 'quiz' && deck && (
          <QuizView
            deck={deck}
            onDeckChange={handleDeckChange}
            onEnd={handleEndSession}
          />
        )}

        {view === 'summary' && summary && (
          <div className="status status--summary">
            <h2>Session complete</h2>
            <p className="summary__score">
              {summary.correct} / {summary.answered} correct
            </p>
            <p className="summary__sub">
              {summary.answered === 0
                ? 'No cards answered this session.'
                : `${deck?.label ?? ''}`}
            </p>
            <button type="button" className="btn-primary" onClick={goHome}>
              Back to home
            </button>
          </div>
        )}

        {view === 'error' && (
          <div className="status status--error">
            <h2>Couldn’t start the quiz</h2>
            <p className="status__msg">{errorMsg}</p>
            <button type="button" className="btn-primary" onClick={goHome}>
              Back to home
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
