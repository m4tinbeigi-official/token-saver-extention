#!/bin/bash
#
# اگر روی مک هنگام باز کردن Token Saver یکی از این خطاها را گرفتی:
#   • «is damaged and can't be opened»
#   • «cannot be opened because the developer cannot be verified»
#   • «Apple could not verify … is free of malware»
# این فایل را دابل‌کلیک کن. (هشدار استاندارد اپ‌های بدون امضای پولی است، نه بدافزار.)
#
APP="/Applications/Token Saver.app"

echo "==> رفع محدودیت Gatekeeper برای Token Saver…"
if [ ! -d "$APP" ]; then
  echo "اپ در $APP پیدا نشد. اول .dmg را باز کن و اپ را به Applications بکش."
  read -n 1 -s -r -p "یک کلید بزن…"; exit 1
fi

# حذف نشان quarantine (دلیل اصلی خطای «is damaged»)
xattr -cr "$APP" 2>/dev/null
# امضای ad-hoc تا روی Apple Silicon اجرا شود
codesign --force --deep --sign - "$APP" 2>/dev/null

echo "✓ انجام شد. حالا Token Saver را از Launchpad/Applications باز کن."
read -n 1 -s -r -p "یک کلید بزن تا بسته شود…"
echo ""
