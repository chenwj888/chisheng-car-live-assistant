# -*- coding: utf-8 -*-
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$service = Join-Path $root 'kokoro-service'
$python = $null

$candidates = @(
    (Join-Path $env:APPDATA 'uv\python\cpython-3.12.12-windows-x86_64-none\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'uv\python\cpython-3.12.12-windows-x86_64-none\python.exe')
)
try {
    $p = & py -3.12 -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $p) { $candidates += ($p | Select-Object -First 1) }
} catch {}

foreach ($base in @($env:APPDATA, $env:LOCALAPPDATA)) {
    if (-not $base) { continue }
    $uvRoot = Join-Path $base 'uv\python'
    if (Test-Path -LiteralPath $uvRoot) {
        Get-ChildItem -LiteralPath $uvRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like 'cpython-3.12*' } |
            ForEach-Object { $candidates += (Join-Path $_.FullName 'python.exe') }
    }
}

foreach ($name in @('python3.12', 'python')) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { $candidates += $cmd.Source }
}

foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    try {
        $version = & $candidate -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        if ($version -eq '3.12') { $python = $candidate; break }
    } catch {}
}

if (-not $python) {
    Write-Host ''
    Write-Host '没有找到 Python 3.12。' -ForegroundColor Yellow
    Write-Host '请先安装 Python 3.12（安装时勾选 Add python.exe to PATH），或安装 uv 后重试。'
    Write-Host 'Kokoro 需要 Python 3.12；软件主程序仍然可以使用 Python 3.14。'
    exit 1
}

$venvPython = Join-Path $service '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Host "使用 Python：$python"
    Write-Host '创建 kokoro-service 独立虚拟环境...'
    & $python -m venv (Join-Path $service '.venv')
    if ($LASTEXITCODE -ne 0) { throw '创建虚拟环境失败' }
}

Write-Host '安装 Kokoro 依赖（首次约 200MB，可能需要几分钟）...'
& $venvPython -m pip install --disable-pip-version-check --no-input -i https://pypi.tuna.tsinghua.edu.cn/simple setuptools wheel
& $venvPython -m pip install --disable-pip-version-check --no-input --no-deps -r (Join-Path $service 'requirements-lock.txt') -i https://pypi.tuna.tsinghua.edu.cn/simple
if ($LASTEXITCODE -ne 0) {
    Write-Host '镜像安装失败，改用默认 PyPI 重试...' -ForegroundColor Yellow
    & $venvPython -m pip install --disable-pip-version-check --no-input -i https://pypi.tuna.tsinghua.edu.cn/simple setuptools wheel
    & $venvPython -m pip install --disable-pip-version-check --no-input --no-deps -r (Join-Path $service 'requirements-lock.txt')
    if ($LASTEXITCODE -ne 0) { throw '依赖安装失败' }
}

& $venvPython (Join-Path $service 'patch_kokoro.py')

Write-Host ''
Write-Host 'Kokoro 依赖安装完成。' -ForegroundColor Green
Write-Host '第一次双击“启动Kokoro语音.cmd”会自动下载约 380MB 模型，请保持网络。'
Write-Host '模型加载完成后，软件“声音设置”里选择“Kokoro 本地语音”。'
