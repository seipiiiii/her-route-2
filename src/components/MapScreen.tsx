import { useState, useMemo, useRef } from 'react'
import { Map } from './Map'
import { RoutePanel } from './RoutePanel'
import type { CrimeRecord, CityId, BookmarkItem } from '../types/crime'
import type { RouteScore } from '../utils/routeScore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isLoaded: boolean
  loadError: Error | undefined
  city: CityId
  data: CrimeRecord[]
  loading: boolean
  error: string | null
  selectedCrime: CrimeRecord | null
  onSelectCrime: (crime: CrimeRecord) => void
  routes: google.maps.DirectionsRoute[]
  routeScores: RouteScore[]
  selectedRouteIndex: number
  onRoutesReady: (routes: google.maps.DirectionsRoute[], scores: RouteScore[], idx: number) => void
  onRouteClear: () => void
  pinMode: 'none' | 'origin' | 'destination'
  onPinModeChange: (mode: 'none' | 'origin' | 'destination') => void
  originCoords: google.maps.LatLngLiteral | null
  destCoords: google.maps.LatLngLiteral | null
  onOriginCoordsChange: (c: google.maps.LatLngLiteral | null) => void
  onDestCoordsChange: (c: google.maps.LatLngLiteral | null) => void
  showHeatmap: boolean
  onHeatmapToggle: () => void
  onAddBookmark: (item: Omit<BookmarkItem, 'id' | 'addedAt'>) => void
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTER_CHIPS = [
  { id: 'ALL',      label: 'すべて' },
  { id: 'ASSAULT',  label: '暴行' },
  { id: 'ROBBERY',  label: '強盗' },
  { id: 'THEFT',    label: '窃盗' },
  { id: 'BURGLARY', label: '空き巣' },
  { id: 'DRUG',     label: '薬物' },
  { id: 'SEX',      label: '性犯罪' },
  { id: 'WEAPON',   label: '武器' },
]

function matchesChip(r: CrimeRecord, chipId: string): boolean {
  if (chipId === 'ALL') return true
  const sub = (r.offense_sub_category || '').toUpperCase()
  const cat = (r.offense_category    || '').toUpperCase()
  switch (chipId) {
    case 'ASSAULT':  return cat.includes('VIOLENT') || sub.includes('ASSAULT') || sub.includes('HOMICIDE') || sub.includes('AGGRAVATED')
    case 'ROBBERY':  return sub.includes('ROBBERY')
    case 'THEFT':    return sub.includes('LARCENY') || sub.includes('THEFT') || sub.includes('MOTOR VEHICLE')
    case 'BURGLARY': return sub.includes('BURGLARY')
    case 'DRUG':     return sub.includes('NARCOTIC') || sub.includes('DRUG')
    case 'SEX':      return sub.includes('SEX')
    case 'WEAPON':   return sub.includes('WEAPON')
    default:         return true
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 0) return '今'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  return `${Math.floor(days / 7)}週間前`
}

// Haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

// Seattle center as reference point
const SEATTLE_CENTER = { lat: 47.6062, lng: -122.3321 }

// ─── Incident icon + color per category ──────────────────────────────────────

interface IncidentStyle {
  label: string
  iconBg: string    // tailwind bg classes
  iconColor: string // tailwind text classes
  distColor: string // hex for distance text
  icon: React.ReactNode
}

