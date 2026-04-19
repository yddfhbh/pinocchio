import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

let pool;
let guestbookInitPromise;
let scheduleInitPromise;
let homeVideoInitPromise;
let aboutContentInitPromise;

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
          category VARCHAR(30) NOT NULL DEFAULT 'regular',
          is_home_featured BOOLEAN NOT NULL DEFAULT FALSE,
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
      await query(
        `ALTER TABLE home_videos
         ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'regular'`
      );
      await query(
        `ALTER TABLE home_videos
         ADD COLUMN IF NOT EXISTS is_home_featured BOOLEAN NOT NULL DEFAULT FALSE`
      );
      await query(
        `UPDATE home_videos
         SET category = 'regular'
         WHERE category IS NULL OR category = ''`
      );
      await query(
        `UPDATE home_videos
         SET is_home_featured = FALSE
         WHERE is_home_featured IS NULL`
      );
      await query(
        `WITH first_video AS (
          SELECT id
          FROM home_videos
          ORDER BY created_at ASC, id ASC
          LIMIT 1
        )
        UPDATE home_videos
        SET is_home_featured = TRUE
        WHERE id IN (SELECT id FROM first_video)
          AND NOT EXISTS (
            SELECT 1
            FROM home_videos
            WHERE is_home_featured = TRUE
          )`
      );
      await query(
        `CREATE UNIQUE INDEX IF NOT EXISTS home_videos_single_home_featured_idx
         ON home_videos ((1))
         WHERE is_home_featured = TRUE`
      );
    })().catch((error) => {
      homeVideoInitPromise = null;
      throw error;
    });
  }

  return homeVideoInitPromise;
}

export async function ensureAboutContentTable() {
  if (!aboutContentInitPromise) {
    aboutContentInitPromise = (async () => {
      await query(
        `CREATE TABLE IF NOT EXISTS site_about_content (
          id SMALLINT PRIMARY KEY,
          intro TEXT NOT NULL,
          activity_title VARCHAR(80) NOT NULL,
          activities JSONB NOT NULL DEFAULT '[]'::jsonb,
          website_title VARCHAR(80) NOT NULL,
          website_items JSONB NOT NULL DEFAULT '[]'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT site_about_content_singleton CHECK (id = 1)
        )`
      );

      await query(
        `ALTER TABLE site_about_content
         ADD COLUMN IF NOT EXISTS intro TEXT NOT NULL DEFAULT ''`
      );
      await query(
        `ALTER TABLE site_about_content
         ADD COLUMN IF NOT EXISTS activity_title VARCHAR(80) NOT NULL DEFAULT ''`
      );
      await query(
        `ALTER TABLE site_about_content
         ADD COLUMN IF NOT EXISTS activities JSONB NOT NULL DEFAULT '[]'::jsonb`
      );
      await query(
        `ALTER TABLE site_about_content
         ADD COLUMN IF NOT EXISTS website_title VARCHAR(80) NOT NULL DEFAULT ''`
      );
      await query(
        `ALTER TABLE site_about_content
         ADD COLUMN IF NOT EXISTS website_items JSONB NOT NULL DEFAULT '[]'::jsonb`
      );
      await query(
        `ALTER TABLE site_about_content
         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
      );
      await query(
        `INSERT INTO site_about_content (
          id,
          intro,
          activity_title,
          activities,
          website_title,
          website_items
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb)
        ON CONFLICT (id) DO NOTHING`,
        [
          1,
          "PINOCCHIO는 음악과 연주를 좋아하는 학생들이 모여 함께 연습하고 공연을 만들어가는 밴드 동아리입니다.",
          "우리가 하는 활동",
          JSON.stringify([
            "정기 합주와 개인 연습",
            "교내외 공연 준비",
            "음악 공유와 파트 연습",
            "신입 부원 모집 및 교류 활동",
          ]),
          "홈페이지에서 볼 수 있는 것",
          JSON.stringify([
            "동아리 활동 소개 보기",
            "악보 자료 확인",
            "공연 영상 감상",
            "일정 확인",
            "방명록 작성",
          ]),
        ]
      );
    })().catch((error) => {
      aboutContentInitPromise = null;
      throw error;
    });
  }

  return aboutContentInitPromise;
}
