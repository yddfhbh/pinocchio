import crypto from "node:crypto";

const SESSION_COOKIE_NAME = "pinocchio_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const INVALID_ADMIN_CODE_VALUES = new Set([
  "change-this-admin-code",
  "replace-with-a-strong-admin-code",
  "replace-with-a-strong-unique-admin-code",
]);
const INVALID_SESSION_SECRET_VALUES = new Set([
  "change-this-session-secret",
  "replace-with-a-long-random-secret-at-least-32-characters",
]);

function getRequiredEnvValue(name, invalidValues = new Set()) {
  const value = process.env[name];

  if (!value || invalidValues.has(value)) {
    throw new Error(`${name} is not configured securely.`);
  }

  return value;
}

function getAdminCode() {
  const adminCode = getRequiredEnvValue(
    "ADMIN_CODE",
    INVALID_ADMIN_CODE_VALUES
  );

  if (!adminCode) {
    throw new Error(
      "ADMIN_CODE가 설정되지 않았습니다. Vercel 프로젝트 환경 변수에 관리자 코드를 추가해주세요."
    );
  }

  return adminCode;
}

function getSessionSecret() {
  const sessionSecret = getRequiredEnvValue(
    "ADMIN_SESSION_SECRET",
    INVALID_SESSION_SECRET_VALUES
  );

  if (sessionSecret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }

  if (!sessionSecret) {
    throw new Error(
      "ADMIN_SESSION_SECRET이 설정되지 않았습니다. Vercel 프로젝트 환경 변수에 세션 시크릿을 추가해주세요."
    );
  }

  return sessionSecret;
}

function signValue(value) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("hex");
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function parseCookies(request) {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce((cookies, part) => {
    const [name, ...rest] = part.trim().split("=");
    cookies[name] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

function getCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function createAdminSessionCookie() {
  const expiresAt = String(Date.now() + SESSION_TTL_SECONDS * 1000);
  const payload = expiresAt;
  const signature = signValue(payload);

  return serializeCookie(
    SESSION_COOKIE_NAME,
    encodeURIComponent(`${payload}.${signature}`),
    getCookieOptions()
  );
}

export function clearAdminSessionCookie() {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

export function isAdminRequest(request) {
  try {
    const cookies = parseCookies(request);
    const rawSession = cookies[SESSION_COOKIE_NAME];

    if (!rawSession) {
      return false;
    }

    const [expiresAt, signature] = rawSession.split(".");

    if (!expiresAt || !signature) {
      return false;
    }

    const expectedSignature = signValue(expiresAt);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return false;
    }

    return Number(expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export function assertAdminCode(code) {
  if (typeof code !== "string") {
    return false;
  }

  const expectedCodeBuffer = Buffer.from(getAdminCode());
  const providedCodeBuffer = Buffer.from(code);

  if (expectedCodeBuffer.length !== providedCodeBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedCodeBuffer, providedCodeBuffer);
}
