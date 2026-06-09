// Nominatim geocoding helpers — STUB.
//
// Future pass: given a place name or ZIP, hit Nominatim and return a bbox
// suitable for an Overpass query.
//
// Gotchas to respect when this is implemented (Nominatim usage policy):
//   - Max 1 request/second; absolutely no bulk/heavy use.
//   - A valid identifying User-Agent / Referer is REQUIRED.
//   - Cache results; debounce input. Consider the public instance only
//     for light demo use.

/**
 * Geocode a free-text place name or ZIP to a bounding box.
 * @param {string} _place
 * @returns {Promise<{south:number, west:number, north:number, east:number}>}
 */
export async function geocodePlace(_place) {
  throw new Error('geocodePlace: not implemented (stub)')
}
