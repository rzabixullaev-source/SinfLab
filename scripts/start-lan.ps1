param(
  [string]$InterfaceAlias = "Wi-Fi",
  [ValidateSet("Atlas", "Demo")][string]$Mode = "Atlas"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$address = Get-NetIPAddress -InterfaceAlias $InterfaceAlias -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "169.254.*" } |
  Select-Object -First 1
if (-not $address) { throw "No IPv4 address found for $InterfaceAlias." }

$node = Join-Path $projectRoot ".tmp\node\node-v22.23.3-win-x64\node.exe"
if (-not (Test-Path -LiteralPath $node)) {
  $node = (Get-Command node -ErrorAction Stop).Source
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules\vite\bin\vite.js"))) {
  throw "Dependencies are missing. Run npm install in the project root first."
}

if ($Mode -eq "Atlas") {
  $envPath = Join-Path $projectRoot "apps\api\.env"
  $uri = $env:MONGODB_URI
  if (-not $uri -and (Test-Path -LiteralPath $envPath)) {
    $match = [regex]::Match((Get-Content -LiteralPath $envPath -Raw), '(?m)^\s*MONGODB_URI\s*=\s*(.+?)\s*$')
    if ($match.Success) { $uri = $match.Groups[1].Value.Trim(' ', '"', "'") }
  }
  if (-not $uri -or $uri -match 'CLUSTER\.example|USER:PASSWORD' -or $uri -notmatch '^mongodb(\+srv)?://') {
    throw "Atlas MONGODB_URI is missing. Put it in apps/api/.env (or the process environment). Existing services were left running."
  }
}

$runDirectory = Join-Path $projectRoot ".tmp\run"
New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
foreach ($service in @("api", "web")) {
  $pidPath = Join-Path $runDirectory "$service.pid"
  if (-not (Test-Path -LiteralPath $pidPath)) { continue }
  $oldPid = [int](Get-Content -LiteralPath $pidPath)
  $oldProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$oldPid"
  if ($oldProcess -and $oldProcess.CommandLine -like "*$projectRoot*") {
    Stop-Process -Id $oldPid -Force
  }
}

$env:CORS_ORIGIN = "http://$($address.IPAddress):5173,http://localhost:5173,http://127.0.0.1:5173"
if ($Mode -eq "Demo") { $env:DEMO_WEB_ORIGIN = "http://$($address.IPAddress):5173" }
$apiEntry = if ($Mode -eq "Atlas") { "apps/api/src/server.js" } else { "apps/api/src/demo-server.js" }
$api = Start-Process -FilePath $node -ArgumentList $apiEntry `
  -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $runDirectory "api.out.log") `
  -RedirectStandardError (Join-Path $runDirectory "api.err.log")
$api.Id | Set-Content (Join-Path $runDirectory "api.pid")

$env:SINFLAB_WEB_HOST = $address.IPAddress
$web = Start-Process -FilePath $node -ArgumentList "../../node_modules/vite/bin/vite.js" `
  -WorkingDirectory (Join-Path $projectRoot "apps\web") -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $runDirectory "web.out.log") `
  -RedirectStandardError (Join-Path $runDirectory "web.err.log")
$web.Id | Set-Content (Join-Path $runDirectory "web.pid")

$url = "http://$($address.IPAddress):5173/"
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    $readyPath = if ($Mode -eq "Atlas") { "api/v1/ready" } else { "api/v1/demo-status" }
    $status = Invoke-RestMethod ($url + $readyPath) -TimeoutSec 3
    if ($status.status -eq "ready" -or $status.demo) { Write-Output "SinfLab $Mode is ready at $url"; exit 0 }
  } catch { Start-Sleep -Seconds 1 }
  $api.Refresh()
  if ($api.HasExited) { throw "API exited before becoming ready. Check .tmp/run/api.err.log; do not share secrets from logs." }
}
throw "Services did not become ready. See $runDirectory for logs."
