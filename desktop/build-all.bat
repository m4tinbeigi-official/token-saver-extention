@echo off
REM Token Saver — ساخت یک‌کلیکی نصبی ویندوز
REM روی ویندوز این فایل را دابل‌کلیک کن.
cd /d "%~dp0"

echo ============================================
echo   Token Saver - build Windows installer
echo ============================================

if not exist node_modules (
  echo ==^> installing dependencies...
  call npm install
)

echo.
echo ==^> building Windows (.exe)...
call npm run dist:win

echo.
echo Note: ساخت نسخه مک (.dmg) فقط روی macOS ممکن است.
echo برای هر دو نسخه به‌صورت خودکار، یک git tag بزن تا GitHub Actions بسازد.
echo.
echo Done. installers are in the release\ folder:
dir /b release 2>nul
pause
