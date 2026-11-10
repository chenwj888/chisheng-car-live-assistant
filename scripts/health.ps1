$ErrorActionPreference = 'SilentlyContinue'

$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root 'runtime.json'
$port = 8765

if (Test-Path -LiteralPath $runtime) {
    try {
        $data = Get-Content -LiteralPath $runtime -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($data.port) { $port = [int]$data.port }
    } catch {
        $port = 8765
    }
}

try {
    $health = Invoke-RestMethod -Uri ("http://127.0.0.1:" + $port + "/api/health") -TimeoutSec 2
    if ($health.ok -and $health.app -eq 'chisheng-car-live' -and $health.version -eq '2.16.0') { exit 0 }
    exit 1
} catch {
    exit 1
}
