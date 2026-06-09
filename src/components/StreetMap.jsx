import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// CartoDB Dark Matter (no labels) — dark monochrome base. No labels keeps the
// quiz fair; the dark base matches the app shell and gives the gold highlight
// (and the road network) much higher contrast than Positron did.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '© OpenStreetMap contributors, © CARTO'

const GOLD = '#d4af37' // WitchTilt brand gold — the highlighted street
const NETWORK = '#8a8f98' // surrounding streets, visible but secondary

// Normalize a geometry to multi-line shape: [[ [lat,lon], ... ], ...].
// New decks store segments (nested); old persisted decks stored a single flat
// polyline — wrap those so both render identically.
function toSegments(geom) {
  if (!Array.isArray(geom) || geom.length === 0) return []
  return Array.isArray(geom[0][0]) ? geom : [geom]
}

function flatten(segments) {
  const pts = []
  for (const seg of segments) for (const p of seg) pts.push(p)
  return pts
}

// Re-fit to the (whole, multi-segment) street whenever the card changes. Low
// maxZoom + generous padding keeps a few blocks of context around it.
function FitToStreet({ points, cardId }) {
  const map = useMap()
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [45, 45], maxZoom: 15 })
    // Re-fit on card change only; `points` is a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, cardId])
  return null
}

/**
 * A street map: the target street highlighted in gold (full extent, all merged
 * segments) over a gray unlabeled network on a monochrome base.
 *
 * `interactive` enables pan/zoom for the big "explorer" panel; left off it is a
 * static "question image" prompt. The tiles carry no labels, so panning the
 * interactive variant never reveals the answer.
 *
 * @param {{
 *   cardId: string,
 *   streetGeometry: [number,number][][] | [number,number][],
 *   networkGeometries: ([number,number][][] | [number,number][])[],
 *   interactive?: boolean,
 * }} props
 */
export default function StreetMap({
  cardId,
  streetGeometry,
  networkGeometries,
  interactive = false,
}) {
  const streetSegs = toSegments(streetGeometry)
  const networkSegs = networkGeometries.map(toSegments)
  const flat = flatten(streetSegs)

  return (
    <MapContainer
      className={`streetmap${interactive ? ' streetmap--interactive' : ''}`}
      center={flat[0] ?? [0, 0]}
      zoom={15}
      dragging={interactive}
      doubleClickZoom={interactive}
      scrollWheelZoom={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      zoomControl={interactive}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      {/* Surrounding network, unlabeled, drawn first (underneath). */}
      {networkSegs.map((segs, i) => (
        <Polyline
          key={i}
          positions={segs}
          pathOptions={{ color: NETWORK, weight: 2, opacity: 0.7 }}
          interactive={false}
        />
      ))}

      {/* The full street being quizzed, gold and thicker, on top. */}
      <Polyline
        positions={streetSegs}
        pathOptions={{ color: GOLD, weight: 5, opacity: 1 }}
        interactive={false}
      />

      <FitToStreet points={flat} cardId={cardId} />
    </MapContainer>
  )
}
