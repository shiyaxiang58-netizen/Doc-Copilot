$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
  $node = $nodeCommand.Source
} else {
  $node = Join-Path $HOME '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
  $bundledModules = Join-Path $HOME '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
  if (-not (Test-Path -LiteralPath $node)) {
    Write-Host '未找到 Node.js。请先安装 Node.js 20 或更高版本。' -ForegroundColor Yellow
    Read-Host '按 Enter 退出'
    exit 1
  }
  if (Test-Path -LiteralPath $bundledModules) { $env:NODE_PATH = $bundledModules }
}

if (-not (Test-Path -LiteralPath '.env')) {
  Write-Host '尚未找到 .env 配置文件。请复制 .env.example 为 .env，并填写 AI_API_KEY 与 AI_MODEL。' -ForegroundColor Yellow
  Write-Host '服务仍会启动，但真实分析会提示尚未配置 AI。'
}

Write-Host '正在启动 Doc Copilot…' -ForegroundColor Cyan
Write-Host '启动后请访问 http://127.0.0.1:3000'
& $node 'server.mjs'
