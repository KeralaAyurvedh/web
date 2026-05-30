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

$envVars = Invoke-RestMethod -Uri "$baseUrl/services/$serviceId/env-vars" -Method Get -Headers $headers
$envMap = @{}
foreach ($item in $envVars) {
  $envMap[$item.envVar.key] = $item.envVar.value
}

$brevoKey = $envMap["BREVO_API_KEY"]
$fromEmail = $envMap["SMTP_FROM_EMAIL"]
$fromName = if ($envMap["SMTP_FROM_NAME"]) { $envMap["SMTP_FROM_NAME"] } else { "Kerala Ayurvedh" }
$supportEmail = if ($envMap["SUPPORT_EMAIL"]) { $envMap["SUPPORT_EMAIL"] } else { $fromEmail }

if ([string]::IsNullOrWhiteSpace($brevoKey) -or -not $brevoKey.StartsWith("xkeysib-")) {
  throw "BREVO_API_KEY must be a Brevo v3 API key starting with xkeysib-"
}

if ([string]::IsNullOrWhiteSpace($fromEmail)) {
  throw "SMTP_FROM_EMAIL is required"
}

$body = @{
  sender = @{
    name = $fromName
    email = $fromEmail
  }
  to = @(
    @{
      email = $supportEmail
      name = "Kerala Ayurvedh Support"
    }
  )
  subject = "Kerala Ayurvedh email smoke test"
  textContent = "This confirms the Render Brevo HTTPS email configuration is working."
}

$brevoHeaders = @{
  Accept = "application/json"
  "api-key" = $brevoKey
  "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "https://api.brevo.com/v3/smtp/email" -Method Post -Headers $brevoHeaders -Body ($body | ConvertTo-Json -Depth 8)
Write-Host "Brevo accepted test email. MessageId:" $response.messageId
