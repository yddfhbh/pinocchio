import { getDatabaseConnectionSummary, query } from "./_db.js";

const trackedTables = [
  "guestbook_entries",
  "home_videos",
  "schedule_entries",
  "score_entries",
  "site_about_content",
];

function sendJson(response, statusCode, payload) {
  response.status(statusCode).setHeader("Content-Type", "application/json");
  response.send(JSON.stringify(payload));
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, {
      error: "Method not allowed.",
    });
  }

  const database = getDatabaseConnectionSummary();

  try {
    const pingResult = await query(
      `SELECT current_database() AS current_database, NOW() AS server_time`
    );
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
    return sendJson(response, 500, {
      ok: false,
      database,
      error: error instanceof Error ? error.message : "Database connection failed.",
    });
  }
}
