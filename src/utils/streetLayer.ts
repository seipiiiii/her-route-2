import type { CrimeRecord, CityId } from '../types/crime'

export type DangerLevel = 'high' | 'medium' | 'low'

export interface StreetSegment {
  blockAddress: string
  path: google.maps.LatLngLiteral[]
  crimeCount: number
  dangerLevel: DangerLevel
  dangerScore: number // 0-100
}

// City-specific grid bearings (degrees from north, clockwise).
// aveBearing: bearing for avenue-type streets (runs N-S-ish)
// stBearing: bearing for street-type roads (runs E-W-ish, perpendicular)
const CITY_GRID: Partial<Record<CityId, { aveBearing: number; stBearing: number }>> = {
  seattle: { aveBearing: 332, stBearing: 62 }, // downtown grid ~28° off true north
}

function estimateOrientation(blockAddress: string): 'ave' | 'st' {
  const lower = blockAddress.toLowerCase()
  if (/\bave\b|\bavenue\b|\bav\b/.test(lower)) return 'ave'
  return 'st'
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

/** Builds a ~150 m polyline path centred at (lat, lng) along bearingDeg. */
function makeSegmentPath(
  lat: number,
  lng: number,
  bearingDeg: number,
): google.maps.LatLngLiteral[] {
  const HALF = 0.0007 // ~78 m → total ~156 m
  const b = degToRad(bearingDeg)
  const cosLat = Math.cos(degToRad(lat))
  const dLat = HALF * Math.cos(b)
  const dLng = HALF * Math.sin(b) / cosLat
  return [
    { lat: lat - dLat, lng: lng - dLng },
    { lat: lat + dLat, lng: lng + dLng },
  ]
}

export function computeStreetSegments(
  data: CrimeRecord[],
  thresholdPct = 30,
  city: CityId = 'seattle',
): StreetSegment[] {
  const blockMap = new Map<string, { latSum: number; lngSum: number; count: number }>()

  for (const crime of data) {
    if (!crime.block_address) continue
    const lat = parseFloat(crime.latitude)
    const lng = parseFloat(crime.longitude)
    if (isNaN(lat) || isNaN(lng)) continue

    const existing = blockMap.get(crime.block_address)
    if (existing) {
      existing.latSum += lat
      existing.lngSum += lng
      existing.count++
    } else {
      blockMap.set(crime.block_address, { latSum: lat, lngSum: lng, count: 1 })
    }
  }

  if (blockMap.size === 0) return []

  const sorted = Array.from(blockMap.entries()).sort((a, b) => b[1].count - a[1].count)
  const total = sorted.length
  const maxCount = sorted[0][1].count
  const cutoff = Math.ceil(total * (thresholdPct / 100))
  const top10 = Math.ceil(total * 0.1)
  const top20 = Math.ceil(total * 0.2)
  const grid = CITY_GRID[city] ?? { aveBearing: 0, stBearing: 90 }

  return sorted.slice(0, cutoff).map(([blockAddress, { latSum, lngSum, count }], i) => {
    const lat = latSum / count
    const lng = lngSum / count
    const orientation = estimateOrientation(blockAddress)
    const bearingDeg = orientation === 'ave' ? grid.aveBearing : grid.stBearing
    const path = makeSegmentPath(lat, lng, bearingDeg)
    const dangerScore = Math.round((count / maxCount) * 100)

    let dangerLevel: DangerLevel
    if (i < top10) dangerLevel = 'high'
    else if (i < top20) dangerLevel = 'medium'
    else dangerLevel = 'low'

    return { blockAddress, path, crimeCount: count, dangerLevel, dangerScore }
  })
}

// --- Roads API snapping ---

async function fetchNearestRoads(
  points: google.maps.LatLngLiteral[],
  apiKey: string,
): Promise<(google.maps.LatLngLiteral | null)[]> {
  if (points.length === 0) return []
  const query = points.map((p) => `${p.lat},${p.lng}`).join('|')
  try {
    const resp = await fetch(
      `https://roads.googleapis.com/v1/nearestRoads?points=${encodeURIComponent(query)}&key=${apiKey}`,
    )
    if (!resp.ok) return points.map(() => null)
    const data = await resp.json()
    const result: (google.maps.LatLngLiteral | null)[] = points.map(() => null)
    for (const sp of data.snappedPoints ?? []) {
      if (sp.originalIndex != null) {
        result[sp.originalIndex] = {
          lat: sp.location.latitude,
          lng: sp.location.longitude,
        }
      }
    }
    return result
  } catch {
    return points.map(() => null)
  }
}

/**
 * Snaps each segment's centroid to the nearest road via Google Roads API,
 * then redraws the segment along the city grid bearing at the snapped position.
 * Falls back silently to the original heuristic path on any error.
 */
export async function snapSegmentsToRoads(
  segments: StreetSegment[],
  apiKey: string,
  city: CityId = 'seattle',
  signal?: AbortSignal,
): Promise<StreetSegment[]> {
  const grid = CITY_GRID[city] ?? { aveBearing: 0, stBearing: 90 }

  const centroids: google.maps.LatLngLiteral[] = segments.map((seg) => ({
    lat: (seg.path[0].lat + seg.path[1].lat) / 2,
    lng: (seg.path[0].lng + seg.path[1].lng) / 2,
  }))

  const BATCH = 100
  const snapped: (google.maps.LatLngLiteral | null)[] = new Array(centroids.length).fill(null)

  for (let i = 0; i < centroids.length; i += BATCH) {
    if (signal?.aborted) return segments
    const batchResult = await fetchNearestRoads(centroids.slice(i, i + BATCH), apiKey)
    batchResult.forEach((pt, j) => { snapped[i + j] = pt })
  }

  if (signal?.aborted) return segments

  return segments.map((seg, i) => {
    const center = snapped[i]
    if (!center) return seg
    const orientation = estimateOrientation(seg.blockAddress)
    const bearingDeg = orientation === 'ave' ? grid.aveBearing : grid.stBearing
    return { ...seg, path: makeSegmentPath(center.lat, center.lng, bearingDeg) }
  })
}

export interface StreetStyle {
  color: string
  opacity: number
  weight: number
  dashed: boolean
  label: string
}

export const STREET_STYLES: Record<DangerLevel, StreetStyle> = {
  high:   { color: '#EF4444', opacity: 0.65, weight: 6, dashed: false, label: '高危険' },
  medium: { color: '#F97316', opacity: 0.55, weight: 4, dashed: false, label: '中危険' },
  low:    { color: '#FBBF24', opacity: 0.45, weight: 3, dashed: true,  label: '注意' },
}
