@echo off
rem scripts\dev\test-local.bat — Windows wrapper, equivalent of test-local.sh.
rem Runs the Go test suite with all build artifacts kept inside the repo
rem (.gocache, .gotmp, bin) instead of the system %TEMP%.
rem
rem See DEVELOPMENT.md for the rationale (Windows Defender / corporate AV).

setlocal

set "REPO_ROOT=%~dp0..\..\"
pushd "%REPO_ROOT%" >nul

if not defined GOCACHE  set "GOCACHE=%REPO_ROOT%.gocache"
if not defined GOTMPDIR set "GOTMPDIR=%REPO_ROOT%.gotmp"

if not exist "%GOCACHE%"  mkdir "%GOCACHE%"
if not exist "%GOTMPDIR%" mkdir "%GOTMPDIR%"

echo ^>^> GOCACHE=%GOCACHE%
echo ^>^> GOTMPDIR=%GOTMPDIR%

if "%~1"=="" (
    go test -count=1 ./...
) else (
    go test -count=1 %*
)

set EXITCODE=%ERRORLEVEL%
popd >nul
exit /b %EXITCODE%
