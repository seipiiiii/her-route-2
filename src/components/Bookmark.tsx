import { useState } from 'react'
import type { BookmarkItem } from '../types/crime'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  return `${Math.floor(days / 7)}週間前`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const RouteEmptyIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-30">
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  </svg>
)

const LocationPinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  bookmarks: BookmarkItem[]
  onRemove: (id: string) => void
}

export function BookmarkScreen({ bookmarks, onRemove }: Props) {
  const [activeTab, setActiveTab] = useState<'places' | 'routes'>('places')

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-14 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold text-gray-900">ブックマーク</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['places', 'routes'] as const).map((tab) => {
            const label = tab === 'places' ? '保存した場所' : '保存したルート'
            const active = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  active ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-400'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'places' ? (
        <>
          {/* ── Location list ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {bookmarks.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-25">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                <p className="text-sm font-medium">保存した場所はありません</p>
                <p className="text-xs mt-1 text-gray-300">地図上の場所をタップして追加できます</p>
              </div>
            ) : (
              bookmarks.map((loc) => (
                <div
                  key={loc.id}
                  className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm"
                >
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0">
                    <LocationPinIcon />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{loc.name}</p>
                    <p className="text-gray-400 text-xs truncate mt-0.5">{loc.address}</p>
                    <div className="flex items-center gap-1 mt-1 text-gray-400 text-[11px]">
                      <ClockIcon />
                      <span>追加：{timeAgo(loc.addedAt)}</span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => onRemove(loc.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-400 active:bg-red-100 transition-colors flex-shrink-0"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <RouteEmptyIcon />
            <p className="text-sm">保存したルートはありません</p>
          </div>
        </div>
      )}
    </div>
  )
}
