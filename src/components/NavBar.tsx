import React from 'react'

export type TabId = 'map' | 'bookmark' | 'profile'

// ─── Icons ────────────────────────────────────────────────────────────────────

const MapIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? '2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.15 : 0} />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)

const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? '2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
)

const PersonIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? '2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.15 : 0} />
    <circle cx="12" cy="7" r="4" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.2 : 0} />
  </svg>
)

// ─── Nav items ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: (filled: boolean) => React.ReactNode }[] = [
  {
    id: 'map',
    label: 'マップ',
    icon: (f) => <MapIcon filled={f} />,
  },
  {
    id: 'bookmark',
    label: 'ブックマーク',
    icon: (f) => <BookmarkIcon filled={f} />,
  },
  {
    id: 'profile',
    label: 'プロフィール',
    icon: (f) => <PersonIcon filled={f} />,
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function NavBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}) {
  return (
    <nav
      className="flex-shrink-0 bg-white/95 backdrop-blur border-t border-gray-200 flex items-center justify-around"
      style={{ paddingBottom: 8, paddingTop: 8, minHeight: 60 }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center gap-1 px-4 flex-1 transition-all active:scale-95"
          >
            <span className={`transition-colors ${active ? 'text-brand-500' : 'text-gray-400'}`}>
              {tab.icon(active)}
            </span>
            <span
              className={`text-[10px] font-semibold leading-tight transition-colors ${
                active ? 'text-brand-500' : 'text-gray-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
