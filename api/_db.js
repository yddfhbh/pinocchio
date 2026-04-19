import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

let pool;
let guestbookInitPromise;
let scheduleInitPromise;
let homeVideoInitPromise;

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
  if (!guestbookInitPromise) {
    guestbookInitPromise = (async () => {
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
      guestbookInitPromise = null;
      throw error;
    });
  }

  return guestbookInitPromise;
}

export async function ensureScheduleTable() {
  if (!scheduleInitPromise) {
    scheduleInitPromise = (async () => {
      await query(
        `CREATE TABLE IF NOT EXISTS schedule_entries (
          id BIGSERIAL PRIMARY KEY,
          title VARCHAR(80) NOT NULL,
          description TEXT,
          category VARCHAR(30),
          event_date DATE NOT NULL,
          start_time VARCHAR(5),
          end_time VARCHAR(5),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      await query(
        `ALTER TABLE schedule_entries
         ADD COLUMN IF NOT EXISTS description TEXT`
      );
      await query(
        `ALTER TABLE schedule_entries
         ADD COLUMN IF NOT EXISTS category VARCHAR(30)`
      );
      await query(
        `ALTER TABLE schedule_entries
         ADD COLUMN IF NOT EXISTS start_time VARCHAR(5)`
      );
      await query(
        `ALTER TABLE schedule_entries
         ADD COLUMN IF NOT EXISTS end_time VARCHAR(5)`
      );
      await query(
        `ALTER TABLE schedule_entries
         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
      );
    })().catch((error) => {
      scheduleInitPromise = null;
      throw error;
    });
  }

  return scheduleInitPromise;
}

export async function ensureHomeVideosTable() {
  if (!homeVideoInitPromise) {
    homeVideoInitPromise = (async () => {
      await query(
        `CREATE TABLE IF NOT EXISTS home_videos (
          id BIGSERIAL PRIMARY KEY,
          title VARCHAR(120) NOT NULL,
          source_url TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      await query(
        `ALTER TABLE home_videos
         ADD COLUMN IF NOT EXISTS title VARCHAR(120)`
      );
      await query(
        `ALTER TABLE home_videos
         ADD COLUMN IF NOT EXISTS source_url TEXT`
      );
    })().catch((error) => {
      homeVideoInitPromise = null;
      throw error;
    });
  }

  return homeVideoInitPromise;
}
