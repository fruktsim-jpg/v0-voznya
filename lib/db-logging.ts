// Structured DB error logging (P0 #6 — make fallback failures observable).
//
// Many loaders intentionally `catch { return [] | null }` so a transient DB
// hiccup degrades to an empty UI instead of a 500. The danger is that a real
// outage then looks identical to "no data". This logger is called from the
// central db.ts query path BEFORE the error reaches those catch blocks, so the
// failure is always recorded as an actionable operator signal — without
// changing the graceful-degradation behavior callers rely on.
import 'server-only'

// Postgres SQLSTATE classes worth distinguishing in logs/alerts.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_CODE_LABEL: Record<string, string> = {
  '42P01': 'undefined_table', // schema/migration drift — not a transient outage
  '42703': 'undefined_column', // schema drift
  '28P01': 'invalid_password', // auth/config
  '3D000': 'invalid_catalog', // wrong database
  '57P03': 'cannot_connect_now', // DB starting up
  '53300': 'too_many_connections',
  ECONNREFUSED: 'connection_refused', // DB unreachable
  ETIMEDOUT: 'connection_timeout',
}

export interface DbErrorInfo {
  op: 'query' | 'transaction'
  /** Short SQL preview (no params — params may contain user data/PII). */
  sqlPreview?: string
  code?: string
  label?: string
  message: string
}

function classify(error: unknown): { code?: string; label?: string; message: string } {
  const e = error as { code?: string; message?: string } | null
  const code = e?.code
  return {
    code,
    label: code ? PG_CODE_LABEL[code] : undefined,
    message: e?.message ?? String(error),
  }
}

/**
 * Logs a DB failure as a single structured line. Schema drift (undefined
 * table/column) is logged as a distinct, louder category because it usually
 * means a missing migration, not a transient outage — exactly the case that
 * silently shows empty dashboards.
 */
export function logDbError(
  op: DbErrorInfo['op'],
  error: unknown,
  sql?: string,
): void {
  const { code, label, message } = classify(error)
  const info: DbErrorInfo = {
    op,
    sqlPreview: sql ? sql.replace(/\s+/g, ' ').trim().slice(0, 120) : undefined,
    code,
    label,
    message,
  }
  const tag = label === 'undefined_table' || label === 'undefined_column'
    ? 'db.schema_drift'
    : 'db.error'
  // Single structured line — greppable in Vercel logs and alert-friendly.
  console.error(`[${tag}] ${JSON.stringify(info)}`)
}
