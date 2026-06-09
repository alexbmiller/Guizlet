import { useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Tiny helper that grabs the Leaflet map instance from context and hands
// it up to MapView. react-leaflet only exposes the map instance via the
// useMap() hook from inside <MapContainer>, so we bridge it out here.
function MapInstanceBridge({ onReady }) {
  const map = useMap()
  onReady(map)
  return null
}

export default function MapView({ center, zoom, onUseThisView }) {
  const [map, setMap] = useState(null)

  function handleUseThisView() {
    if (!map) return
    onUseThisView(map.getBounds())
  }

  return (
    <div className="mapview">
      <div className="mapview__toolbar">
        <button
          type="button"
          className="mapview__use-view"
          onClick={handleUseThisView}
          disabled={!map}
        >
          Use this view
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        className="mapview__map"
        scrollWheelZoom
      >
        <MapInstanceBridge onReady={setMap} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  )
}
