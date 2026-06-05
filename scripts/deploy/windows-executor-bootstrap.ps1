<#
  Helix customer executor — Windows Server bootstrap (Phase C, TESTNET / DRY-RUN).

  Run this ON THE VPS, in an ELEVATED PowerShell (Run as Administrator), via RDP.
  It is idempotent — safe to re-run. It does NOT arm live trading: the HARD GATE
  (docs/executor-deployment.md) still holds, so we deploy in testnet and prove a
  dry-run only. Going live (EXECUTOR_LIVE=1, real orders) waits for V5's live
  track record and is a separate, deliberate step.

  What it does:
    1. Install Node 22 LTS (official MSI) if missing — winget isn't on Server.
    2. Install Git for Windows if missing.
    3. Clone (or pull) github.com/ivala2081/Helix into C:\helix.
    4. npm ci.
    5. Print the EGRESS IP (what customers must whitelist) — compare to 62.84.189.9.
    6. If .env.local is present: run ONE testnet DRY-RUN tick (zero orders).
       If absent: stop with instructions to copy it, then re-run.

  Usage on the box:
    Set-ExecutionPolicy -Scope Process Bypass -Force
    .\windows-executor-bootstrap.ps1
  (or paste the whole script into an elevated PowerShell window)
#>

$ErrorActionPreference = "Stop"
$RepoUrl  = "https://github.com/ivala2081/Helix.git"
$RepoDir  = "C:\helix"
$MgmtIp   = "62.84.189.9"   # the management IP — we VERIFY egress matches this

function Write-Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# ─── 1. Node 22 LTS ─────────────────────────────────────────────────
Write-Step "Node.js"
$needNode = $true
if (Have node) {
  $v = (node -v).TrimStart("v")
  if ([int]($v.Split(".")[0]) -ge 20) { $needNode = $false; Write-Host "Node $v already installed." }
  else { Write-Host "Node $v too old — upgrading." }
}
if ($needNode) {
  Write-Host "Resolving latest Node 22 LTS..."
  $idx = Invoke-RestMethod "https://nodejs.org/dist/index.json"
  $ver = ($idx | Where-Object { $_.version -like "v22.*" } | Select-Object -First 1).version
  $msi = "node-$ver-x64.msi"
  $url = "https://nodejs.org/dist/$ver/$msi"
  $dst = Join-Path $env:TEMP $msi
  Write-Host "Downloading $url"
  Invoke-WebRequest $url -OutFile $dst
  Write-Host "Installing $msi (silent)..."
  Start-Process msiexec.exe -ArgumentList "/i `"$dst`" /qn /norestart" -Wait
  # Refresh PATH for this session so `node`/`npm` resolve immediately.
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path","User")
  Write-Host "Node installed: $(node -v)"
}

# ─── 2. Git ─────────────────────────────────────────────────────────
Write-Step "Git"
if (Have git) {
  Write-Host "Git already installed: $(git --version)"
} else {
  Write-Host "Resolving latest Git for Windows..."
  $rel = Invoke-RestMethod "https://api.github.com/repos/git-for-windows/git/releases/latest" `
            -Headers @{ "User-Agent" = "helix-bootstrap" }
  $asset = $rel.assets | Where-Object { $_.name -like "*64-bit.exe" -and $_.name -notlike "*rc*" } | Select-Object -First 1
  $dst = Join-Path $env:TEMP $asset.name
  Write-Host "Downloading $($asset.name)"
  Invoke-WebRequest $asset.browser_download_url -OutFile $dst -Headers @{ "User-Agent" = "helix-bootstrap" }
  Write-Host "Installing Git (silent)..."
  Start-Process $dst -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL /SP-" -Wait
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path","User")
  Write-Host "Git installed: $(git --version)"
}

# ─── 3. Clone / update the repo ─────────────────────────────────────
Write-Step "Repo @ $RepoDir"
if (Test-Path (Join-Path $RepoDir ".git")) {
  Write-Host "Repo exists — pulling latest."
  git -C $RepoDir pull --ff-only
} else {
  # First clone of a PRIVATE repo prompts for GitHub auth — Git Credential
  # Manager opens a browser/device login. Sign in once; it's cached after.
  Write-Host "Cloning (you'll be asked to sign in to GitHub once)..."
  git clone $RepoUrl $RepoDir
}
Set-Location $RepoDir

# ─── 4. Dependencies ────────────────────────────────────────────────
Write-Step "npm ci"
npm ci

# ─── 5. Egress IP (what customers whitelist) ────────────────────────
Write-Step "Egress IP"
npm run executor-ip
Write-Host "`nMANAGEMENT IP is $MgmtIp. If the egress IP above MATCHES, that's the"
Write-Host "address customers whitelist on their Binance API key. If it DIFFERS, use"
Write-Host "the egress IP shown above instead." -ForegroundColor Yellow

# ─── 6. Secrets + dry-run ───────────────────────────────────────────
Write-Step "Config + dry-run"
if (-not (Test-Path (Join-Path $RepoDir ".env.local"))) {
  Write-Host @"
.env.local NOT found in $RepoDir.

Copy it from your LOCAL machine (it holds the Supabase + APP_ENCRYPTION_KEY that
decrypts customer keys) into $RepoDir\.env.local — via RDP clipboard/drive copy.
It must contain at least:
  NEXT_PUBLIC_SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...
  APP_ENCRYPTION_KEY=...        # the SAME key used to encrypt stored API secrets
  EXECUTOR_ENV=testnet

Then re-run this script (it will pick up from here).
"@ -ForegroundColor Yellow
  return
}

Write-Host "Running ONE testnet DRY-RUN tick (decides + logs, places NO orders)..."
$env:EXECUTOR_ENV    = "testnet"
$env:EXECUTOR_DRYRUN = "1"
npm run executor-tick

Write-Step "Done"
Write-Host "Bootstrap complete. Review the egress IP + dry-run output above." -ForegroundColor Green
Write-Host "Next (separate step, after we review): register the every-minute Scheduled Task."
