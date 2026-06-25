@echo off
REM Token Saver — اجرای یک‌کلیکی سرور + باز کردن پنل ادمین (ویندوز)
cd /d "%~dp0"

if not exist node_modules (
  echo ==^> installing dependencies (first run only)...
  call npm install --no-audit --no-fund
)

REM باز کردن پنل ادمین در مرورگر پس از چند ثانیه
start "" cmd /c "timeout /t 3 >nul & start http://localhost:8080/admin"

echo ==^> running Token Saver server on http://localhost:8080/admin
call npm start
