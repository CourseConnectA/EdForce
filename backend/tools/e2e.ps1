$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'

Write-Host '1) Create admin'
try {
  $resp1 = Invoke-RestMethod -Method POST -Uri "$base/auth/create-admin"
  Write-Host ($resp1 | ConvertTo-Json -Compress)
} catch {
  Write-Host "create-admin error: $($_.Exception.Message)"
}

Write-Host '2) Login as admin'
$loginBody = @{ username='admin'; password='password123' } | ConvertTo-Json
$admin = Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType 'application/json' -Body $loginBody
$adminTok = $admin.accessToken
Write-Host "admin token: $($adminTok.Substring(0,16))..."

Write-Host '3) Create CM if needed'
$cmBody = @{ userName='cm1'; firstName='CM'; lastName='One'; email='cm1@example.com'; password='password123'; role='center-manager'; centerName='Test Center' } | ConvertTo-Json
try {
  $cmCreate = Invoke-RestMethod -Method POST -Uri "$base/users" -ContentType 'application/json' -Headers @{ Authorization = "Bearer $adminTok" } -Body $cmBody
  Write-Host 'center-manager created'
} catch {
  if ($_.Exception.Response) { Write-Host "center-manager create status: $($_.Exception.Response.StatusCode.value__)" } else { throw }
}

Write-Host '4) Login as CM'
$cmLoginBody = @{ username='cm1'; password='password123' } | ConvertTo-Json
$cm = Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType 'application/json' -Body $cmLoginBody
$cmTok = $cm.accessToken
Write-Host "cm token: $($cmTok.Substring(0,16))..."

Write-Host '5) Profile as CM'
$profile = Invoke-RestMethod -Method GET -Uri "$base/auth/profile" -Headers @{ Authorization = "Bearer $cmTok" }
Write-Host ("profile role={0} isAdmin={1}" -f $profile.role, $profile.isAdmin)

Write-Host '6) Create lead as CM'
$leadBody = @{ firstName='Test'; lastName='Lead'; email1='testlead@example.com' } | ConvertTo-Json
try {
  $lead = Invoke-RestMethod -Method POST -Uri "$base/leads" -ContentType 'application/json' -Headers @{ Authorization = "Bearer $cmTok" } -Body $leadBody
  Write-Host ("lead created id={0}" -f $lead.id)
} catch {
  if ($_.Exception.Response) {
    $status = $_.Exception.Response.StatusCode.value__
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $sr.ReadToEnd()
    Write-Host ("lead create failed: {0} {1}" -f $status, $body)
  } else { throw }
}
