'use client'

import type { ReactNode } from 'react'

/**
 * <DataTable> (CC Foundation) — the shared list primitive. Generic over a row
 * type; columns render cells, plus optional leading visual (e.g. ItemArt) and
 * trailing row actions. Handles the empty state and a count header so every
 * module's list looks and behaves the same.
 */

export type Column<T> = {
  key: string
  header: string
  /** Cell renderer. */
  cell: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({
  title,
  rows,
  columns,
  rowKey,
  leading,
  actions,
  empty = 'Пока пусто.',
  toolbar,
}: {
  title?: string
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  /** Optional leading visual cell (icon / ItemArt). */
  leading?: (row: T) => ReactNode
  /** Optional trailing actions cell. */
  actions?: (row: T) => ReactNode
  empty?: string
  /** Optional controls rendered in the header (e.g. a search box / filters). */
  toolbar?: ReactNode
}) {
  return (
    <div className="glass overflow-hidden rounded-2xl border border-border">
      {(title || toolbar) && (
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2">
          {title && (
            <span className="text-xs font-medium text-muted-foreground">
              {title} ({rows.length})
            </span>
          )}
          {toolbar && <div className="flex min-w-0 items-center gap-2">{toolbar}</div>}
        </div>
      )}
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <ul className="divide-y divide-white/5">
          {rows.map((row) => (
            <li key={rowKey(row)} className="flex items-center gap-3 px-4 py-3">
              {leading && <div className="shrink-0">{leading(row)}</div>}
              <div className="grid min-w-0 flex-1 gap-x-3 gap-y-0.5 sm:grid-flow-col sm:auto-cols-fr">
                {columns.map((col) => (
                  <div key={col.key} className={`min-w-0 ${col.className ?? ''}`}>
                    {col.cell(row)}
                  </div>
                ))}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-1.5">{actions(row)}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
