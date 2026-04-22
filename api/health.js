import { isAdminRequest } from "./_admin-auth.js";
import { getDatabaseConnectionSummary, query } from "./_db.js";
import { sendJson, sendMethodNotAllowed } from "./_response.js";

const trackedTables = [
  "guestbook_entries",
  "home_videos",
  "schedule_entries",
  "score_entries",
  "site_about_content",
];

function toSafeDatabaseSummary(summary) {
  return {
    configured: summary.configured,
    source: summary.source,
    sslMode: summary.sslMode,
  };
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendMethodNotAllowed(response, ["GET"]);
  }

  const admin = isAdminRequest(request);
  const database = toSafeDatabaseSummary(getDatabaseConnectionSummary());

  try {
    const pingResult = await query(
      `SELECT current_database() AS current_database, NOW() AS server_time`
    );

    if (!admin) {
      return sendJson(response, 200, {
        ok: true,
        serverTime:
          pingResult.rows[0]?.server_time instanceof Date
            ? pingResult.rows[0].server_time.toISOString()
            : String(pingResult.rows[0]?.server_time || ""),
      });
    }

    const tableResult = await query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
       ORDER BY table_name ASC`,
      [trackedTables]
    );

    return sendJson(response, 200, {
      ok: true,
      database: {
        ...database,
        currentDatabase: pingResult.rows[0]?.current_database || null,
      },
      serverTime:
        pingResult.rows[0]?.server_time instanceof Date
          ? pingResult.rows[0].server_time.toISOString()
          : String(pingResult.rows[0]?.server_time || ""),
      tables: tableResult.rows.map((row) => row.table_name),
    });
  } catch (error) {
    return sendJson(response, 503, {
      ok: false,
      database: admin ? database : undefined,
      error: admin && error instanceof Error ? error.message : "Service unavailable.",
    });
  }
}
