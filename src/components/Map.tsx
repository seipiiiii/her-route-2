import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import type { CrimeRecord, CityId } from '../types/crime'
import type { RouteScore } from '../utils/routeScore'
import { CITIES } from '../utils/cityConfig'
import { computeStreetSegments, snapSegmentsToRoads, STREET_STYLES } from '../utils/streetLayer'
import type { StreetSegment } from '../utils/streetLayer'

const MAP_STYLES: google.maps.MapTypeStyle[] = []

// ─── Marker color per offense ─────────────────────────────────────────────────

function getMarkerColor(offenseGroup: string): string {
  const group = offenseGroup?.toLowerCase() || ''
  if (group.includes('assault') || group.includes('homicide')) return '#ef4444'
  if (group.includes('robbery') || group.includes('weapon'))   return '#f97316'
  if (group.includes('burglary') || group.includes('motor vehicle')) return '#eab308'
  if (group.includes('larceny') || group.includes('theft'))    return '#3b82f6'
  if (group.includes('drug'))  return '#a855f7'
  if (group.includes('sex'))   return '#ec4899'
  return '#64748b'
}

function makeMarkerIcon(color: string, selected: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: selected ? 8 : 5,
    fillColor: color,
    fillOpacity: 0.92,
    strokeColor: selected ? '#ffffff' : `${color}88`,
    strokeWeight: selected ? 2 : 1,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isLoaded: boolean
  loadError: Error | undefined
  city: CityId
  data: CrimeRecord[]
  selectedCrime: CrimeRecord | null
  onSelectCrime: (crime: CrimeRecord) => void
  routes?: google.maps.DirectionsRoute[]
  routeScores?: RouteScore[]
  selectedRouteIndex?: number
  pinMode?: 'none' | 'origin' | 'destination'
  originCoords?: google.maps.LatLngLiteral | null
  destCoords?: google.maps.LatLngLiteral | null
  onMapClick?: (coords: google.maps.LatLngLiteral) => void
  onPoiClick?: (info: { name: string; address: string; placeId: string; lat: number; lng: number }) => void
  showHeatmap?: boolean
  showPins?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Map({
  isLoaded, loadError,
  city,
  data, selectedCrime, onSelectCrime,
  routes = [], routeScores = [], selectedRouteIndex = 0,
  pinMode = 'none', originCoords, destCoords, onMapClick, onPoiClick,
  showHeatmap = false,
  showPins = true,
}: Props) {
  const mapRef              = useRef<google.maps.Map | null>(null)
  const polylineRefs        = useRef<google.maps.Polyline[]>([])
  const streetPolylineRefs  = useRef<google.maps.Polyline[]>([])
  const infoWindowRef       = useRef<google.maps.InfoWindow | null>(null)
  const heatmapRef          = useRef<google.maps.visualization.HeatmapLayer | null>(null)

  // ── Marker cluster refs ────────────────────────────────────────────────────
  const clustererRef        = useRef<MarkerClusterer | null>(null)
  const nativeMarkersRef    = useRef<globalThis.Map<string, google.maps.Marker>>(new globalThis.Map())

  // ── Stable callback refs (avoid stale closures in listeners) ──────────────
  const onPoiClickRef       = useRef(onPoiClick)
  const onSelectCrimeRef    = useRef(onSelectCrime)
  const selectedCrimeRef    = useRef(selectedCrime)
  useEffect(() => { onPoiClickRef.current    = onPoiClick    }, [onPoiClick])
  useEffect(() => { onSelectCrimeRef.current = onSelectCrime }, [onSelectCrime])
  useEffect(() => { selectedCrimeRef.current = selectedCrime }, [selectedCrime])

  const [zoom,   setZoom]   = useState(12)
  const [bounds, setBounds] = useState<google.maps.LatLngBounds | null>(null)
  const [snappedSegments, setSnappedSegments] = useState<StreetSegment[] | null>(null)

  const cityInfo = CITIES[city]

  // ── Map load ────────────────────────────────────────────────────────────────
  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map

    // POI click listener
    map.addListener('click', (e: google.maps.MapMouseEvent & { placeId?: string }) => {
      if (e.placeId && onPoiClickRef.current) {
        e.stop?.()
        const service = new google.maps.places.PlacesService(map)
        service.getDetails(
          { placeId: e.placeId, fields: ['name', 'formatted_address', 'geometry'] },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place && onPoiClickRef.current) {
              onPoiClickRef.current({
                name:    place.name || '',
                address: place.formatted_address || '',
                placeId: e.placeId!,
                lat:     place.geometry?.location?.lat() ?? 0,
                lng:     place.geometry?.location?.lng() ?? 0,
              })
            }
          },
        )
      }
    })
  }, [])

  // ── City change ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo(cityInfo.center)
      mapRef.current.setZoom(cityInfo.defaultZoom)
    }
  }, [city, cityInfo.center, cityInfo.defaultZoom])

  // ── onIdle: capture zoom + bounds after pan/zoom settles ───────────────────
  // Using onIdle instead of onZoomChanged/onBoundsChanged to reduce update frequency
  const onIdle = useCallback(() => {
    if (!mapRef.current) return
    setZoom(mapRef.current.getZoom() ?? 12)
    setBounds(mapRef.current.getBounds() ?? null)
  }, [])

  // ── Map click (pin mode) ───────────────────────────────────────────────────
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (pinMode !== 'none' && e.latLng && onMapClick) {
      onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    }
  }, [pinMode, onMapClick])

  // ── Routes ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    polylineRefs.current.forEach((p) => p.setMap(null))
    polylineRefs.current = []
    if (!isLoaded || !mapRef.current || routes.length === 0) return

    routes.forEach((route, index) => {
      const score     = routeScores.find((s) => s.index === index)
      const isSelected = index === selectedRouteIndex
      const color     = score?.color ?? '#94a3b8'
      const path      = google.maps.geometry?.encoding?.decodePath(route.overview_polyline)
        ?? route.overview_path

      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor:   color,
        strokeOpacity: isSelected ? 0.9 : 0.35,
        strokeWeight:  isSelected ? 6   : 3,
        map: mapRef.current!,
        zIndex: isSelected ? 10 : 1,
      })
      polylineRefs.current.push(polyline)
    })

    const selected = routes[selectedRouteIndex]
    if (selected && mapRef.current) {
      const b = new google.maps.LatLngBounds()
      selected.legs.forEach((leg) => {
        b.extend(leg.start_location)
        b.extend(leg.end_location)
      })
      mapRef.current.fitBounds(b, 80)
    }

    return () => { polylineRefs.current.forEach((p) => p.setMap(null)) }
  }, [isLoaded, routes, routeScores, selectedRouteIndex])

  // ── Street coloring (zoom ≥ 14, heatmap ON) ───────────────────────────────
  const streetSegments = useMemo(() => computeStreetSegments(data, 30, city), [data, city])

  useEffect(() => {
    setSnappedSegments(null)
    if (streetSegments.length === 0) return
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    if (!apiKey) return

    const controller = new AbortController()
    snapSegmentsToRoads(streetSegments, apiKey, city, controller.signal)
      .then((snapped) => { if (!controller.signal.aborted) setSnappedSegments(snapped) })
      .catch(() => {})
    return () => controller.abort()
  }, [streetSegments, city])

  const displaySegments = snappedSegments ?? streetSegments

  useEffect(() => {
    streetPolylineRefs.current.forEach((p) => p.setMap(null))
    streetPolylineRefs.current = []
    infoWindowRef.current?.close()

    if (!isLoaded || !mapRef.current || !showHeatmap || zoom < 14) return

    const infoWindow = infoWindowRef.current ?? (() => {
      const iw = new google.maps.InfoWindow({ disableAutoPan: true })
      infoWindowRef.current = iw
      return iw
    })()

    for (const seg of displaySegments) {
      const style = STREET_STYLES[seg.dangerLevel]
      const opts: google.maps.PolylineOptions = {
        path: seg.path,
        geodesic: true,
        strokeColor:   style.color,
        strokeOpacity: style.dashed ? 0 : style.opacity,
        strokeWeight:  style.weight,
        map: mapRef.current!,
        zIndex: seg.dangerLevel === 'high' ? 10 : seg.dangerLevel === 'medium' ? 9 : 8,
      }
      if (style.dashed) {
        opts.icons = [{
          icon: { path: 'M 0,-1 0,1', strokeOpacity: style.opacity, strokeColor: style.color, scale: style.weight },
          offset: '0', repeat: '12px',
        }]
      }
      const polyline = new google.maps.Polyline(opts)
      polyline.addListener('mouseover', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        infoWindow.setContent(
          `<div style="font-family:sans-serif;font-size:13px;color:#111827;padding:6px 2px;min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${seg.blockAddress}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${style.color}"></span>
              <span>${style.label}</span>
              <span style="margin-left:auto;font-weight:600">${seg.dangerScore}/100</span>
            </div>
            <div style="color:#6B7280;font-size:12px">インシデント: ${seg.crimeCount}件</div>
          </div>`,
        )
        infoWindow.setPosition(e.latLng)
        infoWindow.open(mapRef.current!)
      })
      polyline.addListener('mouseout', () => infoWindow.close())
      streetPolylineRefs.current.push(polyline)
    }

    return () => {
      streetPolylineRefs.current.forEach((p) => p.setMap(null))
      streetPolylineRefs.current = []
      infoWindowRef.current?.close()
    }
  }, [isLoaded, zoom, showHeatmap, displaySegments])

  // ── Heatmap ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    if (showHeatmap) {
      const points = data
        .map((r) => {
          const lat = parseFloat(r.latitude), lng = parseFloat(r.longitude)
          if (isNaN(lat) || isNaN(lng)) return null
          return new google.maps.LatLng(lat, lng)
        })
        .filter(Boolean) as google.maps.LatLng[]

      if (!heatmapRef.current) {
        heatmapRef.current = new google.maps.visualization.HeatmapLayer({
          data: points, map: mapRef.current, radius: 30, opacity: 0.7,
          gradient: [
            'rgba(0,0,255,0)', 'rgba(0,100,255,0.5)', 'rgba(0,200,200,0.7)',
            'rgba(0,255,100,0.8)', 'rgba(255,255,0,0.9)', 'rgba(255,100,0,1)', 'rgba(255,0,0,1)',
          ],
        })
      } else {
        heatmapRef.current.setData(points)
        heatmapRef.current.setMap(mapRef.current)
      }
    } else {
      heatmapRef.current?.setMap(null)
    }
    return () => { heatmapRef.current?.setMap(null) }
  }, [isLoaded, showHeatmap, data])

  // ── Native markers + MarkerClusterer ──────────────────────────────────────
  // Filter to viewport bounds and hide at zoom 14-16 (street lines take over)
  const viewportData = useMemo(() => {
    if (!showPins || !bounds) return []
    if (zoom >= 14 && zoom < 17) return []   // street lines visible, hide dots
    return data.filter((r) => {
      const lat = parseFloat(r.latitude)
      const lng = parseFloat(r.longitude)
      if (isNaN(lat) || isNaN(lng)) return false
      return bounds.contains({ lat, lng })
    })
  }, [data, bounds, showPins, zoom])

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return

    // Clear previous markers and clusterer
    clustererRef.current?.clearMarkers()
    nativeMarkersRef.current.forEach((m) => m.setMap(null))
    nativeMarkersRef.current.clear()

    if (viewportData.length === 0) return

    const markers: google.maps.Marker[] = []
    const selectedId = selectedCrimeRef.current?.offense_id

    viewportData.forEach((crime) => {
      const lat = parseFloat(crime.latitude)
      const lng = parseFloat(crime.longitude)
      if (isNaN(lat) || isNaN(lng)) return

      const color    = getMarkerColor(crime.offense_sub_category)
      const selected = crime.offense_id === selectedId
      const marker   = new google.maps.Marker({
        position: { lat, lng },
        icon: makeMarkerIcon(color, selected),
        title: crime.nibrs_offense_code_description,
        optimized: true,
      })
      marker.addListener('click', () => onSelectCrimeRef.current(crime))
      nativeMarkersRef.current.set(crime.offense_id, marker)
      markers.push(marker)
    })

    // Custom cluster renderer using brand color
    const renderer = {
      render({ count, position }: { count: number; position: google.maps.LatLng }) {
        const size = count > 100 ? 44 : count > 20 ? 36 : 28
        return new google.maps.Marker({
          position,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale:       size / 2,
            fillColor:   '#1D6B4F',
            fillOpacity: 0.88,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          label: {
            text:       count > 999 ? '999+' : String(count),
            color:      '#ffffff',
            fontSize:   count > 99 ? '10px' : '11px',
            fontWeight: 'bold',
          },
          zIndex: 1000 + count,
        })
      },
    }

    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map: mapRef.current!,
        markers,
        renderer,
      })
    } else {
      clustererRef.current.addMarkers(markers)
    }

    return () => {
      clustererRef.current?.clearMarkers()
      nativeMarkersRef.current.forEach((m) => m.setMap(null))
      nativeMarkersRef.current.clear()
    }
  }, [isLoaded, viewportData])

  // Update selected marker icon without rebuilding all markers
  useEffect(() => {
    nativeMarkersRef.current.forEach((marker, id) => {
      // Recover crime to get color — iterate viewportData
      // We stored title on marker; faster to keep a data map via closure
      // Simple approach: iterate and match by position key
      const isSelected = id === selectedCrime?.offense_id
      const currentIcon = marker.getIcon() as google.maps.Symbol | undefined
      if (!currentIcon) return
      const color = (currentIcon.fillColor as string) ?? '#64748b'
      marker.setIcon(makeMarkerIcon(color, isSelected))
      if (isSelected) marker.setZIndex(999)
    })
  }, [selectedCrime])

  // ── Error / loading ─────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-red-400 text-lg font-semibold">マップの読み込みに失敗しました</p>
          <p className="text-slate-400 text-sm mt-2">Google Maps API キーを確認してください</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-blue-400 mt-4 text-sm">マップを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 h-full relative ${pinMode !== 'none' ? 'cursor-crosshair' : ''}`}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={cityInfo.center}
        zoom={cityInfo.defaultZoom}
        onLoad={onLoad}
        onIdle={onIdle}
        onClick={handleMapClick}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: false,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          draggableCursor: pinMode !== 'none' ? 'crosshair' : undefined,
        }}
      >
        {/* 出発地ピン */}
        {originCoords && (
          <OverlayView position={originCoords} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div style={{ transform: 'translate(-50%, -100%)' }} className="flex flex-col items-center">
              <div className="bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">出発地</div>
              <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '10px solid #1D6B4F' }} />
            </div>
          </OverlayView>
        )}

        {/* 目的地ピン */}
        {destCoords && (
          <OverlayView position={destCoords} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div style={{ transform: 'translate(-50%, -100%)' }} className="flex flex-col items-center">
              <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">目的地</div>
              <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '10px solid #ef4444' }} />
            </div>
          </OverlayView>
        )}
      </GoogleMap>
    </div>
  )
}
