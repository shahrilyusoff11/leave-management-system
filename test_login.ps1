$payload = Get-Content payload.json -Raw
$response = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/login' -Method Post -Body $payload -ContentType 'application/json'
$token = $response.token
Write-Host "Token: $token"

try {
    $balance = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/leave-balance' -Method Get -Headers @{Authorization = "Bearer $token"}
    Write-Host "Balance Response:"
    Write-Host ($balance | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error accessing leave-balance:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
