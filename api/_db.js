import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

let pool;
let initPromise;

function sanitizeConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);

    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");

    return url.toString();
  } catch {
    return connectionString;
  }
}

function getPool() {
  const rawConnectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!rawConnectionString) {
    throw new Error(
      "DATABASE_URL 또는 POSTGRES_URL이 설정되지 않았습니다. Vercel 프로젝트 환경 변수에 Postgres 연결 문자열을 추가해주세요."
    );
  }

  const connectionString = sanitizeConnectionString(rawConnectionString);

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl:
        process.env.POSTGRES_SSL === "disable"
          ? false
          : {
              rejectUnauthorized: false,
            },
    });

    attachDatabasePool(pool);
  }

  return pool;
}

export async function query(text, params) {
  const db = getPool();
  return db.query(text, params);
}

export async function ensureGuestbookTable() {
  if (!initPromise) {
    initPromise = (async () => {
      await query(
        `CREATE TABLE IF NOT EXISTS guestbook_entries (
          id BIGSERIAL PRIMARY KEY,
          nickname VARCHAR(10),
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      await query(
        `ALTER TABLE guestbook_entries
         ADD COLUMN IF NOT EXISTS nickname VARCHAR(10)`
      );
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}
