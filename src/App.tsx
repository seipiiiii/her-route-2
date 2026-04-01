import { useState } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import { MapScreen } from './components/MapScreen'
import { BookmarkScreen } from './components/Bookmark'
import { ProfilePage } from './components/Profile'
import { NavBar, type TabId } from './components/NavBar'
import { CrimeDetail } from './components/CrimeDetail'
import { useCrimeData } from './hooks/useCrimeData'
import type { CrimeFilters, CrimeRecord, CityId, BookmarkItem } from './types/crime'
import type { RouteScore } from './utils/routeScore'

// ─── Constants ────────────────────────────────────────────────────────────────

const LIBRARIES: ('places' | 'visualization')[] = ['places', 'visualization']

const CITY_DEFAULT_DATE_RANGE: Record<CityId, CrimeFilters['dateRange']> = {
  seattle:    'month',
  losangeles: 'all',
  newyork:    'all',
}

const DEFAULT_FILTERS: CrimeFilters = {
  offenseGroup: 'ALL',
  dateRange: 'month',
  precinct: 'ALL',
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  })

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('map')

  // ── City & data ─────────────────────────────────────────────────────────────
  const [city, setCity]       = useState<CityId>('seattle')
  const [filters, setFilters] = useState<CrimeFilters>(DEFAULT_FILTERS)

  const { data, loading, error } = useCrimeData(city, filters)

  const handleCityChange = (newCity: CityId) => {
    setCity(newCity)
    setFilters({ ...DEFAULT_FILTERS, dateRange: CITY_DEFAULT_DATE_RANGE[newCity] })
  }

  // ── Crime selection ──────────────────────────────────────────────────────────
  const [selectedCrime, setSelectedCrime] = useState<CrimeRecord | null>(null)

  // ── Routes ──────────────────────────────────────────────────────────────────
  const [routes, setRoutes]                     = useState<google.maps.DirectionsRoute[]>([])
  const [routeScores, setRouteScores]           = useState<RouteScore[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)

  const handleRoutesReady = (
    newRoutes: google.maps.DirectionsRoute[],
    scores: RouteScore[],
    selectedIndex: number,
  ) => {
    setRoutes(newRoutes)
    setRouteScores(scores)
    setSelectedRouteIndex(selectedIndex)
  }

  const handleRouteClear = () => {
    setRoutes([])
    setRouteScores([])
    setSelectedRouteIndex(0)
    setOriginCoords(null)
    setDestCoords(null)
    setPinMode('none')
  }

  // ── Pin / coords ─────────────────────────────────────────────────────────────
  const [pinMode, setPinMode]               = useState<'none' | 'origin' | 'destination'>('none')
  const [originCoords, setOriginCoords]     = useState<google.maps.LatLngLiteral | null>(null)
  const [destCoords,   setDestCoords]       = useState<google.maps.LatLngLiteral | null>(null)

  // ── Bookmarks ─────────────────────────────────────────────────────────────────
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const stored = localStorage.getItem('hr_bookmarks')
      return stored ? (JSON.parse(stored) as BookmarkItem[]) : []
    } catch {
      return []
    }
  })

  const addBookmark = (item: Omit<BookmarkItem, 'id' | 'addedAt'>) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.placeId === item.placeId)) return prev
      const next = [
        { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() },
        ...prev,
      ]
      localStorage.setItem('hr_bookmarks', JSON.stringify(next))
      return next
    })
  }

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id)
      localStorage.setItem('hr_bookmarks', JSON.stringify(next))
      return next
    })
  }

  // ── Map display ──────────────────────────────────────────────────────────────
  const [showHeatmap, setShowHeatmap] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* ── Tab content ── */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'map' && (
          <MapScreen
            isLoaded={isLoaded}
            loadError={loadError}
            city={city}
            data={data}
            loading={loading}
            error={error}
            selectedCrime={selectedCrime}
            onSelectCrime={setSelectedCrime}
            routes={routes}
            routeScores={routeScores}
            selectedRouteIndex={selectedRouteIndex}
            onRoutesReady={handleRoutesReady}
            onRouteClear={handleRouteClear}
            pinMode={pinMode}
            onPinModeChange={setPinMode}
            originCoords={originCoords}
            destCoords={destCoords}
            onOriginCoordsChange={setOriginCoords}
            onDestCoordsChange={setDestCoords}
            showHeatmap={showHeatmap}
            onHeatmapToggle={() => setShowHeatmap((v) => !v)}
            onAddBookmark={addBookmark}
          />
        )}
        {activeTab === 'bookmark' && <BookmarkScreen bookmarks={bookmarks} onRemove={removeBookmark} />}
        {activeTab === 'profile'  && <ProfilePage />}
      </div>

      {/* ── Bottom navigation ── */}
      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Crime detail modal ── */}
      {selectedCrime && (
        <CrimeDetail crime={selectedCrime} onClose={() => setSelectedCrime(null)} />
      )}
    </div>
  )
}
