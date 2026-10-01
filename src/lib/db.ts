import "server-only";
import { Pool, type QueryResultRow } from "pg";

/**
 * Postgres connection (Neon on Vercel, any Postgres locally).
 * The Neon integration in Vercel sets DATABASE_URL automatically.
 */
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

export const dbConfigured = Boolean(connectionString);

const globalForDb = globalThis as unknown as { pgPool?: Pool; schemaReady?: Promise<void> };

function pool() {
  if (!connectionString) throw new Error("DATABASE_URL missing");
  if (!globalForDb.pgPool) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
    globalForDb.pgPool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      ssl: local ? false : { rejectUnauthorized: true },
    });
  }
  return globalForDb.pgPool;
}

/** Creates tables and indexes on first use. No separate migration step needed. */
function ensureSchema() {
  if (!globalForDb.schemaReady) {
    globalForDb.schemaReady = (async () => {
      const p = pool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id            TEXT PRIMARY KEY,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          product_id    TEXT NOT NULL,
          product_name  TEXT NOT NULL,
          months        INT  NOT NULL,
          hours         INT,
          price_cents   INT  NOT NULL,
          device        TEXT NOT NULL,
          payment       TEXT NOT NULL,
          name          TEXT NOT NULL,
          email         TEXT NOT NULL,
          phone         TEXT,
          status        TEXT NOT NULL DEFAULT 'neu',
          paid_at       TIMESTAMPTZ,
          activated_at  TIMESTAMPTZ,
          expires_at    TIMESTAMPTZ,
          crypto_coin   TEXT,
          crypto_amount TEXT,
          txid          TEXT,
          note          TEXT
        )`);
      await p.query(`CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC)`);
      await p.query(`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status)`);
      await p.query(`CREATE INDEX IF NOT EXISTS orders_expires_idx ON orders (expires_at)`);
      await p.query(`CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (lower(email))`);
      // Admin security: server-side sessions, sign-in/audit log, settings (2FA key, stored encrypted)
      await p.query(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          token_hash  TEXT PRIMARY KEY,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at  TIMESTAMPTZ NOT NULL,
          cred        TEXT NOT NULL,
          ip          TEXT,
          user_agent  TEXT
        )`);
      await p.query(`
        CREATE TABLE IF NOT EXISTS admin_events (
          id          BIGSERIAL PRIMARY KEY,
          at          TIMESTAMPTZ NOT NULL DEFAULT now(),
          event       TEXT NOT NULL,
          ip          TEXT,
          user_agent  TEXT,
          detail      TEXT
        )`);
      await p.query(`CREATE INDEX IF NOT EXISTS admin_events_at_idx ON admin_events (at DESC)`);
      await p.query(`CREATE INDEX IF NOT EXISTS admin_events_ip_idx ON admin_events (ip, at DESC)`);
      await p.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          key         TEXT PRIMARY KEY,
          value       TEXT NOT NULL,
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
    })().catch((e) => {
      globalForDb.schemaReady = undefined; // retry on next call
      throw e;
    });
  }
  return globalForDb.schemaReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  await ensureSchema();
  const res = await pool().query<T>(text, params);
  return res.rows;
}
