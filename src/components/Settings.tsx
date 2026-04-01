import { useState } from 'react'

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        value ? 'bg-gray-900' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  last = false,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
  last?: boolean
}) {
  return (
    <>
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-gray-900 text-sm font-medium">{label}</p>
          <p className="text-gray-400 text-xs mt-0.5">{description}</p>
        </div>
        <Toggle value={value} onChange={onChange} />
      </div>
      {!last && <hr className="border-gray-100" />}
    </>
  )
}

const selectStyle =
  'w-full bg-gray-100 border-0 text-gray-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all cursor-pointer'

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
        <span className="text-brand-500">{icon}</span>
        <h3 className="text-gray-900 font-semibold text-[15px]">{title}</h3>
      </div>
      <div className="px-6">{children}</div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const KeyboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
  </svg>
)

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

const GearIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

// ─── Main Component ───────────────────────────────────────────────────────────

export function SettingsPage() {
  const [highContrast, setHighContrast] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [animations, setAnimations] = useState(true)
  const [keyboardHints, setKeyboardHints] = useState(true)
  const [screenReader, setScreenReader] = useState(false)
  const [textSize, setTextSize] = useState('medium')
  const [incidentNotif, setIncidentNotif] = useState(true)
  const [highRiskAlert, setHighRiskAlert] = useState(true)
  const [soundEffects, setSoundEffects] = useState(false)
  const [language, setLanguage] = useState('ja')
  const [region, setRegion] = useState('tokyo')

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="px-10 py-8 max-w-3xl">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-brand-500"><GearIcon /></span>
            <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          </div>
          <p className="text-gray-500 text-sm">アプリケーションの動作とアクセシビリティをカスタマイズ</p>
        </div>

        <div className="space-y-5">
          {/* 表示設定 */}
          <Section icon={<EyeIcon />} title="表示設定">
            <ToggleRow label="ハイコントラストモード" description="視認性を向上させます" value={highContrast} onChange={setHighContrast} />
            <ToggleRow label="ダークモード" description="暗い環境での使用に最適" value={darkMode} onChange={setDarkMode} />
            <ToggleRow label="アニメーション" description="トランジション効果を有効化" value={animations} onChange={setAnimations} last />
          </Section>

          {/* アクセシビリティ */}
          <Section icon={<KeyboardIcon />} title="アクセシビリティ">
            <ToggleRow label="キーボードヒント表示" description="ショートカットキーを表示" value={keyboardHints} onChange={setKeyboardHints} />
            <ToggleRow label="スクリーンリーダー対応" description="音声読み上げを最適化" value={screenReader} onChange={setScreenReader} />
            <div className="py-4">
              <p className="text-gray-900 text-sm font-medium mb-3">テキストサイズ</p>
              <select
                value={textSize}
                onChange={(e) => setTextSize(e.target.value)}
                className={selectStyle}
              >
                <option value="small">小</option>
                <option value="medium">中（デフォルト）</option>
                <option value="large">大</option>
                <option value="xlarge">特大</option>
              </select>
            </div>
          </Section>

          {/* 通知 */}
          <Section icon={<BellIcon />} title="通知">
            <ToggleRow label="新しいインシデント通知" description="保存エリアの最新情報" value={incidentNotif} onChange={setIncidentNotif} />
            <ToggleRow label="高リスクアラート" description="重大度4以上の緊急通知" value={highRiskAlert} onChange={setHighRiskAlert} />
            <ToggleRow label="サウンド効果" description="通知音を再生" value={soundEffects} onChange={setSoundEffects} last />
          </Section>

          {/* 言語・地域 */}
          <Section icon={<GlobeIcon />} title="言語・地域">
            <div className="py-4">
              <p className="text-gray-900 text-sm font-medium mb-2">表示言語</p>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={selectStyle}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ko">한국어</option>
              </select>
            </div>
            <hr className="border-gray-100" />
            <div className="py-4">
              <p className="text-gray-900 text-sm font-medium mb-2">地域設定</p>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={selectStyle}
              >
                <option value="tokyo">東京</option>
                <option value="osaka">大阪</option>
                <option value="seattle">Seattle</option>
                <option value="newyork">New York</option>
              </select>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
