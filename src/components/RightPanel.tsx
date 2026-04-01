import { useState } from 'react'
import { RoutePanel } from './RoutePanel'
import type { TabId } from './NavBar'
import type { CrimeRecord, CrimeFilters, CityId } from '../types/crime'
import { DATE_RANGE_LABELS } from '../types/crime'
import type { RouteScore } from '../utils/routeScore'
import { useFBIStats } from '../hooks/useFBIStats'

interface Props {
  activeNav: TabId
  onClose: () => void
  city: CityId
  // Data
  filters: CrimeFilters
  onFilterChange: (f: CrimeFilters) => void
  neighborhood: string
  onNeighborhoodChange: (n: string) => void
  availableNeighborhoods: string[]
  availableOffenseGroups: string[]
  availablePrecincts: string[]
  data: CrimeRecord[]
  loading: boolean
  selectedCrime: CrimeRecord | null
  onSelectCrime: (crime: CrimeRecord) => void
  // Route
  onRoutesReady: (routes: google.maps.DirectionsRoute[], scores: RouteScore[], idx: number) => void
  onRouteClear: () => void
  isLoaded: boolean
  pinMode: 'none' | 'origin' | 'destination'
  onPinModeChange: (mode: 'none' | 'origin' | 'destination') => void
  originCoords: google.maps.LatLngLiteral | null
  destCoords: google.maps.LatLngLiteral | null
  onOriginCoordsChange: (c: google.maps.LatLngLiteral | null) => void
  onDestCoordsChange: (c: google.maps.LatLngLiteral | null) => void
  // Layers
  showHeatmap: boolean
  onHeatmapToggle: () => void
}

