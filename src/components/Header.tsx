import type { CityId } from '../types/crime'
import { CITY_LIST } from '../utils/cityConfig'

interface Props {
  city: CityId
  onCityChange: (city: CityId) => void
  dataCount: number
  loading: boolean
  onRefetch: () => void
  lastUpdated: Date | null
}

export function Header({ city, onCityChange, dataCount, loading, onRefetch, lastUpdated }: Props) {
  return (
    <header className="flex items-center h-14 px-4 bg-white border-b border-gray-200 gap-3 flex-shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        </div>
        <span className="font-bold text-gray-900 text-sm tracking-tight hidden sm:block">Her Route</span>
      </div>

      <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

      {/* 都市セレクター */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 flex-shrink-0">
        {CITY_LIST.map(c => (
          <button
            key={c.id}
            onClick={() => onCityChange(c.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              city === c.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {c.emoji} {c.nameJa}
          </button>
        ))}
      </div>

      {/* 検索バー */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="住所・地域名で検索..."
            className="w-full h-9 pl-9 pr-4 bg-gray-100 text-gray-800 text-sm rounded-xl border border-transparent focus:outline-none focus:border-brand-400 focus:bg-white transition-all placeholder-gray-400"
          />
        </div>
      </div>

      {/* 右側：件数 + 更新 */}
      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
        {lastUpdated && (
          <span className="text-[11px] text-gray-400 hidden xl:block tabular-nums">
            {lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 更新
          </span>
        )}
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-xs font-semibold text-gray-700 tabular-nums">
              {dataCount.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-gray-500">件</span>
          <button
            onClick={onRefetch}
            disabled={loading}
            className="ml-1 text-gray-400 hover:text-brand-600 disabled:opacity-40 transition-colors"
            title="データを更新"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
