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

$headers = @{
  Authorization = "Bearer $apiKey"
  Accept = "application/json"
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

$envVars = Invoke-RestMethod -Uri "$baseUrl/services/$serviceId/env-vars" -Method Get -Headers $headers
$interesting = @(
  "DATABASE_URL",
  "DIRECT_URL",
  "RUN_SEED_ON_STARTUP",
  "SMTP_HOST",
  "SMTP_PASS",
  "BREVO_API_KEY",
  "SMTP_FROM_EMAIL",
  "SUPPORT_EMAIL",
  "JWT_SECRET"
)

$envMap = @{}
foreach ($item in $envVars) {
  $envMap[$item.envVar.key] = $item.envVar.value
}

foreach ($key in $interesting) {
  if ($envMap.ContainsKey($key)) {
    Write-Host "$key =" (Mask-Value $envMap[$key])
  } else {
    Write-Host "$key = missing"
  }
}
