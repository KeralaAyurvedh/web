param(
  [Parameter(Mandatory = $true)][string]$DeployId
)

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

for ($i = 1; $i -le 30; $i++) {
  $deploy = Invoke-RestMethod -Uri "$baseUrl/services/$serviceId/deploys/$DeployId" -Method Get -Headers $headers
  Write-Host "Deploy status:" $deploy.status

  if ($deploy.status -in @("live", "update_failed", "build_failed", "canceled")) {
    exit 0
  }

  Start-Sleep -Seconds 10
}

throw "Deploy did not finish within the polling window."
