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

$service = Invoke-RestMethod -Uri "$baseUrl/services/$serviceId" -Method Get -Headers $headers
$ownerId = $service.ownerId
$startTime = (Get-Date).ToUniversalTime().AddMinutes(-90).ToString("o")
$endTime = (Get-Date).ToUniversalTime().ToString("o")

Write-Host "Service:" $service.name
Write-Host "Owner:" $ownerId
Write-Host "Recent logs:"

$encodedStart = [uri]::EscapeDataString($startTime)
$encodedEnd = [uri]::EscapeDataString($endTime)
$uri = "$baseUrl/logs?ownerId=$ownerId&resource=$serviceId&type=build&type=app&startTime=$encodedStart&endTime=$encodedEnd&direction=backward&limit=80"
$response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers

foreach ($entry in $response.logs) {
  $message = $entry.message
  if ($message -match "(?i)(password|secret|api[-_ ]?key|database_url|jwt_secret|connectionstring)") {
    $message = "[redacted sensitive-looking log line]"
  }
  Write-Host "$($entry.timestamp) [$($entry.type)] $message"
}
