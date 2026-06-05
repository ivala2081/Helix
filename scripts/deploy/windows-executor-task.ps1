<#
  Register the Helix executor as an every-minute Scheduled Task (TESTNET).

  Run ON THE VPS in an ELEVATED PowerShell, AFTER windows-executor-bootstrap.ps1
  has cloned the repo, installed deps, and a dry-run looked correct.

  Still TESTNET — this does NOT arm live trading. To go live later you'd set
  EXECUTOR_ENV=live + EXECUTOR_LIVE=1 (a separate, gated decision), not here.

  Safety:
    - MultipleInstances=IgnoreNew  → Task Scheduler won't start a 2nd copy while
      one is running. Combined with the DB single-flight lock (tick-lock.ts) =
      double protection against overlapping ticks / double-opens.
    - ExecutionTimeLimit 4 min     → a hung tick is killed BEFORE the 5-min lock
      lease expires, so a crashed run can't leave the lock stuck.

  Undo:  Unregister-ScheduledTask -TaskName "HelixExecutor" -Confirm:$false
#>

$ErrorActionPreference = "Stop"
$RepoDir  = "C:\helix"
$TaskName = "HelixExecutor"
$LogDir   = Join-Path $RepoDir "logs"
$LogFile  = Join-Path $LogDir "executor.log"

if (-not (Test-Path (Join-Path $RepoDir ".env.local"))) {
  throw "$RepoDir\.env.local missing — run windows-executor-bootstrap.ps1 first."
}
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# The command each tick runs: testnet executor-tick, output appended to the log.
$inner = "Set-Location '$RepoDir'; `$env:EXECUTOR_ENV='testnet'; npm run executor-tick *>> '$LogFile'"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"$inner`""

# Run now, then repeat every minute forever.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 1) `
  -RepetitionDuration ([TimeSpan]::MaxValue)

$settings = New-ScheduledTaskSettingsSet `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 4) `
  -RestartCount 0

# Run as SYSTEM so it works whether or not anyone is logged in (no stored password).
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "Registered '$TaskName' — runs every minute (testnet)." -ForegroundColor Green
Write-Host "Log: $LogFile"
Write-Host "Watch:   Get-Content '$LogFile' -Wait -Tail 20"
Write-Host "Disable: Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Remove:  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
