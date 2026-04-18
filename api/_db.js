import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

let pool;
let initPromise;

function getPool() {
  const connectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL 또는 POSTGRES_URL이 설정되지 않았습니다. Vercel 프로젝트 환경 변수에 Postgres 연결 문자열을 추가해주세요."
    );
  }

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
    initPromise = query(
      `CREATE TABLE IF NOT EXISTS guestbook_entries (
        id BIGSERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    ).catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}
