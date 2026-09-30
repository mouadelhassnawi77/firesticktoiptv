import "server-only";
import { Pool, type QueryResultRow } from "pg";

/**
 * Postgres-Verbindung (Neon auf Vercel, jede andere Postgres-Datenbank lokal).
 * Die Neon-Integration in Vercel setzt DATABASE_URL automatisch.
 */
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

export const dbConfigured = Boolean(connectionString);

const globalForDb = globalThis as unknown as { pgPool?: Pool; schemaReady?: Promise<void> };

function pool() {
  if (!connectionString) throw new Error("DATABASE_URL fehlt");
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

/** Legt Tabelle und Indizes beim ersten Zugriff an. Kein separates Migrations-Tool nötig. */
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
    })().catch((e) => {
      globalForDb.schemaReady = undefined; // beim nächsten Aufruf erneut versuchen
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
