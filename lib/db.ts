import { Pool, type PoolClient, type QueryResultRow } from 'pg'


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
  const result = await pool.query<T>(text, params as never[])
  return result.rows
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
    throw error
  } finally {
    client.release()
  }
}


