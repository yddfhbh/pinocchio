import {
  DEFAULT_HOME_VIDEO_CATEGORY,
  HOME_VIDEO_DESCRIPTION_LIMIT,
  HOME_VIDEO_TITLE_LIMIT,
  HOME_VIDEO_URL_LIMIT,
  normalizeHomeVideoCategory,
  toHomeVideoEmbedUrl,
} from "../src/lib/homeVideos.js";
import { isAdminRequest } from "./_admin-auth.js";
import { query } from "./_db.js";
import {
  isInvalidJsonBodyError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "./_response.js";

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
  const description =
    typeof body?.description === "string"
      ? body.description.trim().slice(0, HOME_VIDEO_DESCRIPTION_LIMIT)
      : "";
  const category = normalizeHomeVideoCategory(body?.category);

  return {
    title,
    sourceUrl,
    description,
    category,
    isHomeFeatured: body?.isHomeFeatured === true,
    embedUrl: toHomeVideoEmbedUrl(sourceUrl),
  };
}

function toEntry(row) {
  return {
    id: String(row.id),
    title: row.title,
    sourceUrl: row.source_url,
    description: row.description || "",
    category: normalizeHomeVideoCategory(row.category || DEFAULT_HOME_VIDEO_CATEGORY),
    isHomeFeatured: row.is_home_featured === true,
  };
}

function isFeaturedOnlyRequest(request) {
  const rawValue = String(request.query?.featuredOnly ?? "").trim().toLowerCase();
  return rawValue === "1" || rawValue === "true";
}

async function listVideoEntries(featuredOnly) {
  const result = featuredOnly
    ? await query(
        `SELECT id, title, source_url, description, category, is_home_featured
         FROM home_videos
         WHERE is_home_featured = TRUE
         ORDER BY created_at DESC, id DESC
         LIMIT 1`
      )
    : await query(
        `SELECT id, title, source_url, description, category, is_home_featured
         FROM home_videos
         ORDER BY is_home_featured DESC, created_at ASC, id ASC`
      );

  return result.rows.map(toEntry);
}

async function findHomeFeaturedConflict(excludedId = null) {
  const params = [];
  let whereClause = "WHERE is_home_featured = TRUE";

  if (excludedId !== null) {
    params.push(excludedId);
    whereClause += ` AND id <> $${params.length}`;
  }

  const result = await query(
    `SELECT id, title
     FROM home_videos
     ${whereClause}
     LIMIT 1`,
    params
  );

  return result.rows[0] || null;
}

function parseVideoId(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function featuredConflictMessage(conflictRow) {
  return `"${conflictRow.title}" 영상이 이미 홈페이지용으로 설정되어 있습니다. 먼저 해당 영상을 해제해 주세요.`;
}

function isHomeFeaturedUniqueError(error) {
  return error && typeof error === "object" && error.code === "23505";
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    try {
      return sendJson(response, 200, {
        entries: await listVideoEntries(isFeaturedOnlyRequest(request)),
        isAdmin: isAdminRequest(request),
      });
    } catch (error) {
      return sendServerError(response, "대표 공연 영상을 불러오지 못했습니다.", error);
    }
  }

  if (!isAdminRequest(request)) {
    return sendJson(response, 401, {
      error: "관리자만 대표 공연 영상을 수정할 수 있습니다.",
    });
  }

  if (request.method === "POST") {
    try {
      const { title, sourceUrl, description, category, isHomeFeatured, embedUrl } =
        normalizeVideoInput(await readJsonBody(request));

      if (!title || !sourceUrl) {
        return sendJson(response, 400, {
          error: "영상 제목과 URL을 모두 입력해 주세요.",
        });
      }

      if (!embedUrl) {
        return sendJson(response, 400, {
          error: "유튜브 영상 주소만 등록할 수 있습니다.",
        });
      }

      if (isHomeFeatured) {
        const conflictRow = await findHomeFeaturedConflict();

        if (conflictRow) {
          return sendJson(response, 409, {
            error: featuredConflictMessage(conflictRow),
          });
        }
      }

      const result = await query(
        `INSERT INTO home_videos (title, source_url, description, category, is_home_featured)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, source_url, description, category, is_home_featured`,
        [title, sourceUrl, description || null, category, isHomeFeatured]
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

      if (isHomeFeaturedUniqueError(error)) {
        return sendJson(response, 409, {
          error: "이미 다른 영상이 홈페이지용으로 설정되어 있습니다. 먼저 해당 영상을 해제해 주세요.",
        });
      }

      return sendServerError(response, "대표 공연 영상을 등록하지 못했습니다.", error);
    }
  }

  if (request.method === "PATCH") {
    try {
      const body = await readJsonBody(request);
      const id = parseVideoId(body?.id);

      if (id === null) {
        return sendJson(response, 400, {
          error: "수정할 영상을 선택해 주세요.",
        });
      }

      const { title, sourceUrl, description, category, isHomeFeatured, embedUrl } =
        normalizeVideoInput(body);

      if (!title || !sourceUrl) {
        return sendJson(response, 400, {
          error: "영상 제목과 URL을 모두 입력해 주세요.",
        });
      }

      if (!embedUrl) {
        return sendJson(response, 400, {
          error: "유튜브 영상 주소만 등록할 수 있습니다.",
        });
      }

      if (isHomeFeatured) {
        const conflictRow = await findHomeFeaturedConflict(id);

        if (conflictRow) {
          return sendJson(response, 409, {
            error: featuredConflictMessage(conflictRow),
          });
        }
      }

      const result = await query(
        `UPDATE home_videos
         SET title = $1,
             source_url = $2,
             description = $3,
             category = $4,
             is_home_featured = $5
         WHERE id = $6
         RETURNING id, title, source_url, description, category, is_home_featured`,
        [title, sourceUrl, description || null, category, isHomeFeatured, id]
      );

      if (!result.rows.length) {
        return sendJson(response, 404, {
          error: "수정할 영상을 찾지 못했습니다.",
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

      if (isHomeFeaturedUniqueError(error)) {
        return sendJson(response, 409, {
          error: "이미 다른 영상이 홈페이지용으로 설정되어 있습니다. 먼저 해당 영상을 해제해 주세요.",
        });
      }

      return sendServerError(response, "대표 공연 영상을 수정하지 못했습니다.", error);
    }
  }

  if (request.method === "DELETE") {
    try {
      const body = await readJsonBody(request);
      const id = parseVideoId(body?.id);

      if (id === null) {
        return sendJson(response, 400, {
          error: "삭제할 영상을 선택해 주세요.",
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
      if (isInvalidJsonBodyError(error)) {
        return sendJson(response, 400, {
          error: "잘못된 요청 본문입니다.",
        });
      }

      return sendServerError(response, "대표 공연 영상을 삭제하지 못했습니다.", error);
    }
  }

  return sendMethodNotAllowed(response, ["GET", "POST", "PATCH", "DELETE"]);
}
