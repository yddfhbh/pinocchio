import {
  HOME_VIDEO_TITLE_LIMIT,
  HOME_VIDEO_URL_LIMIT,
  toHomeVideoEmbedUrl,
} from "../src/lib/homeVideos.js";
import { isAdminRequest } from "./_auth.js";
import { ensureHomeVideosTable, query } from "./_db.js";

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

function normalizeVideoInput(body) {
  const title =
    typeof body?.title === "string"
      ? body.title.trim().slice(0, HOME_VIDEO_TITLE_LIMIT)
      : "";
  const sourceUrl =
    typeof body?.sourceUrl === "string"
      ? body.sourceUrl.trim().slice(0, HOME_VIDEO_URL_LIMIT)
      : typeof body?.url === "string"
        ? body.url.trim().slice(0, HOME_VIDEO_URL_LIMIT)
        : "";

  return {
    title,
    sourceUrl,
    embedUrl: toHomeVideoEmbedUrl(sourceUrl),
  };
}

function toEntry(row) {
  return {
    id: String(row.id),
    title: row.title,
    sourceUrl: row.source_url,
  };
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    try {
      await ensureHomeVideosTable();

      const result = await query(
        `SELECT id, title, source_url
         FROM home_videos
         ORDER BY created_at ASC, id ASC`
      );

      return sendJson(response, 200, {
        entries: result.rows.map(toEntry),
        isAdmin: isAdminRequest(request),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "대표 공연 영상을 불러오지 못했습니다.",
      });
    }
  }

  if (!isAdminRequest(request)) {
    return sendJson(response, 401, {
      error: "관리자만 대표 공연 영상을 수정할 수 있습니다.",
    });
  }

  if (request.method === "POST") {
    try {
      await ensureHomeVideosTable();

      const { title, sourceUrl, embedUrl } = normalizeVideoInput(await readBody(request));

      if (!title || !sourceUrl) {
        return sendJson(response, 400, {
          error: "영상 제목과 URL을 모두 입력해주세요.",
        });
      }

      if (!embedUrl) {
        return sendJson(response, 400, {
          error: "유튜브 영상 주소만 등록할 수 있습니다.",
        });
      }

      const result = await query(
        `INSERT INTO home_videos (title, source_url)
         VALUES ($1, $2)
         RETURNING id, title, source_url`,
        [title, sourceUrl]
      );

      return sendJson(response, 201, {
        entry: toEntry(result.rows[0]),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "대표 공연 영상을 등록하지 못했습니다.",
      });
    }
  }

  if (request.method === "DELETE") {
    try {
      await ensureHomeVideosTable();

      const body = await readBody(request);
      const id = Number.parseInt(String(body?.id ?? ""), 10);

      if (!Number.isFinite(id)) {
        return sendJson(response, 400, {
          error: "삭제할 영상을 선택해주세요.",
        });
      }

      const result = await query(
        `DELETE FROM home_videos
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (!result.rows.length) {
        return sendJson(response, 404, {
          error: "삭제할 영상을 찾지 못했습니다.",
        });
      }

      return sendJson(response, 200, {
        deletedId: String(result.rows[0].id),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "대표 공연 영상을 삭제하지 못했습니다.",
      });
    }
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  return sendJson(response, 405, {
    error: "허용하지 않는 요청 방식입니다.",
  });
}
