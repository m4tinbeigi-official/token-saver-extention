#!/bin/bash
#
# Token Saver — اجرای یک‌کلیکی سرور + باز کردن خودکار پنل ادمین
# روی مک این فایل را در Finder دابل‌کلیک کن.
# دفعات بعد سریع‌تر بالا می‌آید چون نصب وابستگی‌ها فقط بار اول انجام می‌شود.
#
cd "$(dirname "$0")"

# وابستگی‌ها فقط اگر نصب نباشند (این مرحله کندترین بخش است و فقط یک‌بار اجرا می‌شود)
if [ ! -d node_modules ]; then
  echo "==> نصب وابستگی‌ها (فقط بار اول)…"
  npm install --no-audit --no-fund
fi

PORT="${PORT:-8080}"
URL="http://localhost:${PORT}/admin"

# به‌محض آماده‌شدن سرور، پنل ادمین را در مرورگر باز کن
(
  for i in $(seq 1 40); do
    if curl -s -o /dev/null "http://localhost:${PORT}/admin/login"; then
      open "$URL"
      break
    fi
    sleep 0.25
  done
) &

echo "==> اجرای سرور Token Saver روی ${URL}"
echo "    (برای توقف، Ctrl+C یا بستن این پنجره)"
npm start
