import {
  DEFAULT_GUESTBOOK_ENTRIES,
  GUESTBOOK_ENTRY_LIMIT,
  GUESTBOOK_MESSAGE_LIMIT,
  GUESTBOOK_NICKNAME_LIMIT,
} from "../src/lib/guestbook.js";
import { ensureGuestbookTable, query } from "./_db.js";

function toEntry(row) {
  return {
    id: String(row.id),
    nickname: row.nickname,
    message: row.message,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString(),
  };
}

function sendJson(response, statusCode, payload) {
  response.status(statusCode).setHeader("Content-Type", "application/json");
  response.send(JSON.stringify(payload));
}

async function readBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  return {};
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    const rawLimit = Number.parseInt(String(request.query?.limit ?? ""), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, GUESTBOOK_ENTRY_LIMIT)
        : GUESTBOOK_ENTRY_LIMIT;

    try {
      await ensureGuestbookTable();

      const result = await query(
        `SELECT id, nickname, message, created_at
         FROM guestbook_entries
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return sendJson(response, 200, {
        entries: result.rows.map(toEntry),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "방명록을 불러오지 못했습니다.",
        entries: DEFAULT_GUESTBOOK_ENTRIES.slice(0, limit),
      });
    }
  }

  if (request.method === "POST") {
    try {
      const body = await readBody(request);
      const nickname =
        typeof body?.nickname === "string"
          ? body.nickname.trim().slice(0, GUESTBOOK_NICKNAME_LIMIT)
          : "";
      const message =
        typeof body?.message === "string"
          ? body.message.trim().slice(0, GUESTBOOK_MESSAGE_LIMIT)
          : "";

      if (!message) {
        return sendJson(response, 400, {
          error: "메시지를 입력한 뒤 등록해주세요.",
        });
      }

      await ensureGuestbookTable();

      const result = await query(
        `INSERT INTO guestbook_entries (nickname, message)
         VALUES ($1, $2)
         RETURNING id, nickname, message, created_at`,
        [nickname || null, message]
      );

      return sendJson(response, 201, {
        entry: toEntry(result.rows[0]),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "방명록을 등록하지 못했습니다.",
      });
    }
  }

  response.setHeader("Allow", "GET, POST");
  return sendJson(response, 405, {
    error: "허용되지 않은 요청 방식입니다.",
  });
}
