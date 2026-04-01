import type { CityId } from '../types/crime'

export interface CityInfo {
  id: CityId
  nameJa: string
  nameEn: string
  emoji: string
  center: { lat: number; lng: number }
  defaultZoom: number
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  /** FBI Crime Data Explorer の ORI コード */
  fbiOri: string
}

export const CITIES: Record<CityId, CityInfo> = {
  seattle: {
    id: 'seattle',
    nameJa: 'シアトル',
    nameEn: 'Seattle',
    emoji: '🌲',
    center: { lat: 47.6062, lng: -122.3321 },
    defaultZoom: 12,
    bounds: { minLat: 47.0, maxLat: 48.5, minLng: -123.0, maxLng: -121.5 },
    fbiOri: 'WA030200',
  },
}

export const CITY_LIST: CityInfo[] = Object.values(CITIES)
