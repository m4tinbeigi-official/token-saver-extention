#!/bin/bash
#
# Token Saver — ساخت یک‌کلیکی نصبی مک و ویندوز
# روی مک این فایل را در Finder دابل‌کلیک کن (یا در ترمینال اجرا کن).
#
set -e
cd "$(dirname "$0")"

echo "════════════════════════════════════════════"
echo "  Token Saver — ساخت نصبی‌های مک و ویندوز"
echo "════════════════════════════════════════════"

# 1) نصب وابستگی‌ها در صورت نبود
if [ ! -d node_modules ]; then
  echo "==> نصب وابستگی‌ها (npm install)…"
  npm install
fi

# 2) ساخت نسخه مک (.dmg) — native و سریع
echo ""
echo "==> ساخت نسخه مک (.dmg)…"
npm run dist:mac

# 3) ساخت نسخه ویندوز (.exe)
echo ""
echo "==> ساخت نسخه ویندوز (.exe)…"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "   (از طریق Docker + Wine — قابل‌اعتمادترین روش)"
  docker run --rm \
    -v "$PWD":/project \
    -v "$HOME/.cache/electron":/root/.cache/electron \
    -v "$HOME/.cache/electron-builder":/root/.cache/electron-builder \
    electronuserland/builder:wine \
    /bin/bash -c "npm ci && npm run dist:win"
elif command -v wine >/dev/null 2>&1; then
  echo "   (از طریق Wine محلی)"
  npm run dist:win
else
  echo ""
  echo "⚠️  برای ساخت نسخه ویندوز روی مک، یکی از این‌ها لازم است:"
  echo "    • Docker Desktop (پیشنهادی) — از https://www.docker.com/products/docker-desktop نصب کن"
  echo "    • یا Wine:  brew install --cask wine-stable"
  echo ""
  echo "    جایگزین بدون نصب: یک git tag بزن تا GitHub Actions هر دو نسخه را بسازد."
fi

echo ""
echo "✓ تمام شد. فایل‌های نصبی در پوشه release/ هستند:"
ls -1 release/ 2>/dev/null | sed 's/^/   - /' || true
open release 2>/dev/null || true

echo ""
read -n 1 -s -r -p "برای بستن این پنجره یک کلید بزن…"
echo ""
