param(
  [string]$SupabaseDbUrl = $env:SUPABASE_DB_URL,
  [string]$ProjectDirectory,
  [string]$DumpPath,
  [switch]$KeepDump
)

$ErrorActionPreference = "Stop"

$tables = @(
  "public.guestbook_entries",
  "public.schedule_entries",
  "public.score_entries",
  "public.home_videos",
  "public.site_about_content"
)

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Invoke-Docker {
  param([string[]]$Args)

  & docker @Args

  if ($LASTEXITCODE -ne 0) {
    throw "docker $($Args -join ' ') failed with exit code $LASTEXITCODE."
  }
}

function Invoke-DockerCompose {
  param([string[]]$Args)

  & docker compose @Args

  if ($LASTEXITCODE -ne 0) {
    throw "docker compose $($Args -join ' ') failed with exit code $LASTEXITCODE."
  }
}

function Get-ComposeDbSetting {
  param([string]$Name, [string]$DefaultValue)

  $value = (& docker compose exec -T db printenv $Name | Select-Object -First 1)

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read '$Name' from the db container."
  }

  $value = "$value".Trim()

  if ($value) {
    return $value
  }

  return $DefaultValue
}

function Wait-ForDb {
  param([int]$TimeoutSeconds = 90)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $containerId = (& docker compose ps -q db | Select-Object -First 1).Trim()

    if ($LASTEXITCODE -ne 0) {
      throw "Failed to resolve the db container id."
    }

    if ($containerId) {
      $status = (& docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" $containerId | Select-Object -First 1).Trim()

      if ($LASTEXITCODE -ne 0) {
        throw "Failed to inspect the db container health."
      }

      if ($status -eq "healthy" -or $status -eq "running") {
        return $containerId
      }
    }

    Start-Sleep -Seconds 2
  }

  throw "The db service did not become ready in time."
}

if (-not $ProjectDirectory) {
  $ProjectDirectory = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

if (-not $DumpPath) {
  $DumpPath = Join-Path $ProjectDirectory ".tmp\supabase-app.sql"
}

if (-not $SupabaseDbUrl) {
  throw "Set SUPABASE_DB_URL or pass -SupabaseDbUrl with the Supabase Session pooler connection string."
}

Require-Command "docker"

$dumpDirectory = Split-Path -Parent $DumpPath
$dumpContainer = "pinocchio-supabase-dump-" + [guid]::NewGuid().ToString("N")
$dbContainerId = $null

New-Item -ItemType Directory -Force -Path $dumpDirectory | Out-Null

Push-Location $ProjectDirectory

try {
  Write-Host "Checking docker compose services..."
  $services = & docker compose config --services
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read docker compose services."
  }
  if ($services -notcontains "db") {
    throw "The compose project does not define a 'db' service."
  }

  Write-Host "Starting local db container..."
  Invoke-DockerCompose -Args @("up", "-d", "db")

  Write-Host "Waiting for local db to become ready..."
  $dbContainerId = Wait-ForDb

  $localDbName = Get-ComposeDbSetting -Name "POSTGRES_DB" -DefaultValue "pinocchio"
  $localDbUser = Get-ComposeDbSetting -Name "POSTGRES_USER" -DefaultValue "postgres"
  $localDbPassword = Get-ComposeDbSetting -Name "POSTGRES_PASSWORD" -DefaultValue "postgres"

  Write-Host "Creating dump from Supabase..."
  Invoke-Docker -Args @("run", "--name", $dumpContainer, "postgres:16-alpine", "pg_dump", "--dbname=$SupabaseDbUrl", "--clean", "--if-exists", "--no-owner", "--no-privileges", "--table=public.guestbook_entries", "--table=public.schedule_entries", "--table=public.score_entries", "--table=public.home_videos", "--table=public.site_about_content", "--file=/tmp/supabase-app.sql")

  Write-Host "Copying dump to the local workspace..."
  Invoke-Docker -Args @("cp", "${dumpContainer}:/tmp/supabase-app.sql", $DumpPath)

  Write-Host "Copying dump into the db container..."
  Invoke-Docker -Args @("cp", $DumpPath, "${dbContainerId}:/tmp/supabase-app.sql")

  Write-Host "Importing into local Postgres..."
  & docker compose exec -T -e "PGPASSWORD=$localDbPassword" db psql -v ON_ERROR_STOP=1 -U $localDbUser -d $localDbName -f /tmp/supabase-app.sql
  if ($LASTEXITCODE -ne 0) {
    throw "Import into local Postgres failed."
  }

  Write-Host "Verifying imported row counts..."
  & docker compose exec -T -e "PGPASSWORD=$localDbPassword" db psql -v ON_ERROR_STOP=1 -U $localDbUser -d $localDbName -P pager=off -c "select 'guestbook_entries' as table_name, count(*) from guestbook_entries union all select 'schedule_entries', count(*) from schedule_entries union all select 'score_entries', count(*) from score_entries union all select 'home_videos', count(*) from home_videos union all select 'site_about_content', count(*) from site_about_content;"
  if ($LASTEXITCODE -ne 0) {
    throw "Row-count verification failed."
  }

  Write-Host ""
  Write-Host "Supabase data import completed successfully."
  Write-Host "Imported tables:"
  foreach ($table in $tables) {
    Write-Host "  - $table"
  }
  Write-Host ""
  Write-Host "Local database: $localDbUser@$localDbName"
  Write-Host "Dump file: $DumpPath"
}
finally {
  if ($dumpContainer) {
    & docker rm -f $dumpContainer *> $null
  }

  if ($dbContainerId) {
    & docker compose exec -T db rm -f /tmp/supabase-app.sql *> $null
  }

  if ((-not $KeepDump) -and (Test-Path $DumpPath)) {
    Remove-Item -LiteralPath $DumpPath -Force
  }

  Pop-Location
}
