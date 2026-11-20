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

for ($i = 0; $i -lt 20; $i += 1) {
    try {
        $health = Invoke-RestMethod -Uri ("http://127.0.0.1:" + $port + "/api/health") -TimeoutSec 2
        if ($health.ok -and $health.app -eq 'chisheng-car-live' -and $health.version -eq '2.20.3') { exit 0 }
    } catch {
        # 软件可能还在加载模型或 Python 启动中，继续重试。
    }
    Start-Sleep -Milliseconds 700
}

exit 1
