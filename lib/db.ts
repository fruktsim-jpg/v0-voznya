// Build-time guard: importing this module (and anything that transitively
// pulls in `pg`) from a Client Component must fail loudly here, not deep inside
// the bundler with cryptic dns/fs/net errors. `server-only` throws if this code
// ever lands in a client bundle. Ships with Next — no extra dependency.
import 'server-only'
import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import { logDbError } from './db-logging'



/**
 * Singleton PostgreSQL pool shared across hot reloads / serverless invocations.
 *
 * Connection string comes from DATABASE_URL. The bot itself uses an asyncpg
 * URL (postgresql+asyncpg://...); node-postgres needs a plain libpq URL, so we
 * strip the SQLAlchemy "+asyncpg" / "+psycopg" driver suffix if present.
 */
declare global {
  // eslint-disable-next-line no-var
  var __voznyaPgPool: Pool | undefined
}

function normalizeConnectionString(raw: string): string {
  return raw.replace(/^postgresql\+\w+:\/\//, 'postgresql://').replace(/^postgres\+\w+:\/\//, 'postgres://')
}

export function getPool(): Pool {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('DATABASE_URL is not configured')
  }

  if (!global.__voznyaPgPool) {
    const connectionString = normalizeConnectionString(raw)
    const needsSsl = /sslmode=require/i.test(connectionString) || process.env.PGSSL === 'require'
    global.__voznyaPgPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    })
  }
  return global.__voznyaPgPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getPool()
  try {
    const result = await pool.query<T>(text, params as never[])
    return result.rows
  } catch (error) {
    // Log centrally before the error reaches a caller's `catch { return [] }`,
    // so an outage/schema drift never silently looks like "no data" (P0 #6).
    logDbError('query', error, text)
    throw error
  }
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

/**
 * Runs `fn` inside a single transaction on one pooled client. Commits on
 * success, rolls back on any thrown error, and always releases the client.
 * Used by admin actions that must be atomic (e.g. balance change + audit row).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore rollback failure; original error is more useful
    }
    logDbError('transaction', error)
    throw error
  } finally {
    client.release()
  }
}


