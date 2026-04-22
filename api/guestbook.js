import {
  DEFAULT_GUESTBOOK_ENTRIES,
  GUESTBOOK_ENTRY_LIMIT,
  GUESTBOOK_MESSAGE_LIMIT,
  GUESTBOOK_NICKNAME_LIMIT,
} from "../src/lib/guestbook.js";
import { isAdminRequest } from "./_admin-auth.js";
import { query } from "./_db.js";
import { enforceRateLimit } from "./_rate-limit.js";
import {
  isInvalidJsonBodyError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "./_response.js";

const GUESTBOOK_POST_RATE_LIMIT_KEY = "guestbook-post";
const GUESTBOOK_POST_RATE_LIMIT_MAX = 6;
const GUESTBOOK_POST_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function toEntry(row) {
  return {
    id: String(row.id),
    nickname: row.nickname,
    message: row.message,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    const rawLimit = Number.parseInt(String(request.query?.limit ?? ""), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, GUESTBOOK_ENTRY_LIMIT)
        : GUESTBOOK_ENTRY_LIMIT;

    try {
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
      return sendServerError(response, "방명록을 불러오지 못했습니다.", error, {
        entries: DEFAULT_GUESTBOOK_ENTRIES.slice(0, limit),
      });
    }
  }

  if (request.method === "POST") {
    if (
      !enforceRateLimit(request, response, {
        keyPrefix: GUESTBOOK_POST_RATE_LIMIT_KEY,
        max: GUESTBOOK_POST_RATE_LIMIT_MAX,
        message: "메시지를 너무 자주 남기고 있습니다. 잠시 후 다시 시도해 주세요.",
        windowMs: GUESTBOOK_POST_RATE_LIMIT_WINDOW_MS,
      })
    ) {
      return;
    }

    try {
      const body = await readJsonBody(request);
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
      if (isInvalidJsonBodyError(error)) {
        return sendJson(response, 400, {
          error: "잘못된 요청 본문입니다.",
        });
      }

      return sendServerError(response, "방명록을 등록하지 못했습니다.", error);
    }
  }

  if (request.method === "DELETE") {
    if (!isAdminRequest(request)) {
      return sendJson(response, 401, {
        error: "관리자만 방명록을 삭제할 수 있습니다.",
      });
    }

    try {
      const body = await readJsonBody(request);
      const id = Number.parseInt(String(body?.id ?? ""), 10);

      if (!Number.isFinite(id)) {
        return sendJson(response, 400, {
          error: "삭제할 방명록을 선택해주세요.",
        });
      }

      const result = await query(
        `DELETE FROM guestbook_entries
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (!result.rows.length) {
        return sendJson(response, 404, {
          error: "삭제할 방명록을 찾지 못했습니다.",
        });
      }

      return sendJson(response, 200, {
        deletedId: String(result.rows[0].id),
      });
    } catch (error) {
      if (isInvalidJsonBodyError(error)) {
        return sendJson(response, 400, {
          error: "잘못된 요청 본문입니다.",
        });
      }

      return sendServerError(response, "방명록을 삭제하지 못했습니다.", error);
    }
  }

  return sendMethodNotAllowed(response, ["GET", "POST", "DELETE"]);
}
