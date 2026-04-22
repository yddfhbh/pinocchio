import {
  assertAdminCode,
  clearAdminSessionCookie,
  createAdminSessionCookie,
  isAdminAuthConfigurationError,
  isAdminAuthConfigured,
  isAdminRequest,
} from "./_admin-auth.js";
import { clearRateLimit, enforceRateLimit } from "./_rate-limit.js";
import {
  isInvalidJsonBodyError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "./_response.js";

const LOGIN_RATE_LIMIT_KEY = "admin-login";
const LOGIN_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export default async function handler(request, response) {
  if (request.method === "GET") {
    return sendJson(response, 200, {
      isAdmin: isAdminRequest(request),
      isConfigured: isAdminAuthConfigured(),
    });
  }

  if (request.method === "POST") {
    if (
      !enforceRateLimit(request, response, {
        keyPrefix: LOGIN_RATE_LIMIT_KEY,
        max: LOGIN_RATE_LIMIT_MAX,
        message: "Too many admin login attempts. Please try again later.",
        windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
      })
    ) {
      return;
    }

    try {
      const body = await readJsonBody(request);

      const code = typeof body?.code === "string" ? body.code.trim() : "";

      if (!assertAdminCode(code)) {
        return sendJson(response, 401, {
          error: "관리자 코드가 올바르지 않습니다.",
        });
      }

      clearRateLimit(request, LOGIN_RATE_LIMIT_KEY);

      return sendJson(
        response,
        200,
        { isAdmin: true },
        { "Set-Cookie": createAdminSessionCookie() }
      );
    } catch (error) {
      if (isAdminAuthConfigurationError(error)) {
        return sendJson(response, 503, {
          error: error.message,
          isConfigured: false,
        });
      }

      if (isInvalidJsonBodyError(error)) {
        return sendJson(response, 400, {
          error: "Invalid request body.",
        });
      }

      return sendServerError(
        response,
        "Unable to log in with the admin code.",
        error
      );

      /* return sendJson(response, 500, {
        error:
          error instanceof Error
            ? error.message
            : "관리자 로그인에 실패했습니다.",
      }); */
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

  return sendMethodNotAllowed(response, ["GET", "POST", "DELETE"]);
  /* response.setHeader("Allow", "GET, POST, DELETE");
  return sendJson(response, 405, {
    error: "허용되지 않은 요청 방식입니다.",
  }); */
}
