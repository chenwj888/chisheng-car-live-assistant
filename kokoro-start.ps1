﻿# -*- coding: utf-8 -*-
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$service = Join-Path $root 'kokoro-service'
$portable = Join-Path $root 'runtime\python312\python.exe'
$venv = Join-Path $service '.venv\Scripts\python.exe'
$python = if (Test-Path -LiteralPath $portable) { $portable } else { $venv }
$site = Join-Path $service 'site-packages'

if (-not (Test-Path -LiteralPath $python)) {
    Write-Host '还没有可用的 Kokoro Python 环境。' -ForegroundColor Yellow
    Read-Host '按回车退出'
    exit 1
}
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
if (Test-Path -LiteralPath $site) { $env:PYTHONPATH = $site }

Set-Location -LiteralPath $service
Write-Host '正在启动 Kokoro 本地语音服务...'
Write-Host '首次启动会下载模型（约 380MB），请保持网络，不要关闭这个窗口。'
& $python main.py
