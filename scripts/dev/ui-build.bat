@echo off
rem scripts\dev\ui-build.bat — Windows wrapper, equivalent of ui-build.sh.
rem Builds the yukki desktop binary (Wails v2) with all artefacts kept inside
rem the repo so a single Defender exclusion covers everything.
rem
rem See DEVELOPMENT.md "Si l'AV bloque malgré tout" + TICKET IT in TODO.md.

setlocal

set "REPO_ROOT=%~dp0..\..\"
pushd "%REPO_ROOT%" >nul

if not defined GOCACHE  set "GOCACHE=%REPO_ROOT%.gocache"
if not defined GOTMPDIR set "GOTMPDIR=%REPO_ROOT%.gotmp"
if not defined TMP      set "TMP=%REPO_ROOT%.gotmp"
if not defined TEMP     set "TEMP=%REPO_ROOT%.gotmp"

if not exist "%GOCACHE%"  mkdir "%GOCACHE%"
if not exist "%GOTMPDIR%" mkdir "%GOTMPDIR%"

echo ^>^> GOCACHE=%GOCACHE%
echo ^>^> GOTMPDIR=%GOTMPDIR%
echo ^>^> TMP=%TMP%
echo ^>^> wails build -tags mock -skipbindings -platform windows/amd64 %*

wails build -tags mock -skipbindings -platform windows/amd64 %*

set EXITCODE=%ERRORLEVEL%
echo.
echo ^>^> Built. Binary at: %REPO_ROOT%build\bin\yukki.exe
if exist "%REPO_ROOT%build\bin\yukki.exe" dir /b "%REPO_ROOT%build\bin\"
popd >nul
exit /b %EXITCODE%
