import { isAdminRequest } from "./_auth.js";
import { ensureAboutContentTable, query } from "./_db.js";
import { normalizeAboutContent } from "../src/lib/aboutContent.js";

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

function toContent(row) {
  return normalizeAboutContent({
    intro: row.intro,
    activityTitle: row.activity_title,
    activities: Array.isArray(row.activities) ? row.activities : [],
    websiteTitle: row.website_title,
    websiteItems: Array.isArray(row.website_items) ? row.website_items : [],
  });
}

async function getStoredContent() {
  await ensureAboutContentTable();

  const result = await query(
    `SELECT intro, activity_title, activities, website_title, website_items
     FROM site_about_content
     WHERE id = 1`
  );

  return toContent(result.rows[0]);
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    try {
      const content = await getStoredContent();

      return sendJson(response, 200, {
        content,
        isAdmin: isAdminRequest(request),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "동아리 소개 내용을 불러오지 못했습니다.",
      });
    }
  }

  if (!isAdminRequest(request)) {
    return sendJson(response, 401, {
      error: "관리자만 동아리 소개 내용을 수정할 수 있습니다.",
    });
  }

  if (request.method === "PUT") {
    try {
      await ensureAboutContentTable();

      const nextContent = normalizeAboutContent(await readBody(request));
      const result = await query(
        `UPDATE site_about_content
         SET intro = $1,
             activity_title = $2,
             activities = $3::jsonb,
             website_title = $4,
             website_items = $5::jsonb,
             updated_at = NOW()
         WHERE id = 1
         RETURNING intro, activity_title, activities, website_title, website_items`,
        [
          nextContent.intro,
          nextContent.activityTitle,
          JSON.stringify(nextContent.activities),
          nextContent.websiteTitle,
          JSON.stringify(nextContent.websiteItems),
        ]
      );

      return sendJson(response, 200, {
        content: toContent(result.rows[0]),
      });
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "동아리 소개 내용을 저장하지 못했습니다.",
      });
    }
  }

  response.setHeader("Allow", "GET, PUT");
  return sendJson(response, 405, {
    error: "허용되지 않는 요청 방식입니다.",
  });
}
