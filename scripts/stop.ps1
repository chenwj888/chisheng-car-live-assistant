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
    Invoke-RestMethod -Method Post -Uri ("http://127.0.0.1:" + $port + "/api/shutdown") -TimeoutSec 2 | Out-Null
    Write-Host '已发送退出指令。'
} catch {
    Write-Host '软件似乎没有在运行。'
}
