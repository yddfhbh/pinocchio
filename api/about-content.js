import { isAdminRequest } from "./_admin-auth.js";
import { query } from "./_db.js";
import { normalizeAboutContent } from "../src/lib/aboutContent.js";
import {
  isInvalidJsonBodyError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "./_response.js";

function toContent(row) {
  return normalizeAboutContent({
    intro: row?.intro,
    activityTitle: row?.activity_title,
    activities: Array.isArray(row?.activities) ? row.activities : [],
    websiteTitle: row?.website_title,
    websiteItems: Array.isArray(row?.website_items) ? row.website_items : [],
  });
}

async function getStoredContent() {
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
      return sendServerError(response, "동아리 소개 내용을 불러오지 못했습니다.", error);
    }
  }

  if (!isAdminRequest(request)) {
    return sendJson(response, 401, {
      error: "관리자만 동아리 소개 내용을 수정할 수 있습니다.",
    });
  }

  if (request.method === "PUT") {
    try {
      const nextContent = normalizeAboutContent(await readJsonBody(request));
      const result = await query(
        `INSERT INTO site_about_content (
          id,
          intro,
          activity_title,
          activities,
          website_title,
          website_items,
          updated_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE
        SET intro = EXCLUDED.intro,
            activity_title = EXCLUDED.activity_title,
            activities = EXCLUDED.activities,
            website_title = EXCLUDED.website_title,
            website_items = EXCLUDED.website_items,
            updated_at = NOW()
        RETURNING intro, activity_title, activities, website_title, website_items`,
        [
          1,
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
      if (isInvalidJsonBodyError(error)) {
        return sendJson(response, 400, {
          error: "잘못된 요청 본문입니다.",
        });
      }

      return sendServerError(response, "동아리 소개 내용을 저장하지 못했습니다.", error);
    }
  }

  return sendMethodNotAllowed(response, ["GET", "PUT"]);
}
