param(
  [string]$Remote = "origin",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$appText = Get-Content -LiteralPath (Join-Path $root "app.py") -Raw -Encoding UTF8
$match = [regex]::Match($appText, 'APP_VERSION\s*=\s*"([0-9]+\.[0-9]+\.[0-9]+)"')
if (-not $match.Success) {
  throw "没有在 app.py 找到 APP_VERSION"
}
$version = $match.Groups[1].Value
$tag = "v$version"

if (-not (Test-Path (Join-Path $root ".git"))) {
  throw "当前目录不是 Git 仓库"
}

$remotes = git remote
if ($remotes -notcontains $Remote) {
  throw "缺少远程仓库 $Remote，请先执行 git remote add $Remote <GitHub URL>"
}

git add -A
$hasStaged = $true
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  $hasStaged = $false
}

if ($hasStaged) {
  git commit -m "release: $tag"
  if ($LASTEXITCODE -ne 0) { throw "git commit 失败" }
} else {
  Write-Host "没有待提交的源码改动，只检查版本标签。" -ForegroundColor DarkGray
}

$existingTag = git tag -l $tag
if (-not $existingTag) {
  git tag -a $tag -m "release $tag"
  if ($LASTEXITCODE -ne 0) { throw "创建标签失败" }
} else {
  Write-Host "标签 $tag 已存在。" -ForegroundColor DarkGray
}

git push $Remote $Branch
if ($LASTEXITCODE -ne 0) { throw "推送分支失败" }
git push $Remote $tag
if ($LASTEXITCODE -ne 0) { throw "推送标签失败" }

Write-Host ""
Write-Host "已同步 GitHub：$tag" -ForegroundColor Green
Write-Host "仓库：$(git remote get-url $Remote)"
