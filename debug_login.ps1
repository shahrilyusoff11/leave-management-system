$ErrorActionPreference = "Continue"
try {
    Write-Host "Testing Login with invalid password..."
    $response = Invoke-WebRequest -Uri 'http://localhost:8080/api/v1/login' -Method Post -Body '{"email":"admin@company.com", "password":"WrongPassword"}' -ContentType 'application/json'
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "This should have failed!"
} catch {
    Write-Host "Caught Exception:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "RAW BODY START"
        Write-Host $body
        Write-Host "RAW BODY END"
    } else {
        Write-Host "No response object in exception."
    }
}
