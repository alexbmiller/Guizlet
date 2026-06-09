# Guizlet

## Premise
Guizlet is a Quizlet-style spaced-repetition flashcard app for learning the
street names of a chosen geographic area. You pick a place (by typing a
name/ZIP or by panning a map), and the app auto-generates flashcards from the
named streets in that area, then drills you on them using spaced repetition.
It is fully client-side, no auth, no backend, and deploys to Vercel. Built as
a demo for a friend (Trey).

## Stack & architecture decisions (locked)
- **React + Vite** — SPA, no SSR. Fast dev server, simple Vercel deploy.
- **Leaflet + react-leaflet** — map display with free OpenStreetMap tiles.
- **Overpass API** — free, no auth. Queries OSM for named streets in a bbox.
- **Nominatim** — free OSM geocoder for "place name / ZIP → bbox".
- **SM-2 algorithm** — small custom JS implementation for scheduling reviews.
- **localStorage** — all state lives client-side; no database, no accounts.
- **Vercel** — deployment target.

Data flow (target): user picks an area (text → Nominatim → bbox, *or* map
"use this view" → current bounds) → Overpass query for named streets → cards →
SM-2 scheduling → quiz. Quiz mode: map highlights one street, user types/picks
the name.

> Don't add dependencies beyond the stack above without flagging why.

## File structure conventions
```
src/
  components/   React components (presentational + container)
  hooks/        Custom hooks (e.g. useSM2 — spaced-repetition deck state)
  utils/        Pure helpers (Overpass query builder, Nominatim wrapper, SM-2)
  styles/       CSS
```
- `utils/` holds **pure, side-effect-light** functions so they're easy to test
  and reuse. SM-2 takes an injected `now` rather than reading the clock.
- Components stay thin; logic lives in hooks/utils.
- Stubbed future modules throw `not implemented (stub)` with JSDoc describing
  the intended contract, so the wiring slots are visible.

## Gotchas
- **Overpass rate limits** — shared free service. Debounce/cache; never query
  on every keystroke or map move. Use `[out:json]`, keep queries tight.
- **Nominatim usage policy** — max **1 req/sec**, no bulk use, a valid
  identifying **User-Agent/Referer is required**. Cache + debounce. Public
  instance is for light demo use only.
- **Leaflet CSS** — `leaflet/dist/leaflet.css` must be imported (done in
  `MapView.jsx`) or the map renders broken/grey.
- **Map instance access** — react-leaflet exposes the map only via `useMap()`
  from *inside* `<MapContainer>`. `MapView` bridges it out via a tiny child
  (`MapInstanceBridge`) so the "Use this view" button can read `getBounds()`.
- **Default test bed** — Lewisville, TX (`[33.0462, -96.9942]`, zoom 14).

## Current scope
See the first-pass scope brief that initialized this project (the session
prompt). Summary of what exists now:
- Vite + React + Leaflet scaffold that runs via `npm run dev`.
- Map (OSM tiles, Lewisville default), an unwired place-search input, and a
  "Use this view" button that logs current map bounds to the console.
- Static placeholder UI for the future quiz mode.
- Clean stub slots: `utils/overpass.js`, `utils/nominatim.js`, `utils/sm2.js`,
  `hooks/useSM2.js`.

**Deferred to later passes:** real Overpass integration, real Nominatim
geocoding, SM-2 logic, quiz flow (highlight + answer checking), localStorage
persistence, Vercel deploy, styling beyond the minimum.

## Conventions
- Keep this CLAUDE.md current with architecture + gotchas.
- **Conventional commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`,
  `test:`, `style:`) with verbose bodies explaining the *why* for non-trivial
  commits.