function getIncidentStyle(r: CrimeRecord): IncidentStyle {
  const sub = (r.offense_sub_category || '').toUpperCase()
  const cat = (r.offense_category    || '').toUpperCase()

  // Assault / violent
  if (cat.includes('VIOLENT') || sub.includes('ASSAULT') || sub.includes('AGGRAVATED') || sub.includes('HOMICIDE')) {
    return {
      label: sub.includes('HOMICIDE') ? '殺人事件' : '暴行事件',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
      distColor: '#ef4444',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    }
  }
  // Robbery
  if (sub.includes('ROBBERY')) {
    return {
      label: '強盗事件',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
      distColor: '#f97316',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    }
  }
  // Burglary
  if (sub.includes('BURGLARY')) {
    return {
      label: '空き巣',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
      distColor: '#f97316',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    }
  }
  // Theft / motor vehicle
  if (sub.includes('LARCENY') || sub.includes('THEFT') || sub.includes('MOTOR VEHICLE')) {
    return {
      label: sub.includes('MOTOR VEHICLE') ? '車上荒らし' : '窃盗事件',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-500',
      distColor: '#f59e0b',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
    }
  }
  // Drug
  if (sub.includes('DRUG') || sub.includes('NARCOTIC')) {
    return {
      label: '薬物事件',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-500',
      distColor: '#a855f7',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    }
  }
  // Sex offenses
  if (sub.includes('SEX')) {
    return {
      label: '性犯罪',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-500',
      distColor: '#ec4899',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    }
  }
  // Weapon
  if (sub.includes('WEAPON')) {
    return {
      label: '武器事件',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-400',
      distColor: '#ef4444',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    }
  }
  // Default
  return {
    label: r.offense_sub_category || 'インシデント',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-400',
    distColor: '#9ca3af',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const EyeOnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const BookmarkPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    <line x1="12" y1="7" x2="12" y2="13" />
    <line x1="9" y1="10" x2="15" y2="10" />
  </svg>
)

const LocationPinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

// ─── Route Search Top Sheet ───────────────────────────────────────────────────

interface RouteSheetProps {
  onClose: () => void
  crimes: CrimeRecord[]
  isLoaded: boolean
  pinMode: 'none' | 'origin' | 'destination'
  onPinModeChange: (m: 'none' | 'origin' | 'destination') => void
  originCoords: google.maps.LatLngLiteral | null
  destCoords: google.maps.LatLngLiteral | null
  onOriginCoordsChange: (c: google.maps.LatLngLiteral | null) => void
  onDestCoordsChange: (c: google.maps.LatLngLiteral | null) => void
  onRoutesReady: (routes: google.maps.DirectionsRoute[], scores: RouteScore[], idx: number) => void
  onClear: () => void
}

function RouteSearchTopSheet({ onClose, ...p }: RouteSheetProps) {
  return (
    <div className="absolute inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className="absolute top-0 left-0 right-0 bg-white rounded-b-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-y-auto"
        style={{ maxHeight: '72%' }}
      >
        <div className="flex items-center justify-between px-5 pt-14 pb-3">
          <h2 className="text-[17px] font-bold text-gray-900">ルート検索</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 active:scale-95"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="px-5 pb-8">
          <RoutePanel
            crimes={p.crimes}
            isLoaded={p.isLoaded}
            pinMode={p.pinMode}
            onPinModeChange={p.onPinModeChange}
            originCoords={p.originCoords}
            destCoords={p.destCoords}
            onOriginCoordsChange={p.onOriginCoordsChange}
            onDestCoordsChange={p.onDestCoordsChange}
            onRoutesReady={p.onRoutesReady}
            onClear={p.onClear}
          />
        </div>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
      </div>
    </div>
  )
}

// ─── POI Place Card Sheet ─────────────────────────────────────────────────────

interface PlaceInfo {
  name: string
  address: string
  placeId: string
  lat: number
  lng: number
}

interface PlaceCardProps {
  place: PlaceInfo
  onClose: () => void
  onAddBookmark: (item: Omit<BookmarkItem, 'id' | 'addedAt'>) => void
  bookmarked: boolean
}

function PlaceCardSheet({ place, onClose, onAddBookmark, bookmarked }: PlaceCardProps) {
  return (
    <div className="bg-white rounded-t-[28px] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] px-5 pt-3 pb-6">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-green-50 text-green-500 flex items-center justify-center flex-shrink-0">
          <LocationPinIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-bold text-[15px] leading-snug">{place.name}</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-snug">{place.address}</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 active:bg-gray-200 flex-shrink-0"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="mt-4">
        <button
          onClick={() => {
            if (!bookmarked) onAddBookmark({ name: place.name, address: place.address, placeId: place.placeId, lat: place.lat, lng: place.lng })
            onClose()
          }}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
            bookmarked ? 'bg-gray-100 text-gray-400' : 'bg-green-500 text-white shadow-sm'
          }`}
        >
          <BookmarkPlusIcon />
          {bookmarked ? 'ブックマーク済み' : 'ブックマークに追加'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MapScreen({
  isLoaded, loadError,
  city,
  data, loading, error,
  selectedCrime, onSelectCrime,
  routes, routeScores, selectedRouteIndex,
  onRoutesReady, onRouteClear,
  pinMode, onPinModeChange,
  originCoords, destCoords, onOriginCoordsChange, onDestCoordsChange,
  showHeatmap, onHeatmapToggle,
  onAddBookmark,
}: Props) {
  const [showRouteSearch, setShowRouteSearch] = useState(false)
  const [showPins,        setShowPins]        = useState(true)
  const [activeChip,      setActiveChip]      = useState('ALL')
  const [dayNight,        setDayNight]        = useState<'all' | 'day' | 'night'>('all')
  const [selectedPlace,   setSelectedPlace]   = useState<PlaceInfo | null>(null)
  const [bookmarkedIds,   setBookmarkedIds]   = useState<Set<string>>(new Set())
  const [sheetExpanded,   setSheetExpanded]   = useState(false)

  // swipe handling
  const touchStartY = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const delta = touchStartY.current - e.changedTouches[0].clientY
    if (delta > 30) setSheetExpanded(true)
    if (delta < -30) setSheetExpanded(false)
    touchStartY.current = null
  }

  // filtered data
  const displayData = useMemo(() => {
    let result = data
    if (activeChip !== 'ALL') result = result.filter((r) => matchesChip(r, activeChip))
    if (dayNight !== 'all') {
      result = result.filter((r) => {
        const h = new Date(r.report_date_time).getHours()
        const isDay = h >= 6 && h < 18
        return dayNight === 'day' ? isDay : !isDay
      })
    }
    return result
  }, [data, activeChip, dayNight])

  // recent incidents sorted by date, with distance
  const recentIncidents = useMemo(
    () =>
      [...displayData]
        .sort((a, b) => new Date(b.report_date_time).getTime() - new Date(a.report_date_time).getTime())
        .slice(0, 20)
        .map((r) => {
          const lat = parseFloat(r.latitude)
          const lng = parseFloat(r.longitude)
          const km = !isNaN(lat) && !isNaN(lng)
            ? distanceKm(SEATTLE_CENTER.lat, SEATTLE_CENTER.lng, lat, lng)
            : null
          return { ...r, _km: km }
        }),
    [displayData],
  )

  const handleMapClick = (coords: google.maps.LatLngLiteral) => {
    if (pinMode === 'origin')           { onOriginCoordsChange(coords); onPinModeChange('none') }
    else if (pinMode === 'destination') { onDestCoordsChange(coords);   onPinModeChange('none') }
  }

  const handlePoiClick = (info: PlaceInfo) => { setSelectedPlace(info); setShowRouteSearch(false) }

  const handleAddBookmark = (item: Omit<BookmarkItem, 'id' | 'addedAt'>) => {
    setBookmarkedIds((prev) => new Set([...prev, item.placeId]))
    onAddBookmark(item)
  }

  const handleClearRoute = () => { onRouteClear(); setShowRouteSearch(false) }

  // day/night chip
  const dayNightLabel = dayNight === 'night' ? '🌙 夜間' : dayNight === 'day' ? '☀️ 昼間' : '⏱ 終日'
  const dayNightActive = dayNight !== 'all'

  return (
    <div className="relative h-full overflow-hidden">

      {/* ── Map ── */}
      <Map
        isLoaded={isLoaded} loadError={loadError} city={city}
        data={displayData} selectedCrime={selectedCrime} onSelectCrime={onSelectCrime}
        routes={routes} routeScores={routeScores} selectedRouteIndex={selectedRouteIndex}
        pinMode={pinMode} originCoords={originCoords} destCoords={destCoords}
        onMapClick={handleMapClick} onPoiClick={handlePoiClick}
        showHeatmap={showHeatmap} showPins={showPins}
      />

      {/* ── Top toolbar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto px-3 pt-4 pb-0">

          {/* 検索バー行 */}
          <div className="flex items-center gap-2 mb-2">
            {/* 検索バー */}
            <button
              onClick={() => { setShowRouteSearch(true); setSelectedPlace(null) }}
              className="flex-1 flex items-center gap-2.5 bg-white rounded-full shadow-md px-4 py-2.5 active:bg-gray-50 transition-colors"
            >
              <SearchIcon />
              <span className="text-gray-400 text-sm flex-1 text-left">目的地・場所を検索...</span>
              {loading && <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
            </button>

            {/* ヒートマップ */}
            <button
              onClick={onHeatmapToggle}
              className={`w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center text-base flex-shrink-0 transition-all active:scale-95 ${showHeatmap ? 'ring-2 ring-orange-400' : ''}`}
              title="ヒートマップ"
            >🔥</button>

            {/* ピン表示 */}
            <button
              onClick={() => setShowPins((v) => !v)}
              className={`w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${showPins ? 'text-gray-600' : 'text-gray-300'}`}
              title={showPins ? 'ピンを非表示' : 'ピンを表示'}
            >
              {showPins ? <EyeOnIcon /> : <EyeOffIcon />}
            </button>
          </div>

          {/* フィルターチップ */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {FILTER_CHIPS.map((chip) => {
              const active = activeChip === chip.id
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveChip(chip.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all active:scale-95 border ${
                    active
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}

            <div className="w-px self-stretch bg-gray-200 mx-0.5 flex-shrink-0" />

            <button
              onClick={() => setDayNight((d) => (d === 'all' ? 'day' : d === 'day' ? 'night' : 'all'))}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all active:scale-95 border ${
                dayNightActive
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {dayNightLabel}
            </button>
          </div>
        </div>
      </div>

      {/* ── ピンモードヒント ── */}
      {pinMode !== 'none' && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white border border-green-300 text-gray-800 px-4 py-2.5 rounded-2xl text-xs font-medium shadow-lg whitespace-nowrap">
          <span className="text-green-500">📍</span>
          <span>{pinMode === 'origin' ? '出発地' : '目的地'}を地図上でタップ</span>
          <button onClick={() => onPinModeChange('none')} className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400">✕</button>
        </div>
      )}

      {/* ── エラーバナー ── */}
      {error && (
        <div className="absolute top-40 left-4 right-4 z-30 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-2xl text-xs font-medium shadow">
          {error}
        </div>
      )}

      {/* ── ルート検索シート（上から） ── */}
      {showRouteSearch && (
        <RouteSearchTopSheet
          onClose={() => setShowRouteSearch(false)}
          crimes={displayData} isLoaded={isLoaded}
          pinMode={pinMode} onPinModeChange={onPinModeChange}
          originCoords={originCoords} destCoords={destCoords}
          onOriginCoordsChange={onOriginCoordsChange} onDestCoordsChange={onDestCoordsChange}
          onRoutesReady={onRoutesReady} onClear={handleClearRoute}
        />
      )}

      {/* ── 下部シート ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {selectedPlace ? (
          <PlaceCardSheet
            place={selectedPlace} onClose={() => setSelectedPlace(null)}
            onAddBookmark={handleAddBookmark} bookmarked={bookmarkedIds.has(selectedPlace.placeId)}
          />
        ) : (
          /* インシデントシート（スワイプ展開） */
          <div
            className="bg-white rounded-t-[24px] shadow-[0_-2px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out"
            style={{ maxHeight: sheetExpanded ? '65vh' : '108px', overflow: 'hidden' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* ハンドル + ヘッダー */}
            <div
              className="px-5 pt-2.5 pb-0 cursor-pointer select-none"
              onClick={() => setSheetExpanded((v) => !v)}
            >
              {/* ドラッグハンドル */}
              <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-3" />

              <div className="flex items-center justify-between pb-3">
                <p className="text-gray-900 font-bold text-[15px]">付近のインシデント</p>
                <div className="flex items-center gap-2">
                  {/* 件数バッジ */}
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {recentIncidents.length}件
                  </span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-gray-300 transition-transform duration-300 ${sheetExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </div>
              </div>
            </div>

            {/* インシデントリスト */}
            <div className="overflow-y-auto px-4 pb-6" style={{ maxHeight: 'calc(65vh - 80px)' }}>
              {recentIncidents.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {recentIncidents.map((incident) => {
                    const style = getIncidentStyle(incident)
                    return (
                      <button
                        key={incident.offense_id}
                        onClick={() => onSelectCrime(incident)}
                        className="w-full bg-white rounded-2xl px-4 py-3.5 text-left border border-gray-100 active:bg-gray-50 transition-colors flex items-center gap-3 shadow-sm"
                      >
                        {/* カテゴリアイコン */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${style.iconBg} ${style.iconColor}`}>
                          {style.icon}
                        </div>

                        {/* テキスト */}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-semibold leading-tight">{style.label}</p>
                          <p className="text-gray-400 text-xs mt-0.5 truncate">
                            {incident.block_address || incident.neighborhood || ''}
                          </p>
                        </div>

                        {/* 時刻・距離 */}
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className="text-gray-400 text-xs">{timeAgo(incident.report_date_time)}</span>
                          {incident._km !== null && (
                            <span className="text-xs font-semibold" style={{ color: style.distColor }}>
                              {formatDist(incident._km)}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-6">
                  {loading ? '読み込み中...' : 'インシデントなし'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
