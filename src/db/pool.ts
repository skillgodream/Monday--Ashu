/**
 * GURU COACH LMS - DATABASE CONNECTION POOL
 *
 * Manages PostgreSQL connection lifecycle with strict bounded timeouts,
 * connection pooling, and non-crashing health checks.
 */

import dotenv from 'dotenv';
import pg, { QueryResultRow } from 'pg';
const { Pool } = pg;

dotenv.config();

let poolInstance: pg.Pool | null = null;

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.trim().length > 10 && !url.includes('placeholder'));
}

export function getDatabasePool(): pg.Pool | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL!.trim();
    const useSsl =
      process.env.DATABASE_SSL === 'true' ||
      connectionString.includes('sslmode=require') ||
      connectionString.includes('supabase.co') ||
      connectionString.includes('supabase.com') ||
      (process.env.NODE_ENV === 'production' && !connectionString.includes('localhost'));

    poolInstance = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PGPOOL_MAX) || 10,
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 5000,
      statement_timeout: 10000,
    });

    poolInstance.on('error', (err) => {
      console.warn('[Database Pool Warning] Idle client connection error:', err.message);
    });
  }

  return poolInstance;
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  configured: boolean;
  latencyMs?: number;
  serverTime?: string;
  version?: string;
  error?: string;
}> {
  if (!isDatabaseConfigured()) {
    return {
      connected: false,
      configured: false,
      error: 'DATABASE_URL is not configured in environment variables',
    };
  }

  const pool = getDatabasePool();
  if (!pool) {
    return {
      connected: false,
      configured: false,
      error: 'Failed to initialize database pool',
    };
  }

  const start = Date.now();
  try {
    const res = await pool.query('SELECT NOW() as now, version() as version;');
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      configured: true,
      latencyMs,
      serverTime: res.rows[0]?.now?.toISOString?.() || String(res.rows[0]?.now),
      version: res.rows[0]?.version?.split(' ')?.[0] || 'PostgreSQL',
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      error: err?.message || 'Connection check failed',
    };
  }
}

/**
 * Executes a query with safe error capturing and optional transaction client.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
  client?: pg.PoolClient
): Promise<pg.QueryResult<T>> {
  const runner = client || getDatabasePool();
  if (!runner) {
    throw new Error('DATABASE_NOT_CONFIGURED: DATABASE_URL is not set.');
  }

  try {
    return await runner.query<T>(text, params);
  } catch (err: any) {
    // Redact credentials from error messages if present
    const safeMsg = (err?.message || 'Database query error').replace(
      /postgresql:\/\/[^:]+:[^@]+@/g,
      'postgresql://[redacted]:[redacted]@'
    );
    const dbError = new Error(safeMsg);
    (dbError as any).code = err?.code;
    (dbError as any).detail = err?.detail;
    throw dbError;
  }
}

/**
 * Runs a callback inside a PostgreSQL transaction with automatic rollback on error.
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDatabasePool();
  if (!pool) {
    throw new Error('DATABASE_NOT_CONFIGURED: Cannot start transaction without DATABASE_URL.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end().catch(() => {});
    poolInstance = null;
  }
}
