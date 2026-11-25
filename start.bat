@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org then run this again.
  pause
  exit /b
)
if not exist node_modules (
  echo Installing, please wait...
  call npm install
)
node server.js prnk911
pause
