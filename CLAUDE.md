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
  components/
    HomeView.jsx        Area picker: search box + map + resume list
    PlaceSearch.jsx     Text input (place name / ZIP)
    MapView.jsx         Home map + "Use this view" (bounds capture)
    QuizView.jsx        Session container: SM-2 picking, scoring, persistence
    QuizCard.jsx        One card: two map panels + 2x2 answer grid + feedback
    SearchResults.jsx   Place-search disambiguation dropdown
    StreetMap.jsx       Dark Matter map; gold target + gray network (interactive flag)
    AnswerButton.jsx    One multiple-choice button (idle/correct/wrong/reveal)
    FeedbackOverlay.jsx Right/wrong banner
  hooks/
    useLocalStorage.js  Persisted state hook + readJSON/writeJSON/removeJSON
  utils/
    nominatim.js        geocodePlace(place) -> bbox
    overpass.js         fetchStreets(bbox) -> ranked, name-deduped streets
    cards.js            generateCards(streets) -> multiple-choice deck
    sm2.js              review() / pickNext() — pure SM-2 scheduler
    decks.js            Deck persistence + area-key slugs (built on the hook)
    http.js             fetchWithTimeout (abort-based timeout + signal chaining)
  styles/index.css
```
- `utils/` holds **pure, side-effect-light** functions so they're easy to test
  and reuse. SM-2 takes an injected `now` rather than reading the clock.
- Components stay thin; session logic lives in `QuizView`, data logic in
  `utils/`. App.jsx is the view-state machine
  (`home | loading | quiz | summary | error`).
- A deck is one localStorage blob per area, keyed `guizlet:deck:<areaKey>`,
  holding the generated cards + their live SM-2 state + timestamps. Searching
  or framing an area that already has a deck **resumes** it (no API calls).

## Gotchas
- **CORS preflight / identification** — in a browser you cannot set
  `User-Agent` on fetch, and any *custom* header (e.g. `X-Guizlet-Client`)
  makes the request non-"simple" and triggers a preflight `OPTIONS` that the
  public Nominatim endpoint does not reliably answer — which **breaks
  geocoding**. So we send **no custom headers**; the browser's automatic
  `User-Agent` + `Referer` satisfy the Nominatim policy for light demo use.
  Overpass is POSTed with `Content-Type: application/x-www-form-urlencoded`
  (a CORS-safelisted content type), so it also avoids a preflight. Both APIs
  return `Access-Control-Allow-Origin: *`.
- **Overpass needs a User-Agent from non-browsers** — Node/undici sends none
  by default, and Overpass replies **HTTP 406** to UA-less requests (Nominatim
  replies **403**). This only affects scripts/tests, not the browser. If you
  write a Node verification harness, inject a `User-Agent` header.
- **Overpass rate limits** — shared free service; can return 429 (rate-limit)
  or 504 (timeout) under load, and 5–15s latency for larger areas. Don't query
  on every keystroke/map move. We guard bboxes larger than 0.75° ("zoom in").
- **Nominatim usage policy** — max **1 req/sec**, no bulk use. Public instance,
  light demo use only.
- **Leaflet CSS** — `leaflet/dist/leaflet.css` must be imported (done in
  `MapView.jsx` and `CardMap.jsx`) or the map renders broken/grey.
- **Map instance access** — react-leaflet exposes the map only via `useMap()`
  from *inside* `<MapContainer>`. `MapView` bridges it out via a tiny child
  (`MapInstanceBridge`) so the "Use this view" button can read `getBounds()`.
  `CardMap` similarly uses an inner `useMap()` child to `fitBounds()`.
- **OSM splits roads by name** — one street is often many `way` segments.
  `overpass.js` dedupes by `name`, keeping the highest highway class (longest
  geometry as tie-break). Distractor quality depends on this.
- **Bbox order** — Nominatim `boundingbox` is `[south, north, west, east]`;
  Overpass bbox filter is `(south, west, north, east)`. Easy to transpose.
- **Default test bed** — Lewisville, TX (`[33.0462, -96.9942]`, zoom 14).

## Current scope
**Quiz mode is implemented end-to-end** (second pass):
- Pick an area by text search (Nominatim) or "Use this view" (map bounds).
  Text search is **search-then-pick**: submitting runs one Nominatim lookup
  and shows a dropdown of candidate places so the user disambiguates (e.g.
  "75007" matches both Carrollton, TX and Paris) — we never silently commit to
  the top hit. NOT keystroke autocomplete (the public Nominatim instance
  disallows per-keystroke querying); one request per submit.
- Overpass fetches named streets; deck = the 50 most prominent
  (trunk/primary/secondary > tertiary > residential), name-deduped.
- Multiple-choice cards (4 options, 1 correct, 3 plausible distractors — see
  the distractor heuristic in `cards.js`).
- **Two map panels** (`StreetMap`, one static + one `interactive`), stacked on
  mobile, side-by-side on desktop ≥640px (explorer gets the wider column):
  - The **question image** (static): target street in **gold (#d4af37)** over a
    gray unlabeled network on a dark CartoDB **Dark Matter** base (no labels;
    chosen over Positron for road contrast), framed with context (maxZoom 15 —
    not too tight).
  - The **explorer** (`interactive`): same highlighted street, pan/zoom enabled
    so you can see its full extent and roam. Both panels highlight the street
    (Trey wanted the highlight visible on the big map). Roaming is cheat-safe
    because the tiles carry no labels.
- **Full streets, not one block:** OSM splits a road into many same-name `way`
  segments; `overpass.js` merges them into a multi-line (`segments`) so the
  whole street highlights, and ranks prominence by total extent (`points`).
  `StreetMap.toSegments()` also wraps old single-line decks for back-compat.
- Immediate green/red feedback, correct answer revealed on a miss, 1.5s
  auto-advance. Binary right/wrong drives SM-2; a wrong answer reschedules in
  10 minutes. New decks have every card due immediately.
- Open-ended session with a "Card N of M" indicator and "End session";
  end-of-session summary shows "X / Y correct".
- Deck state (SM-2 + timestamps) persists to localStorage and survives reload;
  decks are listed on the home screen for one-click resume.

### Design decisions made mid-build (worth noting)
- **Distractor heuristic**: rank other street names by (1) shared final token
  / street-type suffix ("Lane", "St", "Pkwy"…) then (2) closeness in character
  length, take a candidate *window*, and randomly sample 3 (so repeat plays
  vary). On a real Lewisville deck this gives all-4-same-suffix on ~41/50 cards
  — e.g. "West Hebron Parkway" against other Parkways.
- **Resume semantics**: searching/framing an area that already has a deck
  resumes it rather than refetching, so progress isn't silently reset. There
  is intentionally no "force fresh deck" control yet.
- The first-pass `hooks/useSM2.js` stub was removed; SM-2 lives as pure
  functions in `utils/sm2.js` consumed directly by `QuizView`. Persistence is
  the new `hooks/useLocalStorage.js`.

**Deferred to v2:** other quiz modes (audio, free-text, autocomplete),
multi-area decks, difficulty tuning, accounts/sync/sharing, image map
scanning, polish (animations/transitions).

## Deployment
- **Host:** Vercel project `guizlet` (scope `alexbmillers-projects`), connected
  to the GitHub repo — pushes to `main` auto-deploy to production, PRs get
  preview deploys.
- **Domain:** `guizlet.witchtilt.com` (added in the Vercel project's Domains;
  point a **CNAME** `guizlet` → `cname.vercel-dns.com` at the `witchtilt.com`
  DNS provider). The default `guizlet.vercel.app` alias also stays live.
- **Build:** auto-detected **Vite** preset — build command `vite build`,
  output directory `dist`, install `npm install`. No `vercel.json` needed: the
  app is a single-page client bundle with no server routes or SPA rewrites.
- **Base path:** Vite `base` is left default `/` — we serve from a subdomain
  root, not a subpath. Don't set `base` unless that changes.
- **Mixed content:** all runtime endpoints are https (Nominatim, Overpass,
  CartoDB + OSM tiles, Google Fonts); keep them https or the deployed (https)
  site will block them.
- **No env vars / secrets** — everything is client-side against public OSM
  services.

## Conventions
- Keep this CLAUDE.md current with architecture + gotchas.
- **Conventional commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`,
  `test:`, `style:`) with verbose bodies explaining the *why* for non-trivial
  commits.
