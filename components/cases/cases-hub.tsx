'use client'

import { useMemo, useState } from 'react'
import { layoutCases, CASE_CATEGORY_META, type CaseView, type CaseCategory } from '@/lib/cases-ux'
import { Chip, ChipGroup } from '@/components/ds/chip'
import { FeaturedCard } from '@/components/cases/featured-card'
import { CaseTile } from '@/components/cases/case-tile'
import { CaseDetailSheet } from '@/components/cases/case-detail-sheet'

/**
 * CasesHub (Stage 3) — the orchestrator for the cases experience. A calm,
 * premium hub: a featured hero, category filters and a dense grid of cases that
 * communicate VALUE at a glance (rarity profile, chase reward, indicators).
 * Tapping any case opens the detail sheet, where the full opening experience
 * lives — so the grid never reflows mid-spin.
 *
 * Client component: holds only view state (active category + selected case).
 * All economy / RNG stays server-side (open_case via /api/cases/open). The
 * derivations (featured, groups, categories) come from lib/cases-ux — no fetch.
 */
export function CasesHub({ cases }: { cases: CaseView[] }) {
  const [category, setCategory] = useState<CaseCategory | 'all'>('all')
  const [selected, setSelected] = useState<CaseView | null>(null)
  const [open, setOpen] = useState(false)

  const { featured, groups } = useMemo(() => layoutCases(cases), [cases])

  // Categories present (for the filter chips), in the layout's stable order.
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
    <div className="space-y-5">
      {/* Featured hero — only on the unfiltered view (it's the anchor). */}
      {featured && category === 'all' && (
        <FeaturedCard caseView={featured} onOpenDetail={openDetail} />
      )}

      {/* Category filters */}
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
              icon={CASE_CATEGORY_META[cat].glyph}
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
            <h2 className="mb-2 flex items-center gap-1.5 px-0.5 text-sm font-bold text-foreground">
              <span aria-hidden="true">{CASE_CATEGORY_META[g.category].glyph}</span>
              {CASE_CATEGORY_META[g.category].label}
              <span className="text-muted-foreground">({g.cases.length})</span>
            </h2>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {g.cases.map((c) => (
              <CaseTile key={c.itemCode} caseView={c} onOpenDetail={openDetail} />
            ))}
          </div>
        </section>
      ))}

      <CaseDetailSheet caseView={selected} open={open} onOpenChange={setOpen} />
    </div>
  )
}
