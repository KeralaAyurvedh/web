# Database Backup Script for Kerala Ayurvedh
# Usage: powershell -File scripts/backup.ps1

$ErrorActionPreference = "Stop"

# Create backups directory if not exists
$backupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
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

# Parse connection string: postgresql://username:password@host:port/database
# Example: postgresql://postgres:postgres@localhost:5432/kerala_ayurvedh?schema=public
if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)") {
    $user = $Matches[1]
    $pass = $Matches[2]
    $dbHost = $Matches[3]
    $port = $Matches[4]
    $db = $Matches[5]
} else {
    Write-Error "Could not parse DATABASE_URL. Make sure it is in format: postgresql://user:pass@host:port/dbname"
}

if ([string]::IsNullOrEmpty($port)) { $port = "5432" }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "kerala_ayurvedh_backup_$timestamp.sql"
$zipFile = Join-Path $backupDir "kerala_ayurvedh_backup_$timestamp.zip"

Write-Host "Backing up database '$db' from '${dbHost}:${port}'..."
$env:PGPASSWORD = $pass

# Execute pg_dump
try {
    $hasPgDump = $null -ne (Get-Command pg_dump -ErrorAction SilentlyContinue)
    if ($hasPgDump) {
        & pg_dump -h $dbHost -p $port -U $user -F p -d $db -f $backupFile
        Write-Host "SQL dump saved to $backupFile"
    } else {
        # Fallback to docker container
        $dockerCheck = docker ps --filter "name=kerala-ayurvedh-postgres" --format "{{.Names}}" 2>$null
        if ($dockerCheck -eq "kerala-ayurvedh-postgres") {
            Write-Host "pg_dump not found locally. Running pg_dump inside Docker container 'kerala-ayurvedh-postgres'..."
            # Execute pg_dump via docker exec and write output to file
            cmd.exe /c "docker exec -i kerala-ayurvedh-postgres pg_dump -U $user -d $db > `"$backupFile`""
            if (-not (Test-Path $backupFile) -or (Get-Item $backupFile).Length -lt 100) {
                throw "Docker pg_dump failed or output file is empty"
            }
            Write-Host "SQL dump saved to $backupFile via Docker"
        } else {
            throw "pg_dump not found locally, and docker container 'kerala-ayurvedh-postgres' is not running."
        }
    }

    # Compress SQL dump to zip file
    Compress-Archive -Path $backupFile -DestinationPath $zipFile -Force
    Write-Host "Backup zipped and saved to $zipFile"

    # Remove temporary SQL dump
    Remove-Item $backupFile -Force
    Write-Host "Backup complete!"
}
catch {
    Write-Error "Failed to execute backup: $_"
}
finally {
    $env:PGPASSWORD = $null
}
