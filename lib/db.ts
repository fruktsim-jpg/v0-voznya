import { Pool, type QueryResultRow } from 'pg'

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
