import { useEffect, useState } from 'react'

// ─── Toggle (iOS style) ───────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        value ? 'bg-brand-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform duration-200 ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ─── Row types ────────────────────────────────────────────────────────────────

function ArrowRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  onPress?: () => void
}) {
  return (
    <button
      onClick={onPress}
      className="flex items-center px-4 py-3.5 w-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white mr-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' }}>
        {icon}
      </div>
      <span className="flex-1 text-left text-gray-900 text-[15px]">{label}</span>
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}

function ToggleRow({
  icon,
  iconBg,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode
  iconBg?: string
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center px-4 py-3.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white mr-3 flex-shrink-0"
        style={{ background: iconBg ?? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' }}
      >
        {icon}
      </div>
      <span className="flex-1 text-gray-900 text-[15px]">{label}</span>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

function SettingsSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-4 mb-2">
        {label}
      </p>
      <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
        {children}
      </div>
    </div>
  )
}

// ─── SVG shorthand ───────────────────────────────────────────────────────────

const Svg = ({ d, ...rest }: { d: string; [k: string]: unknown }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d={d} />
  </svg>
)

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfilePage() {
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('hr_highContrast') === 'true'
  })
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('hr_darkMode') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('hr_highContrast', String(highContrast))
  }, [highContrast])

  useEffect(() => {
    localStorage.setItem('hr_darkMode', String(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-y-auto">
      {/* ── Navigation title ── */}
      <div className="px-4 pt-14 pb-4">
        <h1 className="text-[28px] font-bold text-gray-900 text-center">設定</h1>
      </div>

      {/* ── App branding card ── */}
      <div className="bg-white mx-4 rounded-2xl p-5 mb-6 flex flex-col items-center shadow-sm">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #4ade80 0%, #1D6B4F 100%)' }}>
          <svg
            width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" fill="white" />
          </svg>
        </div>
        <p className="text-lg font-bold text-gray-900">Her Route</p>
        <p className="text-sm text-gray-400 mt-0.5">安全なルートをナビゲート</p>
      </div>

      {/* ── Settings sections ── */}
      <div className="px-4 pb-8">
        {/* 安全設定 */}
        <SettingsSection label="安全設定">
          <ArrowRow
            icon={<Svg d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />}
            label="保存済みルート"
          />
          <ArrowRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" fill="white" />
              </svg>
            }
            label="ブックマーク地点"
          />
          <ArrowRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            }
            label="通知設定"
          />
        </SettingsSection>

        {/* 表示設定 */}
        <SettingsSection label="表示設定">
          <ToggleRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            }
            iconBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            label="ハイコントラストモード"
            value={highContrast}
            onChange={setHighContrast}
          />
          <ToggleRow
            icon={<Svg d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />}
            iconBg="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)"
            label="ダークモード"
            value={darkMode}
            onChange={setDarkMode}
          />
        </SettingsSection>

        {/* その他 */}
        <SettingsSection label="その他">
          <ArrowRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
            label="ヘルプ"
          />
          <ArrowRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
            label="利用規約"
          />
          <ArrowRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
            label="バージョン 1.0.0"
          />
        </SettingsSection>
      </div>
    </div>
  )
}
