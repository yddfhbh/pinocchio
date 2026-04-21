const BASE_JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const INVALID_JSON_BODY_ERROR = "INVALID_JSON_BODY";

export function sendJson(response, statusCode, payload, headers = {}) {
  response.status(statusCode);

  Object.entries({
    ...BASE_JSON_HEADERS,
    ...headers,
  }).forEach(([name, value]) => {
    response.setHeader(name, value);
  });

  response.send(JSON.stringify(payload));
}

export function sendMethodNotAllowed(response, methods) {
  const allow = Array.isArray(methods) ? methods.join(", ") : String(methods);

  return sendJson(
    response,
    405,
    { error: "Method not allowed." },
    { Allow: allow }
  );
}

export async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      throw new Error(INVALID_JSON_BODY_ERROR);
    }
  }

  return {};
}

export function isInvalidJsonBodyError(error) {
  return error instanceof Error && error.message === INVALID_JSON_BODY_ERROR;
}

export function sendServerError(response, fallbackMessage, error, extraPayload = {}) {
  if (error) {
    console.error(error);
  }

  return sendJson(response, 500, {
    error: fallbackMessage,
    ...extraPayload,
  });
}
