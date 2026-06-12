'use client'

import type { ReactNode } from 'react'

/**
 * <AdminForm> + field primitives (CC Foundation). One input style for the whole
 * platform (was a copy-pasted `inputClass` string per editor). Field wraps label
 * + control + hint/error. Controls are thin styled wrappers — no form-state lib,
 * callers keep their own state (works with useAdminMutation for submit).
 */

export const fieldInputClass =
  'w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 disabled:opacity-50'

export function AdminForm({
  children,
  onSubmit,
  className = '',
}: {
  children: ReactNode
  onSubmit?: () => void
  className?: string
}) {
  return (
    <form
      className={`space-y-3 ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      {children}
    </form>
  )
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive-foreground"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] text-destructive-foreground">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-muted-foreground/70">{hint}</span>
      ) : null}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  mono?: boolean
}) {
  return (
    <input
      className={`${fieldInputClass} ${mono ? 'font-mono' : ''}`}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}) {
  return (
    <textarea
      className={fieldInputClass}
      value={value}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function SelectInput({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly { value: string; label: string }[] | readonly string[]
  disabled?: boolean
}) {
  const opts = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o,
  )
  return (
    <select
      className={fieldInputClass}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input bg-white/[0.04] accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

export function SubmitButton({
  children,
  busy,
  disabled,
}: {
  children: ReactNode
  busy?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
    >
      {busy ? 'Сохранение…' : children}
    </button>
  )
}
