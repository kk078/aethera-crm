$token = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImFldGhlcmEiLCJyb2xlIjoiYWRtaW4iLCJzdWIiOiJhZG1pbi0wMDEiLCJpYXQiOjE3NzczOTgzNjIsImV4cCI6MTc3NzQ4NDc2Mn0.GyDgIPJjh6OF56hmde50hgFpV-6a4OSWFC_I4D31CH4"
$base = "https://aethera-crm-api.aetherahealthcare.workers.dev"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$results = @()

function Test-Endpoint($method, $path, $body = $null) {
    $url = "$base$path"
    try {
        $splat = @{ Uri = $url; Method = $method; Headers = $headers }
        if ($body) { $splat.Body = $body }
        $response = Invoke-WebRequest @splat -UseBasicParsing
        [PSCustomObject]@{ Path = "$method $path"; StatusCode = $response.StatusCode; Works = "Y"; Notes = ($response.Content | Out-String).Substring(0, [Math]::Min(200, ($response.Content | Out-String).Length)) }
    } catch {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $content = $reader.ReadToEnd()
            [PSCustomObject]@{ Path = "$method $path"; StatusCode = $status; Works = "N"; Notes = $content }
        } else {
            [PSCustomObject]@{ Path = "$method $path"; StatusCode = 0; Works = "N"; Notes = $_.Exception.Message }
        }
    }
}

# Contacts
$results += Test-Endpoint "GET" "/api/v1/contacts"
$contactsGet = Invoke-RestMethod -Uri "$base/api/v1/contacts" -Method GET -Headers $headers

$r = Test-Endpoint "POST" "/api/v1/contacts" '{"first_name":"Test","last_name":"User","email":"test@example.com"}' 
$results += $r
$contactId = $null
if ($r.Works -eq "Y") {
    try {
        $created = Invoke-RestMethod -Uri "$base/api/v1/contacts" -Method POST -Headers $headers -Body '{"first_name":"Test","last_name":"User","email":"test@example.com"}'
        $contactId = $created.data.id
    } catch {}
}

if (-not $contactId) {
    # try fetch from list
    try {
        $list = Invoke-RestMethod -Uri "$base/api/v1/contacts" -Method GET -Headers $headers
        $contactId = $list.data[0].id
    } catch {}
}

if ($contactId) {
    $results += Test-Endpoint "PUT" "/api/v1/contacts/$contactId" '{"first_name":"TestUpdated","last_name":"UserUpdated"}'
    $results += Test-Endpoint "DELETE" "/api/v1/contacts/$contactId"
} else {
    $results += [PSCustomObject]@{ Path = "PUT /api/v1/contacts/{id}"; StatusCode = "-"; Works = "N"; Notes = "No contact ID available" }
    $results += [PSCustomObject]@{ Path = "DELETE /api/v1/contacts/{id}"; StatusCode = "-"; Works = "N"; Notes = "No contact ID available" }
}

# Organizations
$results += Test-Endpoint "GET" "/api/v1/organizations"
$results += Test-Endpoint "POST" "/api/v1/organizations" '{"name":"Test Org","industry":"Healthcare"}'

# Leads
$results += Test-Endpoint "GET" "/api/v1/leads"

# Deals
$results += Test-Endpoint "GET" "/api/v1/deals"

# Activities
$results += Test-Endpoint "GET" "/api/v1/activities"

# Tasks
$results += Test-Endpoint "GET" "/api/v1/tasks"

# Settings
$results += Test-Endpoint "GET" "/api/v1/settings"

# Health
$results += Test-Endpoint "GET" "/health"

$results | Format-Table -AutoSize

Write-Host "`n==== CSV Results ===="
$results | ForEach-Object { "$($_.Path),$($_.StatusCode),$($_.Works),$($_.Notes -replace ',',';')" }
