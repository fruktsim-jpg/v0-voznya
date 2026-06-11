'use client'

import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'
import { caseIndicators, INDICATOR_CLASS } from '@/components/cases/case-meta'
import type { CaseView } from '@/lib/cases-ux'

/**
 * IndicatorChips — the status chips (Premium / осталось N / limited / jackpot /
 * gift / season) rendered with owned Glyphs, shared by tile + featured + detail
 * so they speak one visual language. Presentation only.
 */
export function IndicatorChips({
  caseView,
  max,
  size = 'sm',
}: {
  caseView: CaseView
  max?: number
  size?: 'sm' | 'md'
}) {
  let indicators = caseIndicators(caseView)
  if (max != null) indicators = indicators.slice(0, max)
  if (indicators.length === 0) return null

  const pad = size === 'md' ? 'px-2 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-[9px]'
  const ico = size === 'md' ? 'h-3 w-3' : 'h-2.5 w-2.5'

  return (
    <div className="flex flex-wrap gap-1">
      {indicators.map((ind) => (
        <span
          key={ind.key}
          className={`inline-flex items-center gap-1 rounded-full border font-bold ${pad} ${INDICATOR_CLASS[ind.tone]}`}
        >
          <Glyph name={ind.glyph as GlyphName} className={ico} />
          {ind.label}
        </span>
      ))}
    </div>
  )
}
