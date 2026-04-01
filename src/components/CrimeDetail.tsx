import type { CrimeRecord } from '../types/crime'

interface Props {
  crime: CrimeRecord
  onClose: () => void
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '不明'
  const d = new Date(dateStr)
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CrimeDetail({ crime, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Accent top bar */}
        <div className="h-[3px] bg-gradient-to-r from-brand-400 via-brand-500 to-brand-400" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-gray-900 font-semibold text-[15px] leading-snug tracking-tight">
                {crime.nibrs_offense_code_description}
              </h2>
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-brand-50 border border-brand-200 text-brand-700 text-[11px] rounded-md font-medium">
                {crime.offense_sub_category}
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
            <DetailRow label="発生日時" value={formatDate(crime.offense_date)} />
            <DetailRow label="報告日時" value={formatDate(crime.report_date_time)} />
            <DetailRow label="住所" value={crime.block_address || '不明'} />
            <DetailRow
              label="管轄区 / セクター / ビート"
              value={`${crime.precinct} / ${crime.sector} / ${crime.beat}`}
            />
            <DetailRow label="地区" value={crime.neighborhood || '不明'} />
            <DetailRow label="被害カテゴリ" value={crime.nibrs_crime_against_category || '不明'} />
            <DetailRow label="カテゴリ" value={crime.offense_category || '不明'} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-gray-400 text-[11px] font-medium shrink-0 mt-0.5">{label}</span>
      <span className="text-gray-700 text-xs text-right leading-relaxed">{value}</span>
    </div>
  )
}
