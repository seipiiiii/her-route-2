import type { CrimeRecord, CrimeFilters, CityId } from '../types/crime'
import { CITIES } from './cityConfig'

// ─── Seattle オープンデータ API (Socrata) ────────────────────────────────────
// データソース: Seattle Police Department Crime Data

const SEATTLE_API_URL = 'https://data.seattle.gov/resource/tazs-3rd5.json'

// ─── FBI Crime Data Explorer API ─────────────────────────────────────────────
// APIキーは https://api.data.gov/signup/ から無料取得
// 環境変数 VITE_FBI_API_KEY に設定してください
const FBI_CDE_BASE = 'https://api.usa.gov/crime/fbi/cde'

// ─── 日付ヘルパー ─────────────────────────────────────────────────────────────

function getFromDate(dateRange: CrimeFilters['dateRange']): Date | null {
  const now = new Date()
  switch (dateRange) {
    case 'today':    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week':     return new Date(now.getTime() - 7   * 86400_000)
    case 'month':    return new Date(now.getTime() - 30  * 86400_000)
    case '3months':  return new Date(now.getTime() - 90  * 86400_000)
    case 'year':     return new Date(now.getTime() - 365 * 86400_000)
    default:         return null
  }
}

// ─── 正規化関数 ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSeattle(raw: any): CrimeRecord {
  return {
    offense_id:                    raw.offense_id ?? '',
    report_date_time:              raw.report_date_time ?? '',
    offense_date:                  raw.offense_date ?? '',
    nibrs_offense_code_description: raw.nibrs_offense_code_description ?? raw.offense_sub_category ?? '',
    offense_sub_category:          raw.offense_sub_category ?? '',
    offense_category:              raw.offense_category ?? '',
    nibrs_group_a_b:               raw.nibrs_group_a_b ?? '',
    nibrs_crime_against_category:  raw.nibrs_crime_against_category ?? '',
    precinct:                      raw.precinct ?? '',
    sector:                        raw.sector ?? '',
    beat:                          raw.beat ?? '',
    neighborhood:                  raw.neighborhood ?? '',
    block_address:                 raw.block_address ?? '',
    longitude:                     raw.longitude ?? '',
    latitude:                      raw.latitude ?? '',
    city:                          'seattle',
  }
}

// ─── メイン取得関数 ────────────────────────────────────────────────────────────

export async function fetchCrimeData(
  city: CityId,
  filters: CrimeFilters,
  limit = 2000,
): Promise<CrimeRecord[]> {
  const fromDate = getFromDate(filters.dateRange)
  const { bounds } = CITIES[city]

  const inBounds = (lat: number, lng: number) =>
    lat >= bounds.minLat && lat <= bounds.maxLat &&
    lng >= bounds.minLng && lng <= bounds.maxLng

  // Seattle のみ
  let url = `${SEATTLE_API_URL}?$limit=${limit}&$order=report_date_time%20DESC`
  if (filters.offenseGroup !== 'ALL')
    url += `&offense_sub_category=${encodeURIComponent(filters.offenseGroup)}`
  if (filters.precinct !== 'ALL')
    url += `&precinct=${encodeURIComponent(filters.precinct)}`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Seattle API error: ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json()

  return data.filter(r => {
    const lat = parseFloat(r.latitude), lng = parseFloat(r.longitude)
    if (isNaN(lat) || isNaN(lng) || !inBounds(lat, lng)) return false
    if (fromDate && new Date(r.report_date_time) < fromDate) return false
    return true
  }).map(normalizeSeattle)
}

// ─── FBI Crime Data Explorer API ─────────────────────────────────────────────
// 集計統計データ（犯罪種別ごとの年間件数）を取得
// 参考: https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi

export interface FBIOffenseCount {
  offense_name: string
  count: number
  data_year: number
}

/**
 * FBI CDE API から機関レベルの犯罪種別集計を取得する
 * @param ori  FBI ORI コード (例: WA030200)
 * @param year 対象年 (デフォルト: 2022)
 * @returns    犯罪種別ごとの件数配列（APIキー未設定時は空配列）
 */
export async function fetchFBIStats(ori: string, year = 2022): Promise<FBIOffenseCount[]> {
  const apiKey = import.meta.env.VITE_FBI_API_KEY
  if (!apiKey) return []

  try {
    const url =
      `${FBI_CDE_BASE}/offense/count/agencies/${ori}/offenses/offense` +
      `?from=${year}&to=${year}&api_key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.results) ? (json.results as FBIOffenseCount[]) : []
  } catch {
    return []
  }
}
