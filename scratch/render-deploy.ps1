$ErrorActionPreference = "Stop"

$serviceId = "srv-d89gilbeo5us738rk7dg"
$baseUrl = "https://api.render.com/v1"

$secureKey = Read-Host "Render API key" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw "Render API key is required"
}

$headers = @{
  Authorization = "Bearer $apiKey"
  Accept = "application/json"
  "Content-Type" = "application/json"
}

function Invoke-RenderApi {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$Method = "GET",
    [object]$Body = $null
  )

  $params = @{
    Uri = "$baseUrl$Path"
    Method = $Method
    Headers = $headers
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
  }

  Invoke-RestMethod @params
}

function Mask-Value {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "missing"
  }

  if ($Value.Length -le 8) {
    return "********"
  }

  return "$($Value.Substring(0, 4))...$($Value.Substring($Value.Length - 4))"
}

Write-Host "Fetching Render service $serviceId ..."
$service = Invoke-RenderApi -Path "/services/$serviceId"
Write-Host "Service:" $service.name

Write-Host "Checking mail environment ..."
$envVars = Invoke-RenderApi -Path "/services/$serviceId/env-vars"
$envMap = @{}
foreach ($item in $envVars) {
  $envMap[$item.envVar.key] = $item.envVar.value
}

$smtpHost = $envMap["SMTP_HOST"]
$smtpPass = $envMap["SMTP_PASS"]
$brevoApiKey = $envMap["BREVO_API_KEY"]
$fromEmail = $envMap["SMTP_FROM_EMAIL"]

Write-Host "SMTP_HOST:" $smtpHost
Write-Host "SMTP_FROM_EMAIL:" $fromEmail
Write-Host "SMTP_PASS:" (Mask-Value $smtpPass)
Write-Host "BREVO_API_KEY:" (Mask-Value $brevoApiKey)

if ($smtpHost -ne "smtp-relay.brevo.com") {
  Write-Warning "SMTP_HOST is not Brevo. The HTTPS Brevo bypass will not run unless SMTP_HOST is smtp-relay.brevo.com."
}

if ($smtpPass -and $smtpPass.StartsWith("xkeysib-") -and $brevoApiKey -ne $smtpPass) {
  Write-Host "Adding BREVO_API_KEY from the existing v3 SMTP_PASS value."
  $envMap["BREVO_API_KEY"] = $smtpPass
}

if ($smtpPass -and $smtpPass.StartsWith("xsmtpsib-") -and -not $envMap["BREVO_API_KEY"]) {
  Write-Warning "SMTP_PASS is a Brevo SMTP password, not a v3 API key. Set BREVO_API_KEY or replace SMTP_PASS with an xkeysib key."
}

if ($envMap["RUN_SEED_ON_STARTUP"] -ne "false") {
  Write-Host "Setting RUN_SEED_ON_STARTUP=false so production can boot without rerunning seed."
  $envMap["RUN_SEED_ON_STARTUP"] = "false"
}

if ($envMap["RUN_MIGRATIONS_ON_STARTUP"] -ne "false") {
  Write-Host "Setting RUN_MIGRATIONS_ON_STARTUP=false so production opens its web port immediately."
  $envMap["RUN_MIGRATIONS_ON_STARTUP"] = "false"
}

$updatedEnv = @()
foreach ($key in $envMap.Keys) {
  $updatedEnv += @{ key = $key; value = $envMap[$key] }
}

Write-Host "Saving environment variables ..."
Invoke-RenderApi -Path "/services/$serviceId/env-vars" -Method "PUT" -Body $updatedEnv | Out-Null

Write-Host "Triggering deployment ..."
$deploy = Invoke-RenderApi -Path "/services/$serviceId/deploys" -Method "POST" -Body @{ clearCache = "do_not_clear" }
Write-Host "Deploy triggered:" $deploy.id $deploy.status
