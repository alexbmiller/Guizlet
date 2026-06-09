// Overpass API — fetch named streets within a bounding box.
//
// We query named highway ways of the classes Guizlet quizzes on and return a
// deduplicated, importance-ranked list. OSM commonly splits one road into
// many `way` segments that share a `name`; we collapse those by name, keeping
// a single representative geometry (highest highway class, then longest).
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
 * Fetch and normalize named streets in a bbox.
 * @param {{minlat:number, minlon:number, maxlat:number, maxlon:number}} bbox
 * @param {{signal?: AbortSignal, timeoutMs?: number}} [opts]
 * @returns {Promise<Array<{name:string, geometry:[number,number][], highway:string, highwayRank:number, osmId:number}>>}
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
  return dedupeByName(elements)
}

// Collapse OSM way segments to one entry per street name.
function dedupeByName(elements) {
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
    const geometry = el.geometry.map((p) => [p.lat, p.lon])

    const existing = byName.get(name)
    if (!existing) {
      byName.set(name, { name, geometry, highway, highwayRank, osmId: el.id })
      continue
    }

    // Keep the higher-ranked class; tie-break on the longer geometry so the
    // representative segment is the most "drawable" one.
    const better =
      highwayRank > existing.highwayRank ||
      (highwayRank === existing.highwayRank &&
        geometry.length > existing.geometry.length)
    if (better) {
      byName.set(name, { name, geometry, highway, highwayRank, osmId: el.id })
    }
  }

  // Most prominent first; stable-ish tie-break by geometry length then name.
  return [...byName.values()].sort(
    (a, b) =>
      b.highwayRank - a.highwayRank ||
      b.geometry.length - a.geometry.length ||
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
