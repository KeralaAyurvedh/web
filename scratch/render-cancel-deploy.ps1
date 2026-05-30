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
  "Content-Type" = "application/json"
}

$deploy = Invoke-RestMethod -Uri "$baseUrl/services/$serviceId/deploys/$DeployId/cancel" -Method Post -Headers $headers
Write-Host "$($deploy.id) $($deploy.status)"
