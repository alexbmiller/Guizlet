// Overpass API helpers — STUB.
//
// Future pass: given a bbox, build and run an Overpass QL query that
// returns named streets (highway ways with a `name` tag) inside it.
//
// Gotchas to respect when this is implemented:
//   - Overpass is a shared free service with rate limits; debounce and
//     cache, never query on every keystroke or map move.
//   - Send a descriptive User-Agent / Referer where possible.
//   - Prefer the bbox filter and `[out:json]`; keep queries tight.

/**
 * Build an Overpass QL query string for named streets within a bbox.
 * @param {{south:number, west:number, north:number, east:number}} _bbox
 * @returns {string} Overpass QL query
 */
export function buildStreetsQuery(_bbox) {
  throw new Error('buildStreetsQuery: not implemented (stub)')
}

/**
 * Run an Overpass query and return the parsed JSON response.
 * @param {string} _query Overpass QL
 * @returns {Promise<object>}
 */
export async function runOverpassQuery(_query) {
  throw new Error('runOverpassQuery: not implemented (stub)')
}
