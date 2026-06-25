'use strict';

/*
 * Token Saver — registry of installable open-source tools.
 *
 * To add a new tool in the future, append an object to TOOLS with the same
 * shape. The UI and the installer pick everything up automatically.
 *
 * install spec per platform key (mac | win | linux):
 *   { type: 'shell', cmd: '<command run via bash -lc>' }
 *   { type: 'manual', cmd: '<command to copy>', note: '<why manual>' }
 */

const TOOLS = [
  {
    id: 'codebase-memory-mcp',
    name: 'Codebase Memory (MCP)',
    tagline: 'تا ~۱۰× توکن کمتر برای کاوش کدبیس',
    repo: 'https://github.com/DeusData/codebase-memory-mcp',
    recommended: true,

    // High-level explanation shown before install
    description:
      'یک سرور MCP که با استفاده از Tree-sitter یک «گراف دانش» پایدار از کدبیس می‌سازد. ' +
      'به‌جای اینکه agent برای فهمیدن پروژه فایل‌به‌فایل بخواند، پرسش‌های ساختاری را روی گراف پاسخ می‌دهد ' +
      'و فقط همان بخش مرتبط را برمی‌گرداند.',

    howItWorks:
      'installer خودش agentهای نصب‌شده را تشخیص می‌دهد و MCP config را برایشان اضافه می‌کند. ' +
      'بعد از نصب فقط agent را restart می‌کنی و می‌گویی: «Index this project». ' +
      'از آن به بعد، agent به‌جای file-by-file reading از گراف کد استفاده می‌کند.',

    claims: [
      'ادعای پروژه: تا ~۱۰ برابر کاهش مصرف توکن در codebase exploration',
      'ادعای پروژه: ~۲.۱ برابر tool call کمتر (روی ۳۱ مخزن)'
    ],

    notes: [
      'داده کاملاً محلی (local-first) می‌ماند؛ کد به سروری ارسال نمی‌شود.',
      'تک‌باینری بدون وابستگی، با امنیت زنجیره‌تأمین مستند (checksum/Sigstore/SLSA).',
      'سازگار با Claude Code، Cursor، Codex CLI، Gemini CLI، Zed، VS Code و سایر MCP clientها.'
    ],

    afterInstall: 'agent را restart کن و در آن بنویس: «Index this project».',

    install: {
      mac: {
        type: 'shell',
        cmd: 'curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash -s -- --ui'
      },
      linux: {
        type: 'shell',
        cmd: 'curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash -s -- --ui'
      },
      win: {
        type: 'shell',
        cmd: 'curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash -s -- --ui',
        note: 'روی ویندوز به محیط bash (WSL یا Git Bash) نیاز دارد. اگر نصب نبود، دستور را در WSL/Git Bash اجرا کن.'
      }
    }
  }

  // ───────────────────────────────────────────────────────────────
  // مثال افزودن ابزار جدید در آینده:
  // {
  //   id: 'snip',
  //   name: 'snip — فشرده‌سازی خروجی shell',
  //   tagline: '۶۰–۹۰٪ توکن کمتر در خروجی دستورها',
  //   repo: '...',
  //   description: '...', howItWorks: '...', claims: [...], notes: [...],
  //   afterInstall: 'snip init',
  //   install: { mac:{type:'shell',cmd:'brew install snip'}, win:{...}, linux:{...} }
  // }
];

function getTool(id) {
  return TOOLS.find((t) => t.id === id) || null;
}

function platformKey(processPlatform) {
  if (processPlatform === 'darwin') return 'mac';
  if (processPlatform === 'win32') return 'win';
  return 'linux';
}

module.exports = { TOOLS, getTool, platformKey };
