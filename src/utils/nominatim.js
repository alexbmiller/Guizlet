// Nominatim geocoding — "place name or ZIP" -> bounding box.
//
// Usage policy (https://operations.osmfoundation.org/policies/nominatim/):
//   - Max 1 request/second, no bulk use.
//   - A valid identifying UA/Referer is required.
//
// GOTCHA (identification): browsers forbid setting the `User-Agent` request
// header from fetch(), and a *custom* header (e.g. `X-Guizlet-Client`) would
// make this a non-"simple" CORS request, forcing a preflight OPTIONS that the
// public Nominatim endpoint does not reliably answer — which would break
// geocoding in-browser. So we send NO custom headers: the browser supplies
// `User-Agent` and `Referer` automatically (our origin), which satisfies the
// usage policy for light demo use. USER_AGENT is kept as a documented
// constant for non-browser callers (tests/SSR) that can set it safely.
import { fetchWithTimeout } from './http.js'

export const USER_AGENT = 'Guizlet/0.1 (https://github.com/alexbmiller/Guizlet)'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const DEFAULT_TIMEOUT_MS = 15000

/**
 * Geocode a free-text place name or ZIP to a bounding box.
 * @param {string} place
 * @param {{signal?: AbortSignal, timeoutMs?: number}} [opts]
 * @returns {Promise<{minlat:number, minlon:number, maxlat:number, maxlon:number, center:[number,number], label:string}>}
 */
export async function geocodePlace(place, opts = {}) {
  const query = (place ?? '').trim()
  if (!query) {
    throw new Error('Enter a place name or ZIP to search.')
  }

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '0',
  })

  let data
  try {
    const res = await fetchWithTimeout(`${NOMINATIM_URL}?${params}`, {
      // `Accept` is CORS-safelisted, so no preflight is triggered.
      headers: { Accept: 'application/json' },
      signal: opts.signal,
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    })
    if (!res.ok) {
      throw new Error(`Geocoding service error (HTTP ${res.status}).`)
    }
    data = await res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw err
    if (err.name === 'TimeoutError') {
      throw new Error('Geocoding timed out. Please try again.')
    }
    // Network / parse failures land here.
    throw new Error(`Could not reach the geocoding service. ${err.message}`)
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No place found for "${query}". Try a different search.`)
  }

  const hit = data[0]
  // Nominatim boundingbox is [south, north, west, east] as strings.
  const [south, north, west, east] = hit.boundingbox.map(Number)
  return {
    minlat: south,
    minlon: west,
    maxlat: north,
    maxlon: east,
    center: [Number(hit.lat), Number(hit.lon)],
    label: hit.display_name,
  }
}
