'use client'

/**
 * <Feedback> (CC Foundation) — the one ok/error message line every admin tool
 * uses. Paired with `useAdminMutation`'s `{ ok, text }` shape.
 */
export type FeedbackMsg = { ok: boolean; text: string } | null

export function Feedback({ msg, className = '' }: { msg: FeedbackMsg; className?: string }) {
  if (!msg) return null
  return (
    <p
      className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'} ${className}`}
      role={msg.ok ? 'status' : 'alert'}
    >
      {msg.text}
    </p>
  )
}
