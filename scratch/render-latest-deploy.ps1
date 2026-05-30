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

$deploys = Invoke-RestMethod -Uri "$baseUrl/services/$serviceId/deploys?limit=5" -Method Get -Headers $headers
foreach ($item in $deploys) {
  $deploy = if ($item.deploy) { $item.deploy } else { $item }
  Write-Host "$($deploy.id) $($deploy.status) $($deploy.commit.id) $($deploy.commit.message)"
}
