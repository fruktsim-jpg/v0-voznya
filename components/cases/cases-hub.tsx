'use client'

import { useMemo, useState } from 'react'
import { layoutCases, CASE_CATEGORY_META, type CaseView, type CaseCategory } from '@/lib/cases-ux'
import { Chip, ChipGroup } from '@/components/ds/chip'
import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'
import { CaseTile } from '@/components/cases/case-tile'
import { SectionTitle } from '@/components/ds/section-title'
import { CaseDetailSheet } from '@/components/cases/case-detail-sheet'
import { RecentWins } from '@/components/cases/recent-wins'
import type { RecentCaseWin } from '@/lib/cases'

/**
 * CasesHub — the storefront orchestrator. The emotional acquisition loop:
 * social proof (recent wins) → the dream (featured hero) → the catalog of
 * desire (tiles showing what you can win + real scarcity/popularity). Tapping
 * any case opens the detail/opening experience; the reel never lives in the grid.
 *
 * Client component: holds only view state (active category + selected case).
 * All economy / RNG stays server-side (open_case via /api/cases/open). The
 * derivations come from lib/cases-ux; recent wins + open counts are real data
 * passed in from the server page.
 */
export function CasesHub({
  cases,
  recentWins = [],
  openCounts = {},
}: {
  cases: CaseView[]
  recentWins?: RecentCaseWin[]
  openCounts?: Record<string, number>
}) {
  const [category, setCategory] = useState<CaseCategory | 'all'>('all')
  const [selected, setSelected] = useState<CaseView | null>(null)
  const [open, setOpen] = useState(false)

  const { groups } = useMemo(() => layoutCases(cases), [cases])

  const categories = useMemo(() => groups.map((g) => g.category), [groups])

  const visibleGroups = useMemo(
    () => (category === 'all' ? groups : groups.filter((g) => g.category === category)),
    [groups, category],
  )

  const openDetail = (c: CaseView) => {
    setSelected(c)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Social proof FIRST — real recent wins lead the storefront ("другие уже
          выигрывают"), затем фильтры и каталог. */}
      {category === 'all' && <RecentWins wins={recentWins} />}

      {/* Category filters — the screen opens directly on the catalog (App Store /
          Steam pattern). No featured stage dominates the first viewport; the top
          case still leads its category group as a normal row. */}
      {categories.length > 1 && (
        <ChipGroup>
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>
            Все
          </Chip>
          {categories.map((cat) => (
            <Chip
              key={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
              icon={<Glyph name={CASE_CATEGORY_META[cat].glyph as GlyphName} className="h-3.5 w-3.5" />}
            >
              {CASE_CATEGORY_META[cat].label}
            </Chip>
          ))}
        </ChipGroup>
      )}

      {/* Grouped grid */}
      {visibleGroups.map((g) => (
        <section key={g.category}>
          {(category === 'all' || visibleGroups.length > 1) && (
            <SectionTitle
              size="md"
              icon={<Glyph name={CASE_CATEGORY_META[g.category].glyph as GlyphName} className="h-5 w-5 text-accent-indigo" />}
              eyebrow={`${g.cases.length} ${g.cases.length === 1 ? 'кейс' : 'кейсов'}`}
              className="mb-2 px-0.5"
            >
              {CASE_CATEGORY_META[g.category].label}
            </SectionTitle>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {g.cases.map((c) => (
              <CaseTile
                key={c.itemCode}
                caseView={c}
                opens={openCounts[c.itemCode]}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
        </section>
      ))}

      <CaseDetailSheet caseView={selected} open={open} onOpenChange={setOpen} />
    </div>
  )
}
