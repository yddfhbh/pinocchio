import {
  assertAdminCode,
  clearAdminSessionCookie,
  createAdminSessionCookie,
  isAdminRequest,
} from "./_auth.js";

function sendJson(response, statusCode, payload, headers = {}) {
  response.status(statusCode);
  Object.entries({
    "Content-Type": "application/json",
    ...headers,
  }).forEach(([name, value]) => {
    response.setHeader(name, value);
  });
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
    return sendJson(response, 200, {
      isAdmin: isAdminRequest(request),
    });
  }

  if (request.method === "POST") {
    try {
      const body = await readBody(request);

      if (!assertAdminCode(body?.code)) {
        return sendJson(response, 401, {
          error: "관리자 코드가 올바르지 않습니다.",
        });
      }

      return sendJson(
        response,
        200,
        { isAdmin: true },
        { "Set-Cookie": createAdminSessionCookie() }
      );
    } catch (error) {
      return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "관리자 로그인에 실패했습니다.",
      });
    }
  }

  if (request.method === "DELETE") {
    return sendJson(
      response,
      200,
      { isAdmin: false },
      { "Set-Cookie": clearAdminSessionCookie() }
    );
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  return sendJson(response, 405, {
    error: "허용되지 않은 요청 방식입니다.",
  });
}
