import { handleUpload } from "@vercel/blob/client";

const MAX_SCORE_FILE_SIZE = 10 * 1024 * 1024;

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

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, {
      error: "허용되지 않은 요청 방식입니다.",
    });
  }

  try {
    const body = await readBody(request);

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
    return sendJson(response, 400, {
      error:
        error instanceof Error ? error.message : "악보 PDF 업로드를 준비하지 못했습니다.",
    });
  }
}
