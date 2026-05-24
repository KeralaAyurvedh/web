# Database Restore Script for Kerala Ayurvedh
# Usage: powershell -File scripts/restore.ps1 -BackupFile ..\backups\kerala_ayurvedh_backup_xxx.zip

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found at $BackupFile"
}

# Load environment variables from .env
$envFile = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile"
}

$dbUrl = ""
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^DATABASE_URL\s*=\s*`"(.*)`"") {
        $dbUrl = $Matches[1]
    } elseif ($_ -match "^DATABASE_URL\s*=\s*(.*)") {
        $dbUrl = $Matches[1]
    }
}

if ([string]::IsNullOrEmpty($dbUrl)) {
    Write-Error "DATABASE_URL not found in .env"
}

# Parse connection string
if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)") {
    $user = $Matches[1]
    $pass = $Matches[2]
    $dbHost = $Matches[3]
    $port = $Matches[4]
    $db = $Matches[5]
} else {
    Write-Error "Could not parse DATABASE_URL."
}

if ([string]::IsNullOrEmpty($port)) { $port = "5432" }

# Safety prompt
$confirmation = Read-Host "WARNING: This will overwrite the database '$db' on '${dbHost}:${port}'. Are you sure you want to continue? (Y/N)"
if ($confirmation -ne "Y" -and $confirmation -ne "y") {
    Write-Host "Restore cancelled."
    exit
}

$tempDir = Join-Path $PSScriptRoot "..\backups\temp_restore"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force | Out-Null
}
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$sqlFile = ""

# Handle zip vs sql directly
if ($BackupFile.EndsWith(".zip")) {
    Write-Host "Extracting backup zip..."
    Expand-Archive -Path $BackupFile -DestinationPath $tempDir -Force
    $sqlFile = Get-ChildItem -Path $tempDir -Filter "*.sql" | Select-Object -First 1
    if (-not $sqlFile) {
        Write-Error "No .sql file found in the backup archive."
    }
    $sqlFilePath = $sqlFile.FullName
} else {
    $sqlFilePath = $BackupFile
}

Write-Host "Restoring database from $sqlFilePath..."
$env:PGPASSWORD = $pass

# Execute psql to restore (since pg_dump was run in plain text format)
try {
    $hasPsql = $null -ne (Get-Command psql -ErrorAction SilentlyContinue)
    if ($hasPsql) {
        # Drop and recreate schema to ensure clean slate
        & psql -h $dbHost -p $port -U $user -d $db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        & psql -h $dbHost -p $port -U $user -d $db -f $sqlFilePath
        Write-Host "Restore completed successfully!"
    } else {
        # Fallback to docker container
        $dockerCheck = docker ps --filter "name=kerala-ayurvedh-postgres" --format "{{.Names}}" 2>$null
        if ($dockerCheck -eq "kerala-ayurvedh-postgres") {
            Write-Host "psql not found locally. Running psql inside Docker container 'kerala-ayurvedh-postgres'..."
            # Drop and recreate schema via docker exec
            docker exec -i kerala-ayurvedh-postgres psql -U $user -d $db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
            # Restore SQL dump via docker exec streaming the SQL file
            cmd.exe /c "docker exec -i kerala-ayurvedh-postgres psql -U $user -d $db < `"$sqlFilePath`""
            Write-Host "Restore completed successfully via Docker!"
        } else {
            throw "psql not found locally, and docker container 'kerala-ayurvedh-postgres' is not running."
        }
    }
}
catch {
    Write-Error "Failed to execute restore: $_"
}
finally {
    $env:PGPASSWORD = $null
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
}