const PANEL_TITLES: Record<TabId, string> = {
  map: '概要',
  route: 'ルート探索',
  incidents: 'インシデント',
  layers: 'レイヤー & フィルター',
  daynight: '昼夜切り替え',
  settings: '設定',
  profile: 'プロフィール',
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const selectClass =
  'w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 transition-all cursor-pointer'

const sectionLabel = 'text-gray-400 text-[10px] font-semibold uppercase tracking-[0.12em]'

// ─── Overview Panel ────────────────────────────────────────────────────────────

function OverviewPanel({ data, loading, city }: Pick<Props, 'data' | 'loading' | 'city'>) {
  const { stats: fbiStats, loading: fbiLoading, hasKey } = useFBIStats(city)

  const offenseCounts = data.reduce<Record<string, number>>((acc, c) => {
    const key = c.offense_sub_category || 'その他'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const topOffenses = Object.entries(offenseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const neighborhoodCounts = data.reduce<Record<string, number>>((acc, c) => {
    const key = c.neighborhood || '不明'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const topNeighborhoods = Object.entries(neighborhoodCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const topFBI = [...fbiStats].sort((a, b) => b.count - a.count).slice(0, 5)
  const fbiTotal = fbiStats.reduce((s, r) => s + r.count, 0)

  return (
    <div className="px-4 py-4 space-y-6">
      {/* リアルタイムカード */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5">
        <p className="text-green-600 text-xs font-semibold mb-1">リアルタイムデータ</p>
        <p className="text-gray-900 font-bold text-3xl tabular-nums leading-none">
          {loading ? '—' : data.length.toLocaleString()}
        </p>
        <p className="text-green-500 text-xs mt-1.5">件 (表示中)</p>
      </div>

      {/* FBI CDE 統計 */}
      {hasKey && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className={sectionLabel}>FBI CDE 年間統計 (2022)</p>
            {fbiLoading && (
              <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          {!fbiLoading && topFBI.length > 0 ? (
            <>
              <div className="space-y-3">
                {topFBI.map(({ offense_name, count }) => {
                  const pct = fbiTotal > 0 ? Math.round((count / fbiTotal) * 100) : 0
                  return (
                    <div key={offense_name}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-600 truncate pr-2">{offense_name}</span>
                        <span className="text-gray-400 shrink-0 tabular-nums">{count.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-gray-400 text-[10px] mt-2">
                出典: FBI Crime Data Explorer — 合計 {fbiTotal.toLocaleString()} 件
              </p>
            </>
          ) : !fbiLoading ? (
            <p className="text-gray-400 text-xs">FBIデータを取得できませんでした。</p>
          ) : null}
        </div>
      )}

      {/* リアルタイム: 犯罪種別 TOP 5 */}
      {topOffenses.length > 0 && (
        <div>
          <p className={`${sectionLabel} mb-3`}>犯罪種別 TOP 5</p>
          <div className="space-y-3">
            {topOffenses.map(([name, count]) => {
              const pct = Math.round((count / data.length) * 100)
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600 truncate pr-2">{name}</span>
                    <span className="text-gray-400 shrink-0 tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 地区別 TOP 5 */}
      {topNeighborhoods.length > 0 && (
        <div>
          <p className={`${sectionLabel} mb-3`}>地区別 TOP 5</p>
          <div className="space-y-3">
            {topNeighborhoods.map(([name, count]) => {
              const pct = Math.round((count / data.length) * 100)
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600 truncate pr-2">{name}</span>
                    <span className="text-gray-400 shrink-0 tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-300 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Incidents Panel ──────────────────────────────────────────────────────────

function IncidentsPanel({
  data, loading,
  filters, onFilterChange,
  neighborhood, onNeighborhoodChange, availableNeighborhoods,
  availableOffenseGroups, availablePrecincts,
  selectedCrime, onSelectCrime,
}: Pick<Props, 'data' | 'loading' | 'filters' | 'onFilterChange' | 'neighborhood' | 'onNeighborhoodChange' | 'availableNeighborhoods' | 'availableOffenseGroups' | 'availablePrecincts' | 'selectedCrime' | 'onSelectCrime'>) {
  const [search, setSearch] = useState('')

  const updateFilter = <K extends keyof CrimeFilters>(key: K, value: CrimeFilters[K]) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const filtered = search
    ? data.filter(
        (r) =>
          r.nibrs_offense_code_description?.toLowerCase().includes(search.toLowerCase()) ||
          r.block_address?.toLowerCase().includes(search.toLowerCase()),
      )
    : data

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-4 py-4 border-b border-gray-100 space-y-2.5 flex-shrink-0">
        <p className={`${sectionLabel} mb-2`}>フィルター</p>

        <select
          value={filters.dateRange}
          onChange={(e) => updateFilter('dateRange', e.target.value as CrimeFilters['dateRange'])}
          className={selectClass}
        >
          {(Object.keys(DATE_RANGE_LABELS) as CrimeFilters['dateRange'][]).map((k) => (
            <option key={k} value={k}>{DATE_RANGE_LABELS[k]}</option>
          ))}
        </select>

        <select
          value={filters.offenseGroup}
          onChange={(e) => updateFilter('offenseGroup', e.target.value)}
          className={selectClass}
        >
          {availableOffenseGroups.map((g) => (
            <option key={g} value={g}>{g === 'ALL' ? 'すべての種別' : g}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={filters.precinct}
            onChange={(e) => updateFilter('precinct', e.target.value)}
            className={selectClass}
          >
            {availablePrecincts.map((p) => (
              <option key={p} value={p}>{p === 'ALL' ? '全エリア' : p}</option>
            ))}
          </select>
          <select
            value={neighborhood}
            onChange={(e) => onNeighborhoodChange(e.target.value)}
            className={selectClass}
          >
            <option value="ALL">全地区</option>
            {availableNeighborhoods.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Search within list */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="種別・住所で絞り込み..."
            className="w-full h-9 pl-8 pr-3 bg-gray-50 text-gray-800 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:bg-white transition-all placeholder-gray-400"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className={`${sectionLabel} mb-3`}>{filtered.length.toLocaleString()} 件</p>
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
        ) : (
          <div className="space-y-1.5">
            {filtered.slice(0, 50).map((crime) => (
              <button
                key={crime.offense_id}
                onClick={() => onSelectCrime(crime)}
                className={`w-full text-left rounded-xl px-3 py-2.5 transition-all border ${
                  selectedCrime?.offense_id === crime.offense_id
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-200'
                }`}
              >
                <p className="text-gray-800 text-xs font-medium leading-snug truncate">
                  {crime.nibrs_offense_code_description}
                </p>
                <p className="text-gray-400 text-[11px] mt-0.5 truncate">{crime.block_address}</p>
                <p className="text-green-600 text-[11px] mt-0.5 tabular-nums">
                  {formatShortDate(crime.report_date_time)}
                </p>
              </button>
            ))}
            {filtered.length > 50 && (
              <p className="text-center text-xs text-gray-400 py-3">
                上位 50 件を表示 (全 {filtered.length.toLocaleString()} 件)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Layers Panel ─────────────────────────────────────────────────────────────

function LayersPanel({ showHeatmap, onHeatmapToggle }: Pick<Props, 'showHeatmap' | 'onHeatmapToggle'>) {
  return (
    <div className="px-4 py-4 space-y-6">
      {/* Heatmap toggle */}
      <div>
        <p className={`${sectionLabel} mb-3`}>表示設定</p>
        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div>
            <p className="text-gray-800 text-sm font-medium">ヒートマップ</p>
            <p className="text-gray-400 text-[11px] mt-0.5">犯罪密度を色で可視化</p>
          </div>
          <button
            onClick={onHeatmapToggle}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              showHeatmap ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                showHeatmap ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div>
        <p className={`${sectionLabel} mb-3`}>凡例</p>
        <div className="space-y-1">
          {[
            { label: '暴行・殺人', color: '#ef4444' },
            { label: '強盗・武器', color: '#f97316' },
            { label: '窃盗・盗難', color: '#eab308' },
            { label: '財産犯罪', color: '#3b82f6' },
            { label: '薬物', color: '#a855f7' },
            { label: '性犯罪', color: '#ec4899' },
            { label: 'その他', color: '#94a3b8' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-600 text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Day/Night Panel ──────────────────────────────────────────────────────────

function DayNightPanel({ data }: Pick<Props, 'data'>) {
  const [mode, setMode] = useState<'day' | 'night'>('day')

  const isDay = (dateStr: string) => {
    const h = new Date(dateStr).getHours()
    return h >= 6 && h < 18
  }

  const dayData  = data.filter((r) => isDay(r.report_date_time))
  const nightData = data.filter((r) => !isDay(r.report_date_time))
  const current = mode === 'day' ? dayData : nightData

  const classify = (r: CrimeRecord) => {
    const cat = r.offense_category?.toUpperCase() ?? ''
    const sub = r.offense_sub_category?.toUpperCase() ?? ''
    if (cat === 'VIOLENT CRIME' || sub.includes('ROBBERY') || sub.includes('HOMICIDE') || sub.includes('WEAPON')) return 'high'
    if (sub.includes('BURGLARY') || sub.includes('MOTOR VEHICLE') || sub.includes('SEX')) return 'mid'
    return 'low'
  }

  const high = current.filter((r) => classify(r) === 'high').length
  const mid  = current.filter((r) => classify(r) === 'mid').length
  const low  = current.length - high - mid

  // 時間帯別比較: top categories with day vs night ratio
  const buildCounts = (records: CrimeRecord[]) =>
    records.reduce<Record<string, number>>((acc, r) => {
      const k = r.offense_sub_category || 'その他'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})

  const dayCounts   = buildCounts(dayData)
  const nightCounts = buildCounts(nightData)

  const allKeys = [...new Set([...Object.keys(dayCounts), ...Object.keys(nightCounts)])]
  const comparisons = allKeys
    .map((k) => {
      const d = dayCounts[k] ?? 0
      const n = nightCounts[k] ?? 0
      const base = mode === 'day' ? n : d
      const curr = mode === 'day' ? d : n
      const pct = base === 0 ? 100 : Math.round(((curr - base) / base) * 100)
      return { label: k, count: curr, pct }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const dayInsight = '日中は比較的安全ですが、混雑した場所では窃盗やスリに注意してください。貴重品は身につけたまま管理しましょう。'
  const nightInsight = '夜間は犯罪リスクが高まります。人通りの少ない道は避け、明るい道を選んで移動しましょう。'

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Mode description */}
      <p className="text-gray-400 text-[11px] leading-relaxed">時間帯による犯罪傾向を比較</p>

      {/* Day / Night toggle cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* 日中 */}
        <button
          onClick={() => setMode('day')}
          className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all ${
            mode === 'day'
              ? 'bg-green-50 border-green-400 text-green-600'
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <span className="text-sm font-bold">日中</span>
          <span className="text-[10px] opacity-70">6:00 - 18:00</span>
        </button>

        {/* 夜間 */}
        <button
          onClick={() => setMode('night')}
          className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all ${
            mode === 'night'
              ? 'bg-indigo-50 border-indigo-400 text-indigo-600'
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span className="text-sm font-bold">夜間</span>
          <span className="text-[10px] opacity-70">18:00 - 6:00</span>
        </button>
      </div>

      {/* Stats */}
      <div>
        <p className={`${sectionLabel} mb-3`}>{mode === 'day' ? '日中' : '夜間'}の統計</p>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-gray-600 text-sm">総インシデント数</span>
            <span className="text-gray-900 font-bold text-lg tabular-nums">{current.length}</span>
          </div>
          {[
            { label: '高リスク', count: high, color: '#ef4444' },
            { label: '中リスク', count: mid,  color: '#f97316' },
            { label: '低リスク', count: low,  color: '#22c55e' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-gray-600 text-sm">{label}</span>
              </div>
              <span className="text-gray-800 text-sm font-semibold tabular-nums">{count}件</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">💡</span>
          <span className="text-amber-700 font-semibold text-sm">インサイト</span>
        </div>
        <p className="text-amber-700 text-xs leading-relaxed">
          {mode === 'day' ? dayInsight : nightInsight}
        </p>
      </div>

      {/* 時間帯別比較 */}
      <div>
        <p className={`${sectionLabel} mb-3`}>時間帯別比較</p>
        <div className="space-y-2">
          {comparisons.map(({ label, count, pct }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-gray-600 text-xs truncate pr-2 flex-1">{label}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-gray-800 text-xs font-medium tabular-nums">{count}件</span>
                {pct !== 0 && (
                  <span
                    className="text-[10px] font-bold tabular-nums"
                    style={{ color: pct > 0 ? '#ef4444' : '#22c55e' }}
                  >
                    {pct > 0 ? '+' : ''}{pct}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-[10px] mt-3 leading-relaxed">
          ※ 対象期間内の{mode === 'day' ? '日中（6-18時）' : '夜間（18-6時）'}データを集計
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RightPanel({
  activeNav, onClose,
  city,
  filters, onFilterChange,
  neighborhood, onNeighborhoodChange, availableNeighborhoods,
  availableOffenseGroups, availablePrecincts,
  data, loading, selectedCrime, onSelectCrime,
  onRoutesReady, onRouteClear, isLoaded,
  pinMode, onPinModeChange,
  originCoords, destCoords, onOriginCoordsChange, onDestCoordsChange,
  showHeatmap, onHeatmapToggle,
}: Props) {
  return (
    <aside className="w-80 flex flex-col bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-gray-900 font-semibold text-sm">{PANEL_TITLES[activeNav]}</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          title="パネルを閉じる"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Panel content */}
      <div className={`flex-1 overflow-hidden ${activeNav === 'incidents' ? 'flex flex-col' : 'overflow-y-auto'}`}>
        {activeNav === 'map' && (
          <OverviewPanel data={data} loading={loading} city={city} />
        )}
        {activeNav === 'route' && (
          <div className="px-4 py-4">
            <RoutePanel
              crimes={data}
              isLoaded={isLoaded}
              pinMode={pinMode}
              onPinModeChange={onPinModeChange}
              originCoords={originCoords}
              destCoords={destCoords}
              onOriginCoordsChange={onOriginCoordsChange}
              onDestCoordsChange={onDestCoordsChange}
              onRoutesReady={onRoutesReady}
              onClear={onRouteClear}
            />
          </div>
        )}
        {activeNav === 'incidents' && (
          <IncidentsPanel
            data={data}
            loading={loading}
            filters={filters}
            onFilterChange={onFilterChange}
            neighborhood={neighborhood}
            onNeighborhoodChange={onNeighborhoodChange}
            availableNeighborhoods={availableNeighborhoods}
            availableOffenseGroups={availableOffenseGroups}
            availablePrecincts={availablePrecincts}
            selectedCrime={selectedCrime}
            onSelectCrime={onSelectCrime}
          />
        )}
        {activeNav === 'layers' && (
          <LayersPanel showHeatmap={showHeatmap} onHeatmapToggle={onHeatmapToggle} />
        )}
        {activeNav === 'daynight' && (
          <DayNightPanel data={data} />
        )}
      </div>
    </aside>
  )
}
