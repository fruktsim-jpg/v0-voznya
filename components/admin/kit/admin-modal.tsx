'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

/**
 * <AdminModal> (CC Foundation) — a lightweight centered modal / confirm dialog,
 * replacing raw window.confirm() for destructive actions. No external dep; locks
 * scroll + closes on Escape / backdrop click. `tone="danger"` styles the confirm.
 */

export function AdminModal({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  tone = 'default',
  busy = false,
}: {
  open: boolean
  title: string
  children?: ReactNode
  onClose: () => void
  onConfirm?: () => void
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  busy?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative w-full max-w-md rounded-2xl border border-border p-5 shadow-2xl">
        <h2 className="mb-2 text-base font-bold text-foreground">{title}</h2>
        {children && <div className="mb-4 text-sm text-muted-foreground">{children}</div>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-foreground transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={busy}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                tone === 'danger'
                  ? 'bg-destructive/90 text-destructive-foreground hover:bg-destructive'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {busy ? '…' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
