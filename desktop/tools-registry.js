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
  },

  {
    id: 'snip',
    name: 'snip — فشرده‌سازی خروجی دستورها',
    tagline: '۶۰–۹۰٪ توکن کمتر در خروجی shell',
    repo: 'https://github.com/getsavvyinc/snip',
    recommended: false,
    description:
      'یک فیلتر سبک که خروجی پرحجم دستورها (تست، build، لاگ، JSON) را قبل از رسیدن به agent خلاصه و فشرده می‌کند، بدون از‌دست‌رفتن سیگنال مهم.',
    howItWorks:
      'بعد از نصب، `snip init` را اجرا کن تا با agentهای پشتیبانی‌شده یکپارچه شود؛ از آن پس خروجی دستورها خودکار فیلتر می‌شود.',
    claims: [
      'ادعای پروژه: ۶۰–۹۰٪ کاهش توکن روی خروجی دستورهای رایج',
      'نمونه رسمی: خروجی go test از ۶۸۹ به ۱۶ توکن (~۹۷٪ کمتر)'
    ],
    notes: [
      'تک‌باینری سبک با degradation امن؛ فیلترها قابل‌تنظیم‌اند.',
      'مکمل عالی برای code graph: یکی نویز خروجی را کم می‌کند، دیگری file-crawl را.'
    ],
    afterInstall: 'دستور `snip init` را در ریشه پروژه اجرا کن.',
    install: {
      mac: { type: 'shell', cmd: 'curl -fsSL https://snip.sh/install.sh | bash' },
      linux: { type: 'shell', cmd: 'curl -fsSL https://snip.sh/install.sh | bash' },
      win: { type: 'shell', cmd: 'curl -fsSL https://snip.sh/install.sh | bash', note: 'روی ویندوز به WSL یا Git Bash نیاز دارد.' }
    }
  },

  // ─── ابزارهای Pro (قفل‌شده؛ در آینده با خرید فعال می‌شوند) ───
  {
    id: 'rtk',
    name: 'RTK — فشرده‌سازی خروجی shell',
    tagline: '۶۰–۹۰٪ توکن کمتر در خروجی دستورها',
    repo: 'https://github.com/getrtk/rtk',
    locked: true,
    description: 'پروکسی سطح shell که خروجی دستورهای توسعه را بازنویسی و فیلتر می‌کند؛ تک‌باینری Rust بدون وابستگی.',
    howItWorks: 'با agentهای CLI یکپارچه می‌شود و خروجی پرنویز را پیش از ورود به context فیلتر می‌کند.',
    claims: ['ادعای پروژه: ۶۰–۹۰٪ کاهش توکن روی خروجی دستورها'],
    notes: ['telemetry به‌صورت پیش‌فرض خاموش است.'],
    afterInstall: 'پس از فعال‌سازی، راهنمای یکپارچه‌سازی نمایش داده می‌شود.',
    install: { mac: { type: 'shell', cmd: 'brew install rtk' }, linux: { type: 'shell', cmd: 'cargo install rtk' }, win: { type: 'shell', cmd: 'cargo install rtk' } }
  },
  {
    id: 'headroom',
    name: 'Headroom — فشرده‌سازی context عمومی',
    tagline: 'تا ۹۵٪ کاهش توکن روی RAG و tool output',
    repo: 'https://github.com/headroom-ai/headroom',
    locked: true,
    description: 'کتابخانه + proxy + MCP که خروجی ابزار، لاگ، فایل، RAG chunk و history را قبل از رسیدن به مدل فشرده می‌کند.',
    howItWorks: 'به‌عنوان proxy یا MCP جلوی مدل می‌نشیند و context را برگشت‌پذیر فشرده می‌کند.',
    claims: ['ادعای پروژه: ۶۰–۹۵٪ کاهش توکن'],
    notes: ['برای appهای prompt-heavy و RAG عالی است.'],
    afterInstall: 'پس از فعال‌سازی، تنظیمات proxy نمایش داده می‌شود.',
    install: { mac: { type: 'shell', cmd: 'pip install "headroom-ai[all]"' }, linux: { type: 'shell', cmd: 'pip install "headroom-ai[all]"' }, win: { type: 'shell', cmd: 'pip install "headroom-ai[all]"' } }
  },
  {
    id: 'llmlingua',
    name: 'LLMLingua — فشرده‌سازی prompt',
    tagline: 'تا ۲۰× فشرده‌سازی prompt',
    repo: 'https://github.com/microsoft/LLMLingua',
    locked: true,
    description: 'فشرده‌سازی prompt با یک مدل کوچک برای حذف tokenهای کم‌اهمیت، قابل‌استفاده روی هر مدل black-box.',
    howItWorks: 'روی ورودی کار می‌کند؛ مستقل از provider (OpenAI/Anthropic/Gemini).',
    claims: ['مقاله اصلی: تا ۲۰× فشرده‌سازی با افت کم'],
    notes: ['library/research؛ نیازمند ارزیابی task-specific.'],
    afterInstall: 'پس از فعال‌سازی، نمونه‌ی یکپارچه‌سازی نمایش داده می‌شود.',
    install: { mac: { type: 'shell', cmd: 'pip install llmlingua' }, linux: { type: 'shell', cmd: 'pip install llmlingua' }, win: { type: 'shell', cmd: 'pip install llmlingua' } }
  },
  {
    id: 'mem0',
    name: 'Mem0 — حافظه بلندمدت agent',
    tagline: 'تا ۹۰٪+ صرفه‌جویی در هزینه توکن',
    repo: 'https://github.com/mem0ai/mem0',
    locked: true,
    description: 'لایه‌ی memory برای agentها؛ به‌جای حمل کل تاریخچه، فقط memoryهای مرتبط را بازیابی می‌کند.',
    howItWorks: 'memory قابل‌جستجو می‌سازد و از paste کردن history تکراری جلوگیری می‌کند.',
    claims: ['مقاله: ۹۰٪+ صرفه‌جویی در token cost', 'p95 latency تا ۹۱٪ کمتر'],
    notes: ['برای agentهای طولانی‌عمر و cross-session مناسب است.'],
    afterInstall: 'پس از فعال‌سازی، راه‌اندازی self-hosted نمایش داده می‌شود.',
    install: { mac: { type: 'shell', cmd: 'pip install mem0ai' }, linux: { type: 'shell', cmd: 'pip install mem0ai' }, win: { type: 'shell', cmd: 'pip install mem0ai' } }
  },
  {
    id: 'repomix',
    name: 'Repomix — بسته‌بندی repo برای prompt',
    tagline: 'کنترل بودجه توکن ورودی',
    repo: 'https://github.com/yamadashy/repomix',
    locked: true,
    description: 'کل repo را در یک فایل AI-friendly با شمارش توکن و budget guard بسته‌بندی می‌کند.',
    howItWorks: 'با یک دستور، خروجی prompt-friendly و اندازه‌پذیر از پروژه می‌سازد.',
    claims: ['کنترل بودجه و دید نسبت به مصرف توکن ورودی'],
    notes: ['ignore-aware؛ مناسب پروژه‌های متوسط.'],
    afterInstall: 'پس از فعال‌سازی، دستور بسته‌بندی نمایش داده می‌شود.',
    install: { mac: { type: 'shell', cmd: 'npx repomix' }, linux: { type: 'shell', cmd: 'npx repomix' }, win: { type: 'shell', cmd: 'npx repomix' } }
  }
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
