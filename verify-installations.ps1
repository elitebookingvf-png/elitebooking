# Verification script for development tools
Write-Host "=== Development Tools Installation Status ===" -ForegroundColor Cyan
Write-Host ""

# Check Git
try {
    $gitVersion = git --version 2>$null
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git: Not installed or not in PATH" -ForegroundColor Red
}

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js: Not installed or not in PATH" -ForegroundColor Red
}

# Check npm
try {
    $npmVersion = npm --version 2>$null
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm: Not installed or not in PATH" -ForegroundColor Red
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "✅ pnpm: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm: Not installed or not in PATH" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Environment Variables ===" -ForegroundColor Cyan
Write-Host "PNPM_HOME: $env:PNPM_HOME"
Write-Host "Path includes pnpm: $($env:Path -like '*pnpm*')"

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Close and reopen PowerShell to refresh environment variables"
Write-Host "2. Navigate to your project: cd elitebooking"
Write-Host "3. Install dependencies: pnpm install"
Write-Host "4. Start development server: pnpm dev"
