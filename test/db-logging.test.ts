import { describe, it, expect, vi, afterEach } from 'vitest'
import { logDbError } from '@/lib/db-logging'

// P0 #6: verify DB failures are emitted as structured, classified log lines so
// an outage/schema-drift can't masquerade as an empty dashboard. We capture
// console.error and assert on the tag + payload.

function capture(fn: () => void): string {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  fn()
  const line = spy.mock.calls.map((c) => String(c[0])).join('\n')
  spy.mockRestore()
  return line
}

afterEach(() => vi.restoreAllMocks())

describe('logDbError', () => {
  it('tags schema drift (undefined_table) distinctly from generic errors', () => {
    const line = capture(() =>
      logDbError('query', { code: '42P01', message: 'relation "x" does not exist' }, 'SELECT * FROM x'),
    )
    expect(line).toContain('[db.schema_drift]')
    expect(line).toContain('"label":"undefined_table"')
    expect(line).toContain('"op":"query"')
  })

  it('tags connection refused as a generic db.error with a readable label', () => {
    const line = capture(() =>
      logDbError('query', { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' }),
    )
    expect(line).toContain('[db.error]')
    expect(line).toContain('"label":"connection_refused"')
  })

  it('truncates the SQL preview and never includes params', () => {
    const longSql = 'SELECT ' + 'a, '.repeat(100) + 'b FROM huge_table'
    const line = capture(() => logDbError('query', new Error('boom'), longSql))
    const payload = JSON.parse(line.replace('[db.error] ', ''))
    expect(payload.sqlPreview.length).toBeLessThanOrEqual(120)
    expect(line).not.toContain('params')
  })

  it('handles unknown/non-Error throwables without crashing', () => {
    const line = capture(() => logDbError('transaction', 'weird string failure'))
    expect(line).toContain('[db.error]')
    expect(line).toContain('weird string failure')
    expect(line).toContain('"op":"transaction"')
  })
})
