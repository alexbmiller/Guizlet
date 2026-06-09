// Overpass API — fetch named streets within a bounding box.
//
// We query named highway ways of the classes Guizlet quizzes on and return an
// importance-ranked list. OSM commonly splits one road into many `way`
// segments that share a `name` (e.g. Marsh Lane = 200+ segments), so we MERGE
// all segments of a name into one multi-line geometry — otherwise a major road
// would be highlighted as a single block. Prominence is then ranked by the
// street's total extent (point count), not one segment's length.
//
// Gotchas:
//   - Overpass is a shared free service with real rate/load limits. It can
//     return 429 (too many requests) or 504/timeout under load, and can take
//     5–15s for larger areas. We surface friendly errors for these.
//   - We guard against absurdly large bboxes client-side ("zoom in") so we
//     don't hammer the service or freeze the browser parsing a huge response.

import { fetchWithTimeout } from './http.js'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const DEFAULT_TIMEOUT_MS = 30000 // Overpass itself can be slow
const QUERY_TIMEOUT_S = 25 // [timeout:] passed into the Overpass query

// Highway classes we quiz on, ranked by prominence (higher = more prominent).
// Scope: trunk/primary/secondary > tertiary > residential.
const HIGHWAY_RANK = {
  trunk: 5,
  primary: 4,
  secondary: 3,
  tertiary: 2,
  residential: 1,
}
const HIGHWAY_CLASSES = Object.keys(HIGHWAY_RANK)

// Refuse bboxes larger than this in either dimension (degrees). A dense city
// view is ~0.1°; 0.75° is "too zoomed out for a street quiz".
const MAX_BBOX_DEGREES = 0.75

/**
 * Build the Overpass QL query for named streets in a bbox.
 * @param {{minlat:number, minlon:number, maxlat:number, maxlon:number}} bbox
 * @returns {string}
 */
export function buildStreetsQuery(bbox) {
  const { minlat, minlon, maxlat, maxlon } = bbox
  const classes = HIGHWAY_CLASSES.join('|')
  // bbox filter order is (south,west,north,east) = (minlat,minlon,maxlat,maxlon)
  return [
    `[out:json][timeout:${QUERY_TIMEOUT_S}];`,
    `(`,
    `  way["highway"~"^(${classes})$"]["name"](${minlat},${minlon},${maxlat},${maxlon});`,
    `);`,
    `out geom;`,
  ].join('\n')
}

/**
 * Fetch and normalize named streets in a bbox. Each street's `segments` is a
 * multi-line: an array of polylines (one per merged OSM way), each a list of
 * [lat,lon] points. `points` is the total point count (an extent proxy).
 * @param {{minlat:number, minlon:number, maxlat:number, maxlon:number}} bbox
 * @param {{signal?: AbortSignal, timeoutMs?: number}} [opts]
 * @returns {Promise<Array<{name:string, segments:[number,number][][], points:number, highway:string, highwayRank:number, osmId:number}>>}
 */
export async function fetchStreets(bbox, opts = {}) {
  assertBboxSane(bbox)

  const query = buildStreetsQuery(bbox)

  let data
  try {
    const res = await fetchWithTimeout(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }).toString(),
      signal: opts.signal,
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    })

    if (res.status === 429) {
      throw new Error('Overpass is rate-limiting requests right now. Wait a few seconds and try again.')
    }
    if (res.status === 504) {
      throw new Error('Overpass timed out fetching this area. Try a smaller area.')
    }
    if (!res.ok) {
      throw new Error(`Overpass error (HTTP ${res.status}).`)
    }
    data = await res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw err
    if (err.name === 'TimeoutError') {
      throw new Error('Fetching streets timed out. Try a smaller area or try again.')
    }
    // Re-throw our own friendly errors as-is; wrap raw network failures.
    if (err.message?.startsWith('Overpass') || err.message?.startsWith('Fetching')) {
      throw err
    }
    throw new Error(`Could not reach Overpass. ${err.message}`)
  }

  const elements = Array.isArray(data?.elements) ? data.elements : []
  return mergeByName(elements)
}

// Merge all OSM way segments that share a name into one multi-line street.
function mergeByName(elements) {
  /** @type {Map<string, any>} */
  const byName = new Map()

  for (const el of elements) {
    if (el.type !== 'way' || !el.tags?.name || !Array.isArray(el.geometry)) {
      continue
    }
    const name = el.tags.name.trim()
    if (!name) continue

    const highway = el.tags.highway
    const highwayRank = HIGHWAY_RANK[highway] ?? 0
    const segment = el.geometry.map((p) => [p.lat, p.lon])

    let entry = byName.get(name)
    if (!entry) {
      entry = { name, segments: [], points: 0, highway, highwayRank, osmId: el.id }
      byName.set(name, entry)
    }

    entry.segments.push(segment)
    entry.points += segment.length
    // Track the highest highway class seen for this name (and a representative
    // osmId / label from that class).
    if (highwayRank > entry.highwayRank) {
      entry.highwayRank = highwayRank
      entry.highway = highway
      entry.osmId = el.id
    }
  }

  // Most prominent first: highway class, then total extent, then name.
  return [...byName.values()].sort(
    (a, b) =>
      b.highwayRank - a.highwayRank ||
      b.points - a.points ||
      a.name.localeCompare(b.name),
  )
}

function assertBboxSane(bbox) {
  const { minlat, minlon, maxlat, maxlon } = bbox ?? {}
  if (
    [minlat, minlon, maxlat, maxlon].some(
      (n) => typeof n !== 'number' || Number.isNaN(n),
    )
  ) {
    throw new Error('Invalid map area.')
  }
  if (maxlat - minlat > MAX_BBOX_DEGREES || maxlon - minlon > MAX_BBOX_DEGREES) {
    throw new Error('That area is too large. Zoom in and try again.')
  }
}
