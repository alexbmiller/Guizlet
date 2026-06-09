import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// CartoDB Positron (no labels) — monochrome base so street names can't be
// read off the tiles. Locked design decision.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '© OpenStreetMap contributors, © CARTO'

const GOLD = '#d4af37' // WitchTilt brand gold — the highlighted street
const NETWORK = '#8a8f98' // surrounding streets, visible but secondary

// Re-fit the view to the highlighted street whenever it changes.
function FitToStreet({ geometry, cardId }) {
  const map = useMap()
  useEffect(() => {
    if (!geometry?.length) return
    map.fitBounds(geometry, { padding: [28, 28], maxZoom: 17 })
  }, [map, cardId, geometry])
  return null
}

/**
 * The quiz card's map: the target street in gold over a gray, unlabeled
 * surrounding network on a monochrome base. Non-interactive (it's a prompt,
 * not a tool, and disabling pan/zoom keeps the focus on the highlighted road).
 *
 * @param {{
 *   cardId: string,
 *   streetGeometry: [number,number][],
 *   networkGeometries: [number,number][][],
 * }} props
 */
export default function CardMap({ cardId, streetGeometry, networkGeometries }) {
  return (
    <MapContainer
      className="cardmap"
      center={streetGeometry[0] ?? [0, 0]}
      zoom={15}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      {/* Surrounding network, unlabeled, drawn first (underneath). */}
      {networkGeometries.map((geom, i) => (
        <Polyline
          key={i}
          positions={geom}
          pathOptions={{ color: NETWORK, weight: 2, opacity: 0.7 }}
          interactive={false}
        />
      ))}

      {/* The street being quizzed, gold and thicker, on top. */}
      <Polyline
        positions={streetGeometry}
        pathOptions={{ color: GOLD, weight: 5, opacity: 1 }}
        interactive={false}
      />

      <FitToStreet geometry={streetGeometry} cardId={cardId} />
    </MapContainer>
  )
}
