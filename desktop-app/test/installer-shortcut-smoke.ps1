$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$cacheDir = Join-Path $env:LOCALAPPDATA 'electron-builder\Cache'
$compiler = Get-ChildItem -LiteralPath $cacheDir -Filter makensis.exe -Recurse |
    Where-Object { $_.Directory.Name -ne 'Bin' } | Select-Object -First 1
$plugin = Get-ChildItem -LiteralPath $cacheDir -Filter WinShell.dll -Recurse |
    Where-Object { $_.Directory.Name -eq 'x86-unicode' } | Select-Object -First 1
if (!$compiler -or !$plugin) { throw 'Build CRM once to populate the NSIS compiler and plugin cache.' }
$testDir = Join-Path $projectDir ('dist\shortcut-smoke-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testDir | Out-Null
$includePath = Join-Path $projectDir 'build\installer.nsh'
$testScript = @'
Unicode true
RequestExecutionLevel user
SilentInstall silent
Name "CRM isolated shortcut test"
OutFile "__OUTFILE__"
!addplugindir "__PLUGINDIR__"
!define APP_DESCRIPTION "CRM shortcut repair test"
!define APP_ID "com.handdy.timetracker"
!include "__INCLUDE__"
Section
  StrCpy $R0 "original-r0"
  StrCpy $R1 "original-r1"
  !insertmacro repairCrmShortcut "$EXEDIR\CRM.lnk" "$EXEDIR\CRM.exe"
  FileOpen $0 "$EXEDIR\result.txt" w
  FileWrite $0 "$R0|$R1"
  FileClose $0
SectionEnd
'@
$testScript = $testScript.Replace('__OUTFILE__', (Join-Path $testDir 'repair-test.exe')).
    Replace('__PLUGINDIR__', $plugin.Directory.FullName).Replace('__INCLUDE__', $includePath)
$nsiPath = Join-Path $testDir 'repair-test.nsi'
[IO.File]::WriteAllText($nsiPath, $testScript)
& $compiler.FullName /V2 $nsiPath
if ($LASTEXITCODE -ne 0) { throw 'The isolated NSIS test did not compile.' }
$linkPath = Join-Path $testDir 'CRM.lnk'
$exePath = Join-Path $testDir 'CRM.exe'
$otherPath = Join-Path $testDir 'Other.lnk'
$oldExe = Join-Path $testDir 'old-crm.exe'
[IO.File]::WriteAllText($exePath, 'test fixture, never executed')
[IO.File]::WriteAllText($oldExe, 'test fixture, never executed')
$shell = New-Object -ComObject WScript.Shell
function New-TestShortcut([string]$path) {
    $link = $shell.CreateShortcut($path)
    $link.TargetPath = $oldExe
    $link.Arguments = '--old-shortcut'
    $link.Save()
    Set-Content -LiteralPath $path -Stream Zone.Identifier -Value "[ZoneTransfer]`r`nZoneId=3"
}
function Run-Repair {
    $process = Start-Process -FilePath (Join-Path $testDir 'repair-test.exe') -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -ne 0) { throw "Repair test failed with exit code $($process.ExitCode)." }
    if ([IO.File]::ReadAllText((Join-Path $testDir 'result.txt')) -ne 'original-r0|original-r1') {
        throw 'Repair changed caller registers.'
    }
}
New-TestShortcut $linkPath
New-TestShortcut $otherPath
Run-Repair
$repaired = $shell.CreateShortcut($linkPath)
if ($repaired.TargetPath -ne $exePath -or $repaired.Arguments -ne '') { throw 'The repaired shortcut has an incorrect target or arguments.' }
if (Get-Item -LiteralPath $linkPath -Stream Zone.Identifier -ErrorAction SilentlyContinue) { throw 'The repaired shortcut still has the downloaded-file marker.' }
if (!(Get-Item -LiteralPath $otherPath -Stream Zone.Identifier -ErrorAction SilentlyContinue)) { throw 'An unrelated shortcut was changed.' }
Run-Repair
if ($shell.CreateShortcut($linkPath).TargetPath -ne $exePath) { throw 'Repeated repair changed the target.' }
New-TestShortcut $linkPath
$locked = [IO.File]::Open($linkPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
try { Run-Repair } finally { $locked.Dispose() }
if ($shell.CreateShortcut($linkPath).TargetPath -ne $oldExe) { throw 'A locked shortcut should remain intact.' }
Remove-Item -LiteralPath $linkPath
Run-Repair
if (Test-Path -LiteralPath $linkPath) { throw 'Repair created an unwanted new taskbar pin.' }
New-TestShortcut $linkPath
Remove-Item -LiteralPath $exePath
Run-Repair
if ($shell.CreateShortcut($linkPath).TargetPath -ne $oldExe) { throw 'Missing executable should leave the old shortcut intact.' }
Write-Output 'PASS: actual NSIS repair clears the CRM shortcut marker, preserves other shortcuts, is repeatable, and safely handles locked files and absent links/executables.'
