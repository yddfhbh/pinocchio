import { del } from "@vercel/blob";
import { isAdminRequest } from "./_auth.js";
import { ensureScoreTable, query } from "./_db.js";

const TITLE_LIMIT = 120;
const SHORT_TEXT_LIMIT = 80;
const CATEGORY_LIMIT = 30;
const INSTRUMENTATION_LIMIT = 60;
const DIFFICULTY_LIMIT = 20;
const DESCRIPTION_LIMIT = 500;

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

function normalizeText(value, limit) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue.slice(0, limit) : null;
}

function normalizeUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeEntryInput(body) {
  return {
    title: normalizeText(body?.title, TITLE_LIMIT) || "",
    composer: normalizeText(body?.composer, SHORT_TEXT_LIMIT),
    arranger: normalizeText(body?.arranger, SHORT_TEXT_LIMIT),
    category: normalizeText(body?.category, CATEGORY_LIMIT),
    instrumentation: normalizeText(body?.instrumentation, INSTRUMENTATION_LIMIT),
    difficulty: normalizeText(body?.difficulty, DIFFICULTY_LIMIT),
    description: normalizeText(body?.description, DESCRIPTION_LIMIT),
    sourceUrl: normalizeUrl(body?.sourceUrl),
    fileName: normalizeText(body?.fileName, 180),
    fileSize: Number.isFinite(Number(body?.fileSize))
      ? Math.max(0, Math.trunc(Number(body.fileSize)))
      : null,
  };
}

function toEntry(row) {
  return {
    id: String(row.id),
    title: row.title,
    composer: row.composer,
    arranger: row.arranger,
    category: row.category,
    instrumentation: row.instrumentation,
    difficulty: row.difficulty,
    description: row.description,
    sourceUrl: row.source_url,
    fileName: row.file_name,
    fileSize: row.file_size === null ? null : Number(row.file_size),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

async function listEntries() {
  const result = await query(
    `SELECT
      id,
      title,
      composer,
      arranger,
      category,
      instrumentation,
      difficulty,
      description,
      source_url,
      file_name,
      file_size,
      created_at,
      updated_at
     FROM score_entries
     ORDER BY updated_at DESC, title ASC, id DESC`
  );

  return result.rows.map(toEntry);
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    try {
      await ensureScoreTable();

      return sendJson(response, 200, {
        entries: await listEntries(),
        isAdmin: isAdminRequest(request),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "악보 저장소를 불러오지 못했습니다.",
      });
    }
  }

  if (request.method === "POST") {
    try {
      await ensureScoreTable();
      const entry = normalizeEntryInput(await readBody(request));

      if (!entry.title || !entry.sourceUrl) {
        return sendJson(response, 400, {
          error: "곡명과 악보 링크를 입력해 주세요.",
        });
      }

      const result = await query(
        `INSERT INTO score_entries (
          title,
          composer,
          arranger,
          category,
          instrumentation,
          difficulty,
          description,
          source_url,
          file_name,
          file_size
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          title,
          composer,
          arranger,
          category,
          instrumentation,
          difficulty,
          description,
          source_url,
          file_name,
          file_size,
          created_at,
          updated_at`,
        [
          entry.title,
          entry.composer,
          entry.arranger,
          entry.category,
          entry.instrumentation,
          entry.difficulty,
          entry.description,
          entry.sourceUrl,
          entry.fileName,
          entry.fileSize,
        ]
      );

      return sendJson(response, 201, {
        entry: toEntry(result.rows[0]),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error ? error.message : "악보를 등록하지 못했습니다.",
      });
    }
  }

  if (!isAdminRequest(request)) {
    return sendJson(response, 401, {
      error: "관리자만 악보를 수정하거나 삭제할 수 있습니다.",
    });
  }

  if (request.method === "PUT") {
    try {
      await ensureScoreTable();
      const body = await readBody(request);
      const id = Number.parseInt(String(body?.id ?? ""), 10);
      const entry = normalizeEntryInput(body);

      if (!Number.isFinite(id) || !entry.title || !entry.sourceUrl) {
        return sendJson(response, 400, {
          error: "수정할 악보와 필수 항목을 확인해 주세요.",
        });
      }

      const result = await query(
        `UPDATE score_entries
         SET title = $1,
             composer = $2,
             arranger = $3,
             category = $4,
             instrumentation = $5,
             difficulty = $6,
             description = $7,
             source_url = $8,
             file_name = $9,
             file_size = $10,
             updated_at = NOW()
         WHERE id = $11
         RETURNING
           id,
           title,
           composer,
           arranger,
           category,
           instrumentation,
           difficulty,
           description,
           source_url,
           file_name,
           file_size,
           created_at,
           updated_at`,
        [
          entry.title,
          entry.composer,
          entry.arranger,
          entry.category,
          entry.instrumentation,
          entry.difficulty,
          entry.description,
          entry.sourceUrl,
          entry.fileName,
          entry.fileSize,
          id,
        ]
      );

      if (!result.rows.length) {
        return sendJson(response, 404, {
          error: "수정할 악보를 찾지 못했습니다.",
        });
      }

      return sendJson(response, 200, {
        entry: toEntry(result.rows[0]),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error ? error.message : "악보를 수정하지 못했습니다.",
      });
    }
  }

  if (request.method === "DELETE") {
    try {
      await ensureScoreTable();
      const body = await readBody(request);
      const id = Number.parseInt(String(body?.id ?? ""), 10);

      if (!Number.isFinite(id)) {
        return sendJson(response, 400, {
          error: "삭제할 악보를 선택해 주세요.",
        });
      }

      const result = await query(
        `DELETE FROM score_entries
         WHERE id = $1
         RETURNING id, source_url, file_name`,
        [id]
      );

      if (!result.rows.length) {
        return sendJson(response, 404, {
          error: "삭제할 악보를 찾지 못했습니다.",
        });
      }

      if (result.rows[0].file_name && result.rows[0].source_url) {
        await del(result.rows[0].source_url).catch(() => {});
      }

      return sendJson(response, 200, {
        deletedId: String(result.rows[0].id),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error ? error.message : "악보를 삭제하지 못했습니다.",
      });
    }
  }

  response.setHeader("Allow", "GET, POST, PUT, DELETE");
  return sendJson(response, 405, {
    error: "허용되지 않은 요청 방식입니다.",
  });
}
