import { useEffect, useRef, useState } from 'react'
import { Autocomplete } from '@react-google-maps/api'
import type { CrimeRecord } from '../types/crime'
import { scoreRoutes, type RouteScore } from '../utils/routeScore'

const SEATTLE_BOUNDS = {
  north: 47.78, south: 47.45, east: -122.22, west: -122.55,
}

interface Props {
  crimes: CrimeRecord[]
  isLoaded: boolean
  pinMode: 'none' | 'origin' | 'destination'
  onPinModeChange: (mode: 'none' | 'origin' | 'destination') => void
  originCoords: google.maps.LatLngLiteral | null
  destCoords: google.maps.LatLngLiteral | null
  onOriginCoordsChange: (coords: google.maps.LatLngLiteral | null) => void
  onDestCoordsChange: (coords: google.maps.LatLngLiteral | null) => void
  onRoutesReady: (routes: google.maps.DirectionsRoute[], scores: RouteScore[], selectedIndex: number) => void
  onClear: () => void
}

export function RoutePanel({
  crimes, isLoaded,
  pinMode, onPinModeChange,
  originCoords, destCoords,
  onOriginCoordsChange, onDestCoordsChange,
  onRoutesReady, onClear,
}: Props) {
  const [originText, setOriginText] = useState('')
  const [destText, setDestText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scores, setScores] = useState<RouteScore[]>([])
  const [routes, setRoutes] = useState<google.maps.DirectionsRoute[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const originAcRef = useRef<google.maps.places.Autocomplete | null>(null)
  const destAcRef = useRef<google.maps.places.Autocomplete | null>(null)
  const originInputRef = useRef<HTMLInputElement>(null)
  const destInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoaded || !originCoords) return
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: originCoords }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setOriginText(results[0].formatted_address)
      } else {
        setOriginText(`${originCoords.lat.toFixed(5)}, ${originCoords.lng.toFixed(5)}`)
      }
    })
  }, [originCoords, isLoaded])

  useEffect(() => {
    if (!isLoaded || !destCoords) return
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: destCoords }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setDestText(results[0].formatted_address)
      } else {
        setDestText(`${destCoords.lat.toFixed(5)}, ${destCoords.lng.toFixed(5)}`)
      }
    })
  }, [destCoords, isLoaded])

  const handleOriginPlaceChanged = () => {
    const place = originAcRef.current?.getPlace()
    if (place?.formatted_address) setOriginText(place.formatted_address)
    if (place?.geometry?.location) {
      onOriginCoordsChange({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() })
    }
  }

  const handleDestPlaceChanged = () => {
    const place = destAcRef.current?.getPlace()
    if (place?.formatted_address) setDestText(place.formatted_address)
    if (place?.geometry?.location) {
      onDestCoordsChange({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() })
    }
  }

  const handleSearch = () => {
    const originReq = originCoords ?? originText.trim()
    const destReq = destCoords ?? destText.trim()
    if (!originReq || (typeof originReq === 'string' && !originReq)) {
      setError('出発地を入力してください')
      return
    }
    if (!destReq || (typeof destReq === 'string' && !destReq)) {
      setError('目的地を入力してください')
      return
    }
    setLoading(true)
    setError(null)
    setScores([])

    const service = new google.maps.DirectionsService()
    service.route(
      {
        origin: originReq,
        destination: destReq,
        travelMode: google.maps.TravelMode.WALKING,
        provideRouteAlternatives: true,
        region: 'us',
      },
      (result, status) => {
        setLoading(false)
        if (status !== google.maps.DirectionsStatus.OK || !result) {
          setError('ルートが見つかりませんでした。住所を確認してください。')
          return
        }
        const newRoutes = result.routes
        const newScores = scoreRoutes(newRoutes, crimes)
        const safestIndex = newScores.reduce(
          (best, s) => (s.safetyScore > newScores[best].safetyScore ? s.index : best), 0,
        )
        setRoutes(newRoutes)
        setScores(newScores)
        setSelectedIndex(safestIndex)
        onRoutesReady(newRoutes, newScores, safestIndex)
      },
    )
  }

  const handleClear = () => {
    setOriginText('')
    setDestText('')
    setScores([])
    setRoutes([])
    setError(null)
    onClear()
  }

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    onRoutesReady(routes, scores, index)
  }

  const inputClass =
    'w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 text-xs placeholder-gray-400 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 focus:bg-white transition-all'

  const pinBtnClass = (active: boolean) =>
    `w-9 h-9 flex items-center justify-center rounded-xl text-sm flex-shrink-0 transition-all border ${
      active
        ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 border-gray-200'
    }`

  const sortedScores = scores.slice().sort((a, b) => b.safetyScore - a.safetyScore)

  if (!isLoaded) {
    return <p className="text-gray-400 text-xs text-center py-8">マップ読み込み中...</p>
  }

  return (
    <div className="space-y-5">
      <p className="text-gray-400 text-[11px] leading-relaxed">
        出発地と目的地を入力して、犯罪データを基にした安全なルートを探索します。
      </p>

      <div className="space-y-2.5">
        {/* Origin */}
        <div>
          <label className="block text-[11px] text-gray-500 mb-1.5 font-medium">出発地</label>
          <div className="flex gap-1.5">
            <Autocomplete
              onLoad={(ac) => { originAcRef.current = ac }}
              onPlaceChanged={handleOriginPlaceChanged}
              options={{ bounds: SEATTLE_BOUNDS, fields: ['formatted_address', 'geometry'] }}
              className="flex-1 min-w-0"
            >
              <input
                ref={originInputRef}
                type="text"
                value={originText}
                onChange={(e) => { setOriginText(e.target.value); onOriginCoordsChange(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="例: Pike Place Market"
                className={inputClass}
              />
            </Autocomplete>
            <button
              onClick={() => onPinModeChange(pinMode === 'origin' ? 'none' : 'origin')}
              className={pinBtnClass(pinMode === 'origin')}
              title="地図上でクリックして指定"
            >
              📍
            </button>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="block text-[11px] text-gray-500 mb-1.5 font-medium">目的地</label>
          <div className="flex gap-1.5">
            <Autocomplete
              onLoad={(ac) => { destAcRef.current = ac }}
              onPlaceChanged={handleDestPlaceChanged}
              options={{ bounds: SEATTLE_BOUNDS, fields: ['formatted_address', 'geometry'] }}
              className="flex-1 min-w-0"
            >
              <input
                ref={destInputRef}
                type="text"
                value={destText}
                onChange={(e) => { setDestText(e.target.value); onDestCoordsChange(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="例: Space Needle"
                className={inputClass}
              />
            </Autocomplete>
            <button
              onClick={() => onPinModeChange(pinMode === 'destination' ? 'none' : 'destination')}
              className={pinBtnClass(pinMode === 'destination')}
              title="地図上でクリックして指定"
            >
              📍
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            {loading ? '検索中...' : 'ルートを検索'}
          </button>
          {(scores.length > 0 || originText || destText) && (
            <button
              onClick={handleClear}
              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-xl text-xs transition-colors border border-gray-200"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-[11px] bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 leading-relaxed">
          {error}
        </p>
      )}

      {/* Route results */}
      {sortedScores.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-[0.12em]">
              ルート比較
            </p>
            <span className="text-gray-400 text-[11px]">{scores.length} 件</span>
          </div>
          {sortedScores.map((score) => {
            const route = routes[score.index]
            const leg = route?.legs[0]
            const isSelected = score.index === selectedIndex
            return (
              <button
                key={score.index}
                onClick={() => handleSelect(score.index)}
                className={`w-full text-left rounded-xl p-3.5 border transition-all ${
                  isSelected
                    ? 'bg-gray-50 border-gray-200 shadow-sm'
                    : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: score.color }} />
                    <span className="text-gray-800 text-xs font-semibold">{score.label}</span>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${score.color}18`, color: score.color }}
                  >
                    安全度 {score.safetyScore}
                  </span>
                </div>
                <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${score.safetyScore}%`, backgroundColor: score.color }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span className="tabular-nums">{leg?.distance?.text ?? '—'}</span>
                  <span className="tabular-nums">{leg?.duration?.text ?? '—'}</span>
                  <span>犯罪 {score.crimeCount} 件</span>
                </div>
              </button>
            )
          })}
          <p className="text-gray-400 text-[11px] text-center pt-1">
            ※ ルート沿い 300m 以内の犯罪データを基に算出
          </p>
        </div>
      )}
    </div>
  )
}
