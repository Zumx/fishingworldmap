'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { site } from '@/lib/site'
import type { PoiFeature } from '@/lib/data'

interface Props {
  features: PoiFeature[]
  selected: PoiFeature | null
  onSelect: (f: PoiFeature) => void
  /** When set, the map flies to fit these features (e.g. a country filter). */
  fitTo: PoiFeature[] | null
}

const M = site.marker

function poiIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:16px;height:16px;cursor:pointer;">
      <div style="position:absolute;inset:0;background:${M.dot};opacity:0.5;border-radius:50%;filter:blur(2.5px);"></div>
      <div style="position:absolute;inset:3px;background:${M.dot};border:1.8px solid ${M.ring};border-radius:50%;box-shadow:0 1px 2px rgba(20,20,20,0.4);"></div>
    </div>`,
    iconSize: [16, 16], iconAnchor: [8, 8],
  })
}

function makeClusterIcon(cluster: { getChildCount: () => number }) {
  const n = cluster.getChildCount()
  let size = 32
  let bg = M.cluster1
  if (n >= 100) { size = 52; bg = M.cluster3 }
  else if (n >= 25) { size = 42; bg = M.cluster2 }
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2px solid ${M.ring};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-sans),system-ui;font-size:${size >= 42 ? 14 : 12}px;font-weight:600;box-shadow:0 0 10px ${bg};">${n}</div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  })
}

export default function MapComponent({ features, selected, onSelect, fitTo }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const highlightRef = useRef<L.Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // Init map once.
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map('map-container', {
      center: [25, 5], zoom: 3,
      zoomControl: false,
      worldCopyJump: true,
      preferCanvas: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Rebuild cluster layer whenever the visible feature set changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (clusterRef.current) { map.removeLayer(clusterRef.current); clusterRef.current = null }

    const cluster = (L as unknown as { markerClusterGroup: (o: object) => L.MarkerClusterGroup }).markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      disableClusteringAtZoom: 13,
      iconCreateFunction: makeClusterIcon,
    })
    const icon = poiIcon()
    for (const f of features) {
      const [lng, lat] = f.geometry.coordinates
      if (typeof lat !== 'number' || typeof lng !== 'number') continue
      const m = L.marker([lat, lng], { icon })
      const p = f.properties
      m.on('click', () => onSelectRef.current(f))
      m.bindTooltip(
        `<b>${escapeHtml(p.name)}</b>${p.country ? `<br>${escapeHtml(p.country)}` : ''}`,
        { className: 'wm-tooltip', sticky: true },
      )
      cluster.addLayer(m)
    }
    cluster.addTo(map)
    clusterRef.current = cluster
  }, [features])

  // Fly to the country subset when a country filter is applied.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitTo || fitTo.length === 0) return
    const latlngs = fitTo
      .map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number])
      .filter(([la, ln]) => typeof la === 'number' && typeof ln === 'number')
    if (latlngs.length === 0) return
    map.fitBounds(L.latLngBounds(latlngs).pad(0.15), { maxZoom: 9, animate: true })
  }, [fitTo])

  // Pulse + recenter on the selected feature.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (highlightRef.current) { map.removeLayer(highlightRef.current); highlightRef.current = null }
    if (!selected) return
    const [lng, lat] = selected.geometry.coordinates
    const ring = L.divIcon({
      className: '',
      html: `<div class="wm-search-pulse"><span></span><span></span></div>`,
      iconSize: [40, 40], iconAnchor: [20, 20],
    })
    const m = L.marker([lat, lng], { icon: ring, interactive: false, keyboard: false, zIndexOffset: 800 })
    m.addTo(map)
    highlightRef.current = m
    map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { duration: 1.0 })
  }, [selected])

  return <div id="map-container" className="w-full h-full" />
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
