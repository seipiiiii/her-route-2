import { useState } from 'react'

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

// ─── Back header ─────────────────────────────────────────────────────────────

function SubPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center px-4 pt-14 pb-4">
      <button onClick={onBack} className="mr-3 text-brand-500 flex items-center gap-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="text-[15px]">戻る</span>
      </button>
      <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-12">{title}</h1>
    </div>
  )
}

// ─── Help page ────────────────────────────────────────────────────────────────

function HelpPage({ onBack }: { onBack: () => void }) {
  const items = [
    {
      title: 'ルートを検索するには',
      body: 'マップ画面下部のルート探索パネルから出発地と目的地を入力してください。犯罪データを基に安全度の高いルートが自動で選択されます。',
    },
    {
      title: 'ピンで場所を指定するには',
      body: '入力欄右のピンボタンをタップしてから地図上をタップすると、その地点を出発地・目的地として設定できます。',
    },
    {
      title: 'ブックマークを保存するには',
      body: '地図上の場所カードに表示されるブックマークボタンをタップすると、その地点をブックマークに保存できます。',
    },
    {
      title: 'Apple Mapsで開くには',
      body: 'ルート検索結果の下に表示される「Apple Mapsで開く」ボタンをタップすると、同じルートをApple Mapsで確認できます。',
    },
    {
      title: '犯罪データについて',
      body: '表示される犯罪データはシアトル市のオープンデータを使用しています。リアルタイムデータではないため、参考情報としてご利用ください。',
    },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-y-auto">
      <SubPageHeader title="ヘルプ" onBack={onBack} />
      <div className="px-4 pb-8 space-y-3">
        {items.map((item) => (
          <div key={item.title} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-gray-900 text-[14px] font-semibold mb-1.5">{item.title}</p>
            <p className="text-gray-500 text-[13px] leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Terms page ───────────────────────────────────────────────────────────────

function TermsPage({ onBack }: { onBack: () => void }) {
  const sections = [
    {
      title: '免責事項',
      body: '本アプリが提供するルートおよび安全度情報はあくまで参考情報です。実際の安全性を保証するものではありません。利用者自身の判断と責任のもとでご利用ください。',
    },
    {
      title: 'データの利用について',
      body: '犯罪データはシアトル市が公開するオープンデータ（Seattle Open Data）を使用しています。データの正確性・完全性について当アプリは責任を負いません。',
    },
    {
      title: '位置情報の取り扱い',
      body: '本アプリは位置情報をルート検索にのみ使用します。位置情報を外部サーバーに送信・保存することはありません。',
    },
    {
      title: 'サービスの変更・終了',
      body: '本アプリのサービス内容は予告なく変更・終了する場合があります。あらかじめご了承ください。',
    },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-y-auto">
      <SubPageHeader title="利用規約" onBack={onBack} />
      <div className="px-4 pb-8 space-y-3">
        {sections.map((s) => (
          <div key={s.title} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-gray-900 text-[14px] font-semibold mb-1.5">{s.title}</p>
            <p className="text-gray-500 text-[13px] leading-relaxed">{s.body}</p>
          </div>
        ))}
        <p className="text-gray-400 text-[11px] text-center pt-2">最終更新日: 2026年5月</p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SubPage = 'main' | 'help' | 'terms'

export function ProfilePage({ onNavigateToBookmark }: { onNavigateToBookmark: () => void }) {
  const [subPage, setSubPage] = useState<SubPage>('main')

  if (subPage === 'help')  return <HelpPage  onBack={() => setSubPage('main')} />
  if (subPage === 'terms') return <TermsPage onBack={() => setSubPage('main')} />

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
            onPress={onNavigateToBookmark}
          />
          <ArrowRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" fill="white" />
              </svg>
            }
            label="ブックマーク地点"
            onPress={onNavigateToBookmark}
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
            onPress={() => setSubPage('help')}
          />
          <ArrowRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
            label="利用規約"
            onPress={() => setSubPage('terms')}
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
