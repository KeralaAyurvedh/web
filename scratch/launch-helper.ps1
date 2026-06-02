# Kerala Ayurvedh MLM - Production Launch Helper
# Run this script to automate local checks, apply migrations, and sync your APK.

Clear-Host
Write-Host "=============================================" -ForegroundColor Green
Write-Host "   KERALA AYURVEDH - PRODUCTION LAUNCH HELPER" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Step 1: Sync the latest APK
Write-Host "[1/4] Checking and syncing Compiled APK..." -ForegroundColor Yellow
$localApk = "mobile/android/app/build/outputs/apk/release/app-release.apk"
$webUploadsDir = "web/public/uploads"
$webApk = "$webUploadsDir/kerala-ayurvedh.apk"
$backendApk = "backend/public/kerala-ayurvedh.apk"

if (Test-Path $localApk) {
    if (!(Test-Path $webUploadsDir)) {
        New-Item -ItemType Directory -Path $webUploadsDir -Force | Out-Null
    }
    Copy-Item -Path $localApk -Destination $webApk -Force
    Copy-Item -Path $localApk -Destination $backendApk -Force
    Write-Host "✅ Latest APK successfully copied to web and backend public paths!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Native release APK not found at: $localApk" -ForegroundColor Red
    Write-Host "   Please compile the mobile app locally using 'eas build' or 'assembleRelease' first." -ForegroundColor White
}
Write-Host ""

# Step 2: Validate local types & builds
Write-Host "[2/4] Verifying codebase builds..." -ForegroundColor Yellow
Write-Host "Running backend build check..." -ForegroundColor White
cd backend
npm run build | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend compilation successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Backend compilation failed. Please resolve TS errors." -ForegroundColor Red
    cd ..
    Exit
}
cd ..
Write-Host ""

# Step 3: Run Database Migrations on Production/Staging
Write-Host "[3/4] Database Migration Deployment..." -ForegroundColor Yellow
$choice = Read-Host "Would you like to deploy migrations to a live staging/production database? (y/n)"
if ($choice -eq 'y') {
    $dbUrl = Read-Host "Enter your PRODUCTION/STAGING DIRECT_URL (e.g. postgresql://...)"
    if ($dbUrl) {
        $env:DATABASE_URL = $dbUrl
        $env:DIRECT_URL = $dbUrl
        cd backend
        Write-Host "Deploying migrations..." -ForegroundColor White
        npx prisma migrate deploy
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migrations deployed successfully to the database!" -ForegroundColor Green
        } else {
            Write-Host "❌ Migration deployment failed. Please check connection credentials." -ForegroundColor Red
        }
        cd ..
    } else {
        Write-Host "Skipped: Direct URL not provided." -ForegroundColor Muted
    }
} else {
    Write-Host "Skipped migration deployment." -ForegroundColor White
}
Write-Host ""

# Step 4: Whitelist Guidelines
Write-Host "[4/4] Google Play Protect Whitelisting Guidelines..." -ForegroundColor Yellow
Write-Host "Sideloaded apps trigger security warnings by default unless whitelisted by Google." -ForegroundColor White
Write-Host "Follow these steps to whitelist your APK for free:" -ForegroundColor White
Write-Host "1. Go to: https://support.google.com/googleplay/android-developer/contact/protect_appeals" -ForegroundColor Cyan
Write-Host "2. Fill in the form and upload the APK file located at: $backendApk" -ForegroundColor Cyan
Write-Host "3. Google will scan and whitelist your developer certificate, removing warning blocks!" -ForegroundColor Cyan
Write-Host ""

Write-Host "=============================================" -ForegroundColor Green
Write-Host "   LAUNCH ASSISTANCE STEPS COMPLETE!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
