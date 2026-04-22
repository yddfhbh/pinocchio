import { isAdminRequest } from "./_admin-auth.js";
import { query } from "./_db.js";
import {
  isInvalidJsonBodyError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "./_response.js";

const SCHEDULE_TITLE_LIMIT = 80;
const SCHEDULE_DESCRIPTION_LIMIT = 300;
const SCHEDULE_PREVIEW_LIMIT = 90;

function normalizeTime(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return /^\d{2}:\d{2}$/.test(trimmedValue) ? trimmedValue : null;
}

function normalizeDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) ? trimmedValue : null;
}

function normalizeCategory(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue.slice(0, 30) : null;
}

function normalizeEntryInput(body) {
  const title =
    typeof body?.title === "string" ? body.title.trim().slice(0, SCHEDULE_TITLE_LIMIT) : "";
  const description =
    typeof body?.description === "string"
      ? body.description.trim().slice(0, SCHEDULE_DESCRIPTION_LIMIT)
      : "";
  const eventDate = normalizeDate(body?.eventDate);
  const startTime = normalizeTime(body?.startTime);
  const endTime = normalizeTime(body?.endTime);
  const category = normalizeCategory(body?.category);

  return {
    title,
    description: description || null,
    eventDate,
    startTime,
    endTime,
    category,
  };
}

function toEntry(row) {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    eventDate:
      row.event_date instanceof Date
        ? row.event_date.toISOString().slice(0, 10)
        : String(row.event_date).slice(0, 10),
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

async function listEntries(limit) {
  const params = [];
  let whereSql = "";
  let limitSql = "";

  if (limit) {
    whereSql = "WHERE event_date >= CURRENT_DATE";
    params.push(limit);
    limitSql = `LIMIT $${params.length}`;
  }

  const result = await query(
    `SELECT id, title, description, category, event_date, start_time, end_time
     FROM schedule_entries
     ${whereSql}
     ORDER BY event_date ASC, start_time ASC NULLS LAST, id ASC
     ${limitSql}`,
    params
  );

  return result.rows.map(toEntry);
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    const rawLimit = Number.parseInt(String(request.query?.limit ?? ""), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, SCHEDULE_PREVIEW_LIMIT)
        : null;

    try {
      return sendJson(response, 200, {
        entries: await listEntries(limit),
        isAdmin: isAdminRequest(request),
      });
    } catch (error) {
      return sendServerError(response, "일정을 불러오지 못했습니다.", error);
    }
  }

  if (!isAdminRequest(request)) {
    return sendJson(response, 401, {
      error: "관리자만 일정을 수정할 수 있습니다.",
    });
  }

  if (request.method === "POST") {
    try {
      const { title, description, category, eventDate, startTime, endTime } =
        normalizeEntryInput(await readJsonBody(request));

      if (!title || !eventDate) {
        return sendJson(response, 400, {
          error: "일정 제목과 날짜를 입력해주세요.",
        });
      }

      const result = await query(
        `INSERT INTO schedule_entries (
          title, description, category, event_date, start_time, end_time
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, description, category, event_date, start_time, end_time`,
        [title, description, category, eventDate, startTime, endTime]
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

      return sendServerError(response, "일정을 등록하지 못했습니다.", error);
    }
  }

  if (request.method === "PUT") {
    try {
      const body = await readJsonBody(request);
      const id = Number.parseInt(String(body?.id ?? ""), 10);
      const { title, description, category, eventDate, startTime, endTime } =
        normalizeEntryInput(body);

      if (!Number.isFinite(id) || !title || !eventDate) {
        return sendJson(response, 400, {
          error: "수정할 일정과 필수 항목을 확인해주세요.",
        });
      }

      const result = await query(
        `UPDATE schedule_entries
         SET title = $1,
             description = $2,
             category = $3,
             event_date = $4,
             start_time = $5,
             end_time = $6,
             updated_at = NOW()
         WHERE id = $7
         RETURNING id, title, description, category, event_date, start_time, end_time`,
        [title, description, category, eventDate, startTime, endTime, id]
      );

      if (!result.rows.length) {
        return sendJson(response, 404, {
          error: "수정할 일정을 찾지 못했습니다.",
        });
      }

      return sendJson(response, 200, {
        entry: toEntry(result.rows[0]),
      });
    } catch (error) {
      if (isInvalidJsonBodyError(error)) {
        return sendJson(response, 400, {
          error: "잘못된 요청 본문입니다.",
        });
      }

      return sendServerError(response, "일정을 수정하지 못했습니다.", error);
    }
  }

  if (request.method === "DELETE") {
    try {
      const body = await readJsonBody(request);
      const id = Number.parseInt(String(body?.id ?? ""), 10);

      if (!Number.isFinite(id)) {
        return sendJson(response, 400, {
          error: "삭제할 일정을 선택해주세요.",
        });
      }

      const result = await query(
        `DELETE FROM schedule_entries
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (!result.rows.length) {
        return sendJson(response, 404, {
          error: "삭제할 일정을 찾지 못했습니다.",
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

      return sendServerError(response, "일정을 삭제하지 못했습니다.", error);
    }
  }

  return sendMethodNotAllowed(response, ["GET", "POST", "PUT", "DELETE"]);
}
