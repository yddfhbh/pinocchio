import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const apiRoot = path.join(projectRoot, "api");
const port = Number.parseInt(process.env.PORT || "3000", 10);

function loadEnvFile(filename) {
  const filePath = path.join(projectRoot, filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!key || key in process.env) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function createQueryObject(searchParams) {
  const entries = {};

  for (const [key, value] of searchParams.entries()) {
    entries[key] = value;
  }

  return entries;
}

function createResponseHelpers(response) {
  return {
    status(code) {
      response.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      response.setHeader(name, value);
      return this;
    },
    send(payload) {
      if (response.writableEnded) {
        return this;
      }

      if (payload === undefined) {
        response.end();
        return this;
      }

      if (Buffer.isBuffer(payload) || typeof payload === "string") {
        response.end(payload);
        return this;
      }

      response.end(JSON.stringify(payload));
      return this;
    },
  };
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function resolveRoutePath(urlPathname) {
  if (!urlPathname.startsWith("/api/")) {
    return null;
  }

  const routeName = urlPathname.slice("/api/".length);

  if (!routeName || routeName.includes("/") || routeName.includes("\\")) {
    return null;
  }

  return path.join(apiRoot, `${routeName}.js`);
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return "";
  }

  return Buffer.concat(chunks).toString("utf8");
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const server = http.createServer(async (request, response) => {
  const method = request.method || "GET";

  if (method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const routePath = resolveRoutePath(url.pathname);

  if (!routePath) {
    sendJson(response, 404, {
      error: "API route not found.",
    });
    return;
  }

  if (!fs.existsSync(routePath)) {
    sendJson(response, 404, {
      error: "API handler was not found.",
    });
    return;
  }

  try {
    const moduleUrl = pathToFileURL(routePath).href;
    const routeModule = await import(moduleUrl);
    const handler = routeModule.default;

    if (typeof handler !== "function") {
      throw new Error(`Route '${path.basename(routePath)}' does not export a default handler.`);
    }

    const body = await readRequestBody(request);
    const requestLike = Object.assign(request, {
      body,
      query: createQueryObject(url.searchParams),
    });
    const responseLike = createResponseHelpers(response);

    await handler(requestLike, responseLike);

    if (!response.writableEnded) {
      response.end();
    }
  } catch (error) {
    console.error(error);

    if (!response.writableEnded) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      });
    }
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Local API server listening on http://0.0.0.0:${port}`);
});
