$ErrorActionPreference = "Stop"
try {
    # 1. Login
    Write-Host "Logging in..."
    $payload = Get-Content payload.json -Raw
    $loginResponse = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/login' -Method Post -Body $payload -ContentType 'application/json'
    $token = $loginResponse.token
    Write-Host "Login successful. Token obtained."

    # 2. Get My Requests to find an ID
    Write-Host "Fetching leave requests..."
    $requests = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/leave-requests' -Method Get -Headers @{Authorization = "Bearer $token"}
    
    if ($requests.Count -eq 0) {
        Write-Host "No leave requests found. Creating one..."
        $startDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddT00:00:00Z")
        $endDate = (Get-Date).AddDays(2).ToString("yyyy-MM-ddT00:00:00Z")
        
        $createPayload = @{
            leave_type = "unpaid"
            start_date = $startDate
            end_date = $endDate
            reason = "Test leave for verification"
        } | ConvertTo-Json

        $newReq = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/leave-requests' -Method Post -Body $createPayload -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"}
        $reqId = $newReq.id
        Write-Host "Created test leave request: $reqId"
    } else {
        $reqId = $requests[0].id
    }
    Write-Host "Testing chronology for Request ID: $reqId"

    # 3. Hit Chronology
    $chronology = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/leave-requests/$reqId/chronology" -Method Get -Headers @{Authorization = "Bearer $token"}
    
    Write-Host "Chronology verified successfully!"
    $chronology | ConvertTo-Json -Depth 2
} catch {
    Write-Host "Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    } else {
        Write-Host $_
    }
}
