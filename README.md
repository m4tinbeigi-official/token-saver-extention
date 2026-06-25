# Token Saver

زیرساخت سبک‌تر برای AI Coding Agents — توکن کمتر، context تمیزتر، هزینه قابل‌کنترل‌تر.

این مخزن شامل سه بخش است: **وب‌سایت معرفی**، **صفحه آموزش رایگان**، و **نرم‌افزار دسکتاپ رایگان** (ویندوز/مک) که ابزارهای کاهش مصرف توکن را روی پروژه‌ی کاربر به‌صورت خودکار نصب و کانفیگ می‌کند.

## دانلود نرم‌افزار

نسخه‌های آماده‌ی ویندوز (`.exe`) و مک (`.dmg`) در بخش
[Releases](https://github.com/m4tinbeigi-official/tokensaver/releases/latest) قرار دارند.

> **مک:** چون اپ رایگان و بدون امضای پولی اپل است، بار اول روی اپ **راست‌کلیک → Open** بزن، یا در ترمینال:
> `xattr -cr "/Applications/Token Saver.app"`

## ساختار مخزن

| مسیر | توضیح |
| --- | --- |
| `index.html` · `styles.css` · `script.js` | وب‌سایت تک‌صفحه‌ای معرفی و دانلود |
| `tutorial.html` | صفحه آموزش رایگان (تولیدشده از `deep-research-report.md`) |
| `build-tutorial.js` | تبدیل گزارش markdown به صفحه آموزش |
| `desktop/` | اپلیکیشن دسکتاپ Electron (ویزارد نصب خودکار ابزار) |
| `.github/workflows/release.yml` | ساخت و انتشار خودکار نصبی‌ها |

## نرم‌افزار دسکتاپ

ویزاردی که پروژه را اسکن می‌کند، چند سؤال فنی می‌پرسد، سپس ابزارهای متن‌باز کاهش توکن (مثل `codebase-memory-mcp` و `snip`) را با یک کلیک نصب و فایل‌های کانفیگ agent را تولید می‌کند. جزئیات اجرا و ساخت در [`desktop/README.md`](desktop/README.md).

```bash
cd desktop
npm install
npm start          # اجرای اپ در حالت توسعه
```

## انتشار خودکار

با هر push به `main` که چیزی در `desktop/` تغییر کند (یا با push یک tag مثل `v1.1.0`)، GitHub Actions نسخه‌ی ویندوز و مک را می‌سازد و در یک Release با شماره‌ی نسخه‌ی `desktop/package.json` منتشر می‌کند. برای انتشار نسخه‌ی جدید کافی است `version` را در `desktop/package.json` بالا ببری و push کنی.

## وب‌سایت

سایت ایستا است؛ کافی است `index.html` را باز کنی یا روی هر static host (مثل GitHub Pages) منتشر کنی.

## لایسنس

MIT
