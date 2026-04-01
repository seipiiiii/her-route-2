export type CityId = 'seattle' | 'losangeles' | 'newyork'

export interface CrimeRecord {
  offense_id: string
  report_date_time: string
  offense_date: string
  nibrs_offense_code_description: string
  offense_sub_category: string
  offense_category: string
  nibrs_group_a_b: string
  nibrs_crime_against_category: string
  precinct: string
  sector: string
  beat: string
  neighborhood: string
  block_address: string
  longitude: string
  latitude: string
  city?: CityId
}

export interface CrimeFilters {
  offenseGroup: string
  dateRange: 'today' | 'week' | 'month' | '3months' | 'year' | 'all'
  precinct: string
}

export const OFFENSE_GROUPS = [
  'ALL',
  'ASSAULT OFFENSES',
  'AGGRAVATED ASSAULT',
  'BURGLARY',
  'HOMICIDE',
  'LARCENY-THEFT',
  'MOTOR VEHICLE THEFT',
  'NARCOTIC VIOLATIONS (INCLUDES DRUG EQUIP.)',
  'ROBBERY',
  'SEX OFFENSES',
  'TRESPASS',
  'WEAPON LAW VIOLATION',
]

export const PRECINCTS = ['ALL', 'North', 'East', 'South', 'Southwest', 'West']

export interface BookmarkItem {
  id: string
  name: string
  address: string
  placeId: string
  lat: number
  lng: number
  addedAt: string  // ISO date string
}

export const DATE_RANGE_LABELS: Record<CrimeFilters['dateRange'], string> = {
  today: '今日',
  week: '過去7日間',
  month: '過去30日間',
  '3months': '過去3ヶ月',
  year: '過去1年',
  all: '全期間',
}
