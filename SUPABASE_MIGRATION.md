# Supabase To Local Postgres

This project now includes a helper script that copies the app tables from Supabase into the local Docker Postgres service.

## What It Imports

- `public.guestbook_entries`
- `public.schedule_entries`
- `public.score_entries`
- `public.home_videos`
- `public.site_about_content`

## One-Time Requirement

Get the Supabase Session pooler connection string from:

`Project -> Settings -> Database -> Connection Pooling -> Session pooler (port 5432)`

## Run It

From the `pinocchio` directory:

```powershell
$env:SUPABASE_DB_URL="postgresql://..."
.\scripts\migrate-supabase-to-local.ps1
```

If you want to keep the SQL dump file for inspection:

```powershell
$env:SUPABASE_DB_URL="postgresql://..."
.\scripts\migrate-supabase-to-local.ps1 -KeepDump
```

The script will:

1. Start the local `db` service.
2. Dump the app tables from Supabase.
3. Import them into the local Postgres container.
4. Print row counts for a quick verification.
