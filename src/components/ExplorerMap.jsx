import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Same monochrome, label-free base as the prompt so road shapes match 1:1.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '© OpenStreetMap contributors, © CARTO'

// Re-frame to the whole deck area when the card changes, so each new prompt
// starts a fresh hunt with the target somewhere in view.
function FitToArea({ bounds, resetKey }) {
  const map = useMap()
  useEffect(() => {
    if (!bounds) return
    map.fitBounds(bounds, { padding: [20, 20] })
    // Re-fit only on card change; `bounds` is a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, resetKey])
  return null
}

/**
 * Interactive, label-free map of the deck's area. Deliberately renders NO
 * highlight: the challenge is to pan/zoom and FIND the area that matches the
 * prompt image. Pairs with CardMap (the static prompt).
 *
 * @param {{ areaBounds: [[number,number],[number,number]]|null, resetKey: string }} props
 */
export default function ExplorerMap({ areaBounds, resetKey }) {
  const center = areaBounds
    ? [
        (areaBounds[0][0] + areaBounds[1][0]) / 2,
        (areaBounds[0][1] + areaBounds[1][1]) / 2,
      ]
    : [0, 0]

  return (
    <MapContainer className="explorermap" center={center} zoom={13} scrollWheelZoom>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitToArea bounds={areaBounds} resetKey={resetKey} />
    </MapContainer>
  )
}
