# One-shot local setup. Run from the project folder after installing Node.js 20.11+:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js not found on PATH. Install Node 20.11+ (https://nodejs.org) and open a new terminal."
}
Write-Host "Node $(node -v) / npm $(npm -v)"

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env from .env.example - fill in ANTHROPIC_API_KEY and OPENROUTER_API_KEY."
}

Write-Host "`n==> Installing dependencies"
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

# Pin the Anthropic SDK to the concrete latest version (package.json ships with the 'latest' tag).
npm install "@anthropic-ai/sdk@latest"
if ($LASTEXITCODE -ne 0) { throw "Anthropic SDK install failed" }

Write-Host "`n==> Type-checking"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Type-check failed - see errors above" }

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "`n==> Starting Postgres + pgvector"
    docker compose up -d postgres
    Start-Sleep -Seconds 5
    Write-Host "`n==> Applying migrations"
    npx prisma migrate deploy
} else {
    Write-Host "`nDocker not found. Point DATABASE_URL at a Postgres 15+ instance with pgvector, then run: npx prisma migrate deploy"
}

Write-Host "`nDone. Start the app with: npm run dev  ->  http://localhost:3000"
