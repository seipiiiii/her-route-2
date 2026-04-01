import { useState, useMemo } from 'react'
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

// ─── Crime type filter chips ──────────────────────────────────────────────────

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

function incidentColor(r: CrimeRecord): string {
  const sub = (r.offense_sub_category || '').toUpperCase()
  const cat = (r.offense_category    || '').toUpperCase()
  if (cat.includes('VIOLENT') || sub.includes('ASSAULT') || sub.includes('ROBBERY') || sub.includes('HOMICIDE')) return '#ef4444'
  if (sub.includes('BURGLARY') || sub.includes('MOTOR VEHICLE') || sub.includes('WEAPON')) return '#f97316'
  return '#eab308'
}

function incidentLabel(r: CrimeRecord): string {
  const sub = (r.offense_sub_category || '').toUpperCase()
  if (sub.includes('ASSAULT') || sub.includes('AGGRAVATED')) return '暴行事件'
  if (sub.includes('ROBBERY'))       return '強盗事件'
  if (sub.includes('HOMICIDE'))      return '殺人事件'
  if (sub.includes('LARCENY') || sub.includes('THEFT')) return '窃盗事件'
  if (sub.includes('MOTOR VEHICLE')) return '車上荒らし'
  if (sub.includes('BURGLARY'))      return '空き巣'
  if (sub.includes('DRUG') || sub.includes('NARCOTIC')) return '薬物事件'
  if (sub.includes('SEX'))           return '性犯罪'
  if (sub.includes('WEAPON'))        return '武器事件'
  return r.offense_sub_category || 'インシデント'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
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
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
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
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
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
      {/* 半透明バックドロップ */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* シート本体 — 上から */}
      <div
        className="absolute top-0 left-0 right-0 bg-white rounded-b-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-y-auto"
        style={{ maxHeight: '72%' }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-14 pb-3">
          <h2 className="text-[17px] font-bold text-gray-900">ルート検索</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors active:scale-95"
          >
            <CloseIcon />
          </button>
        </div>

        {/* RoutePanel コンテンツ */}
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

        {/* ドラッグハンドル（下部） */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
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
      <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

      <div className="flex items-start gap-3">
        {/* Place icon */}
        <div className="w-11 h-11 rounded-xl bg-green-50 text-green-500 flex items-center justify-center flex-shrink-0">
          <LocationPinIcon />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-bold text-[15px] leading-snug">{place.name}</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-snug">{place.address}</p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 active:bg-gray-200 transition-colors flex-shrink-0"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {/* Bookmark button */}
        <button
          onClick={() => {
            if (!bookmarked) {
              onAddBookmark({ name: place.name, address: place.address, placeId: place.placeId, lat: place.lat, lng: place.lng })
            }
            onClose()
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
            bookmarked
              ? 'bg-gray-100 text-gray-400'
              : 'bg-green-500 text-white shadow-sm'
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
  const [showPins,   setShowPins]   = useState(true)
  const [activeChip, setActiveChip] = useState('ALL')
  const [dayNight,   setDayNight]   = useState<'all' | 'day' | 'night'>('all')
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

  // ── Client-side chip + day/night filter ──────────────────────────────────────
  const displayData = useMemo(() => {
    let result = data
    if (activeChip !== 'ALL') {
      result = result.filter((r) => matchesChip(r, activeChip))
    }
    if (dayNight !== 'all') {
      result = result.filter((r) => {
        const h = new Date(r.report_date_time).getHours()
        const isDay = h >= 6 && h < 18
        return dayNight === 'day' ? isDay : !isDay
      })
    }
    return result
  }, [data, activeChip, dayNight])

  // ── Recent incidents for bottom sheet ────────────────────────────────────────
  const recentIncidents = useMemo(
    () =>
      [...displayData]
        .sort((a, b) => new Date(b.report_date_time).getTime() - new Date(a.report_date_time).getTime())
        .slice(0, 6),
    [displayData],
  )

  const handleMapClick = (coords: google.maps.LatLngLiteral) => {
    if (pinMode === 'origin')           { onOriginCoordsChange(coords); onPinModeChange('none') }
    else if (pinMode === 'destination') { onDestCoordsChange(coords);   onPinModeChange('none') }
  }

  const handlePoiClick = (info: PlaceInfo) => {
    setSelectedPlace(info)
    setShowRouteSearch(false)
  }

  const handleAddBookmark = (item: Omit<BookmarkItem, 'id' | 'addedAt'>) => {
    setBookmarkedIds((prev) => new Set([...prev, item.placeId]))
    onAddBookmark(item)
  }

  const handleClearRoute = () => {
    onRouteClear()
    setShowRouteSearch(false)
  }

  // ── Day/night chip style ──────────────────────────────────────────────────────
  const dayNightLabel =
    dayNight === 'night' ? '🌙 夜間' :
    dayNight === 'day'   ? '☀️ 昼間' :
                           '⏱ 全時間'

  const dayNightClass =
    dayNight === 'night' ? 'bg-indigo-500 text-white' :
    dayNight === 'day'   ? 'bg-amber-400  text-white' :
                           'bg-white      text-gray-700'

  return (
    <div className="relative h-full overflow-hidden">

      {/* ── Map (full background) ── */}
      <Map
        isLoaded={isLoaded}
        loadError={loadError}
        city={city}
        data={displayData}
        selectedCrime={selectedCrime}
        onSelectCrime={onSelectCrime}
        routes={routes}
        routeScores={routeScores}
        selectedRouteIndex={selectedRouteIndex}
        pinMode={pinMode}
        originCoords={originCoords}
        destCoords={destCoords}
        onMapClick={handleMapClick}
        onPoiClick={handlePoiClick}
        showHeatmap={showHeatmap}
        showPins={showPins}
      />

      {/* ── Top toolbar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto px-3 pt-12 pb-0">

          {/* 検索バー行（ロゴ + 検索バー + ヒートマップ + ピン表示） */}
          <div className="flex items-center gap-2 mb-2">
            {/* HR ロゴ */}
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-[10px] font-black">HR</span>
            </div>

            {/* 検索バー → ルート検索シートを開く */}
            <button
              onClick={() => { setShowRouteSearch(true); setSelectedPlace(null) }}
              className="flex-1 flex items-center gap-2.5 bg-white rounded-2xl shadow-md px-4 py-2.5 active:bg-gray-50 transition-colors"
            >
              <SearchIcon />
              <span className="text-gray-400 text-sm flex-1 text-left">目的地・場所を検索...</span>
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </button>

            {/* ヒートマップボタン */}
            <button
              onClick={onHeatmapToggle}
              className={`w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center text-base flex-shrink-0 transition-all active:scale-95 ${
                showHeatmap ? 'ring-2 ring-orange-400' : ''
              }`}
              title="ヒートマップ"
            >
              🔥
            </button>

            {/* ピン表示切替ボタン */}
            <button
              onClick={() => setShowPins((v) => !v)}
              className={`w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
                showPins ? 'text-gray-600' : 'text-gray-300'
              }`}
              title={showPins ? 'ピンを非表示' : 'ピンを表示'}
            >
              {showPins ? <EyeOnIcon /> : <EyeOffIcon />}
            </button>
          </div>

          {/* 犯罪種別フィルターチップ ＋ 昼夜切替 */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveChip(chip.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 shadow-sm transition-all active:scale-95 ${
                  activeChip === chip.id
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                {chip.label}
              </button>
            ))}

            <div className="w-px self-stretch bg-white/40 mx-0.5 flex-shrink-0" />

            <button
              onClick={() =>
                setDayNight((d) => (d === 'all' ? 'day' : d === 'day' ? 'night' : 'all'))
              }
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 shadow-sm transition-all active:scale-95 ${dayNightClass}`}
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
          <button
            onClick={() => onPinModeChange('none')}
            className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200"
          >✕</button>
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
          crimes={displayData}
          isLoaded={isLoaded}
          pinMode={pinMode}
          onPinModeChange={onPinModeChange}
          originCoords={originCoords}
          destCoords={destCoords}
          onOriginCoordsChange={onOriginCoordsChange}
          onDestCoordsChange={onDestCoordsChange}
          onRoutesReady={onRoutesReady}
          onClear={handleClearRoute}
        />
      )}

      {/* ── 下部シート：POIカード or インシデント ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {selectedPlace ? (
          <PlaceCardSheet
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onAddBookmark={handleAddBookmark}
            bookmarked={bookmarkedIds.has(selectedPlace.placeId)}
          />
        ) : (
          /* インシデントシート */
          <div className="bg-white rounded-t-[28px] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-5 pt-3 pb-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-900 font-bold text-[15px]">付近のインシデント</p>
              <span className="text-gray-400 text-sm font-medium">{recentIncidents.length}件</span>
            </div>
            {recentIncidents.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {recentIncidents.map((incident) => {
                  const color = incidentColor(incident)
                  const label = incidentLabel(incident)
                  return (
                    <button
                      key={incident.offense_id}
                      onClick={() => onSelectCrime(incident)}
                      className="flex-shrink-0 w-40 bg-gray-50 rounded-2xl p-3.5 text-left border border-gray-100 active:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <p className="text-gray-900 text-xs font-semibold leading-tight truncate">{label}</p>
                      </div>
                      <p className="text-gray-400 text-[11px] ml-4">{timeAgo(incident.report_date_time)}</p>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-2">
                {loading ? '読み込み中...' : 'インシデントなし'}
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
