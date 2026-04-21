import { handleUpload } from "@vercel/blob/client";
import { isAdminRequest } from "./_auth.js";
import { enforceRateLimit } from "./_rate-limit.js";
import {
  isInvalidJsonBodyError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from "./_response.js";

const MAX_SCORE_FILE_SIZE = 10 * 1024 * 1024;
const UPLOAD_RATE_LIMIT_KEY = "score-upload";
const UPLOAD_RATE_LIMIT_MAX = 10;
const UPLOAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isAllowedPdfPathname(pathname) {
  if (typeof pathname !== "string") {
    return false;
  }

  const trimmedPathname = pathname.trim();
  const hasControlCharacter = Array.from(trimmedPathname).some(
    (character) => character.charCodeAt(0) < 32
  );

  if (
    !trimmedPathname ||
    trimmedPathname.length > 120 ||
    /[\\/]/.test(trimmedPathname) ||
    hasControlCharacter
  ) {
    return false;
  }

  return trimmedPathname.toLowerCase().endsWith(".pdf");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendMethodNotAllowed(response, ["POST"]);
    /* return sendJson(response, 405, {
      error: "허용되지 않은 요청 방식입니다.",
    }); */
  }

  if (!isAdminRequest(request)) {
    return sendJson(response, 401, {
      error: "Admin access is required to upload score files.",
    });
  }

  if (
    !enforceRateLimit(request, response, {
      keyPrefix: UPLOAD_RATE_LIMIT_KEY,
      max: UPLOAD_RATE_LIMIT_MAX,
      message: "Too many upload attempts. Please try again later.",
      windowMs: UPLOAD_RATE_LIMIT_WINDOW_MS,
    })
  ) {
    return;
  }

  try {
    const body = await readJsonBody(request);

    if (!isAllowedPdfPathname(body?.pathname)) {
      return sendJson(response, 400, {
        error: "Only direct PDF filenames are allowed.",
      });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return sendJson(response, 503, {
        error:
          "PDF upload is disabled in this environment. Set BLOB_READ_WRITE_TOKEN or use a direct file URL instead.",
      });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_SCORE_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });

    return sendJson(response, 200, jsonResponse);
  } catch (error) {
    if (isInvalidJsonBodyError(error)) {
      return sendJson(response, 400, {
        error: "Invalid request body.",
      });
    }

    return sendServerError(
      response,
      "Unable to prepare the PDF upload.",
      error
    );

    /* return sendJson(response, 400, {
      error:
        error instanceof Error ? error.message : "악보 PDF 업로드를 준비하지 못했습니다.",
    }); */
  }
}
