#!/usr/bin/env bash

set -euo pipefail

SOURCE_DB="${1:-postgres}"
TARGET_DB="${2:-pinocchio}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${POSTGRES_USER:-postgres}"

TABLES=(
  public.guestbook_entries
  public.home_videos
  public.schedule_entries
  public.score_entries
  public.site_about_content
)

if [[ "$SOURCE_DB" == "$TARGET_DB" ]]; then
  echo "Source DB and target DB are the same: $SOURCE_DB" >&2
  exit 1
fi

dump_args=(
  pg_dump
  -U "$DB_USER"
  -d "$SOURCE_DB"
  --clean
  --if-exists
  --no-owner
  --no-privileges
)

for table in "${TABLES[@]}"; do
  dump_args+=("--table=$table")
done

echo "Copying app tables from '$SOURCE_DB' to '$TARGET_DB' using docker compose service '$DB_SERVICE'..."
echo "This replaces the target tables with the source tables for the app data set."

docker compose exec -T "$DB_SERVICE" "${dump_args[@]}" \
  | docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$TARGET_DB"

echo
echo "Row counts in '$TARGET_DB' after copy:"

for table in "${TABLES[@]}"; do
  docker compose exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$TARGET_DB" \
    -c "SELECT '${table}' AS table_name, COUNT(*) AS row_count FROM ${table};"
done
