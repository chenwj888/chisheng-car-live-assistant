# -*- coding: utf-8 -*-
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$service = Join-Path $root 'kokoro-service'
$python = Join-Path $service '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $python)) {
    Write-Host '还没有安装 Kokoro 环境。请先双击“安装Kokoro语音.cmd”。' -ForegroundColor Yellow
    Read-Host '按回车退出'
    exit 1
}

Set-Location -LiteralPath $service
Write-Host '正在启动 Kokoro 本地语音服务...'
Write-Host '首次启动会下载模型（约 380MB），请保持网络，不要关闭这个窗口。'
& $python main.py
