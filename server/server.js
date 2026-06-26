'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(__dirname, 'db.json');
const MERCHANT_ID = process.env.MERCHANT_ID || '00000000-0000-0000-0000-000000000000';
const IS_SANDBOX = MERCHANT_ID === '00000000-0000-0000-0000-000000000000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// --- App Specific Configuration (managed on server) ---
const SERVER_TOOLS_REGISTRY = [
  // --- ۱. فشرده‌سازی و پروکسی (compression) ---
  {
    id: 'headroom',
    name: 'Headroom — فشرده‌سازی کانتکست عمومی',
    category: 'compression',
    tagline: 'کاهش ۶۰–۹۵٪ مصرف توکن روی RAG و لاگ‌ها',
    repo: 'https://github.com/headroom-ai/headroom',
    locked: true,
    price: 50000,
    description: 'کتابخانه + پروکسی + MCP که خروجی ابزار، لاگ، فایل، RAG chunk و تاریخچه را قبل از رسیدن به LLM فشرده می‌کند.',
    howItWorks: 'به‌عنوان پروکسی یا سرور MCP جلوی مدل می‌نشیند و کانتکست را برگشت‌پذیر فشرده می‌کند.',
    claims: ['کاهش ۶۰–۹۵٪ حجم توکن در RAG و خروجی ابزارها', 'پشتیبانی از Claude Code، Cursor و Aider'],
    notes: ['دیتا محلی می‌ماند ولی در اولین اجرا نیازمند دانلود مدل Hugging Face است.'],
    afterInstall: 'پس از فعال‌سازی، تنظیمات پروکسی نمایش داده می‌شود.',
    install: {
      mac: { type: 'shell', cmd: 'pip install "headroom-ai[all]"' },
      linux: { type: 'shell', cmd: 'pip install "headroom-ai[all]"' },
      win: { type: 'shell', cmd: 'pip install "headroom-ai[all]"' }
    }
  },
  {
    id: 'rtk',
    name: 'RTK — فشرده‌سازی خروجی Shell',
    category: 'compression',
    tagline: '۶۰–۹۰٪ توکن کمتر در خروجی دستورهای توسعه',
    repo: 'https://github.com/getrtk/rtk',
    locked: true,
    price: 50000,
    description: 'پروکسی سطح shell که خروجی دستورهای توسعه (تست، بیلد، لاگ) را بازنویسی و فیلتر می‌کند؛ تک‌باینری Rust بدون وابستگی.',
    howItWorks: 'با کلاینت‌های CLI یکپارچه می‌شود و خروجی پرنویز را پیش از ورود به کانتکست فشرده می‌کند.',
    claims: ['کاهش ۶۰–۹۰٪ حجم توکن در خروجی‌های برنامه‌نویسی', 'تک‌باینری سبک با عملکرد موازی بالا'],
    notes: ['سیستم تلمتری به صورت پیش‌فرض خاموش است.', 'روی ویندوز به WSL یا Git Bash نیاز دارد.'],
    afterInstall: 'پس از فعال‌سازی، راهنمای یکپارچه‌سازی نمایش داده می‌شود.',
    install: {
      mac: { type: 'shell', cmd: 'brew install rtk' },
      linux: { type: 'shell', cmd: 'cargo install rtk' },
      win: { type: 'shell', cmd: 'cargo install rtk' }
    }
  },
  {
    id: 'snip',
    name: 'snip — فشرده‌سازی خروجی دستورها (Go)',
    category: 'compression',
    tagline: '۶۰–۹۰٪ توکن کمتر در خروجی shell با فیلتر سبک',
    repo: 'https://github.com/getsavvyinc/snip',
    locked: false,
    description: 'فیلتر YAML‌محور برای خروجی shell که خروجی پرحجم دستورها را قبل از رسیدن به عامل هوش مصنوعی خلاصه می‌کند.',
    howItWorks: 'بعد از نصب، با اجرای دستور snip init خروجی دستورهای توسعه به طور خودکار فیلتر می‌شود.',
    claims: ['کاهش تا ۹۷٪ حجم خروجی دستوراتی چون go test', 'پیکربندی ساده فیلترها بر اساس قواعد YAML'],
    notes: ['تک‌باینری سبک با لغو امن تغییرات.', 'مناسب به عنوان مکمل ابزارهای گراف کدبیس.'],
    afterInstall: 'دستور `snip init` را در ریشه پروژه خود اجرا کنید.',
    install: {
      mac: { type: 'shell', cmd: 'curl -fsSL https://snip.sh/install.sh | bash' },
      linux: { type: 'shell', cmd: 'curl -fsSL https://snip.sh/install.sh | bash' },
      win: { type: 'shell', cmd: 'curl -fsSL https://snip.sh/install.sh | bash' }
    }
  },
  {
    id: 'imptokens',
    name: 'imptokens — فشرده‌ساز محلی متن',
    category: 'compression',
    tagline: '۳۰–۷۰٪ فشرده‌سازی متن قبل از ارسال به مدل',
    repo: 'https://github.com/imptokens/imptokens',
    locked: false,
    description: 'پیش‌پردازنده عمومی متن قبل از LLM با دو موتور: sentence mode بدون مدل و logprob mode با مدل محلی کوچک بر روی llama.cpp.',
    howItWorks: 'کانتکست را پردازش کرده و جملات و کلمات کم‌اهمیت را بر اساس احتمال آماری حذف می‌کند.',
    claims: ['میانگین ۳۷.۲٪ کاهش مصرف توکن با حفظ ۹۵٪ فکت‌های کلیدی', 'اجرای ۱۰۰٪ محلی و آفلاین'],
    notes: ['موتور logprob نیازمند دانلود ~۷۰۰ مگابایت مدل هوش مصنوعی محلی است.'],
    afterInstall: 'پس از نصب، می‌توانید از دستور `imptokens compress` استفاده کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install imptokens' },
      linux: { type: 'shell', cmd: 'pip install imptokens' },
      win: { type: 'shell', cmd: 'pip install imptokens' }
    }
  },
  {
    id: 'claw-compactor',
    name: 'Claw Compactor — موتور فشرده‌سازی هوشمند',
    category: 'compression',
    tagline: '۱۵–۸۲٪ فشرده‌سازی متن و کدهای JSON',
    repo: 'https://github.com/openclaw/claw-compactor',
    locked: false,
    description: 'موتور چندمرحله‌ای برای فشرده‌سازی کانتکست عامل‌های برنامه‌نویسی با تمرکز ویژه روی کدهای منبع، ساختارهای JSON و مسیریابی محتوایی.',
    howItWorks: 'ساختار فایل و داده‌های JSON را به فرمت فشرده‌تر تبدیل می‌کند تا فضای پنجره کانتکست ذخیره شود.',
    claims: ['کاهش تا ۸۲٪ حجم کدهای ساختاریافته بدون تغییر معنایی'],
    notes: ['طراحی‌شده برای پروژه‌های پایتونی در اکوسیستم OpenClaw.'],
    afterInstall: 'عامل هوش مصنوعی خود را با فلگ فعال‌سازی Claw اجرا کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install claw-compactor' },
      linux: { type: 'shell', cmd: 'pip install claw-compactor' },
      win: { type: 'shell', cmd: 'pip install claw-compactor' }
    }
  },
  {
    id: 'toonify-mcp',
    name: 'Toonify MCP — هرس‌کننده ابزارهای Claude Code',
    category: 'compression',
    tagline: '۳۰–۶۵٪ کاهش توکن خروجی ابزارها در Claude Code',
    repo: 'https://github.com/toonify/toonify-mcp',
    locked: false,
    description: 'پلاگین و سرور MCP برای Claude Code که خروجی‌های بزرگ JSON، CSV، YAML، گزارش خطا و کد منبع را هرس می‌کند.',
    howItWorks: 'خروجی ابزارها را تحلیل کرده و بخش‌های تکراری یا طولانی غیرحیاتی را فیلتر می‌کند.',
    claims: ['کاهش ۳۰ تا ۶۵ درصد هزینه‌های API در Claude Code'],
    notes: ['عمدتاً روی فیلتر خروجی ابزارها تمرکز دارد نه کانتکست عمومی.'],
    afterInstall: 'دستور `toonify-mcp setup` را در ترمینال اجرا کنید.',
    install: {
      mac: { type: 'shell', cmd: 'npm install -g toonify-mcp && toonify-mcp setup' },
      linux: { type: 'shell', cmd: 'npm install -g toonify-mcp && toonify-mcp setup' },
      win: { type: 'shell', cmd: 'npm install -g toonify-mcp && toonify-mcp setup' }
    }
  },
  {
    id: 'token-optimizer',
    name: 'Token Optimizer — بهینه‌ساز کانتکست چت',
    category: 'compression',
    tagline: '۵–۲۵٪ بهینه‌سازی اتلاف توکن روی ۸ سطح متن',
    repo: 'https://github.com/token-optimizer/token-optimizer',
    locked: false,
    description: 'ابزار چندوجهی بهینه‌سازی کانتکست که اتلاف توکن را در بخش‌های خروجی ترمینال، خواندن‌های مجدد، فایل‌های تنظیمات و مسیریابی مدل مدیریت می‌کند.',
    howItWorks: 'به عنوان پروکسی با عامل هوشمند شما جفت شده و بهینه‌سازی‌های خودکار اعمال می‌کند.',
    claims: ['بهبود تا ۲۵ درصدی بهره‌وری کانتکست با autocompact', 'پشتیبانی از Cursor، VS Code و Codex'],
    notes: ['امنیت تلمتری کاملاً رعایت شده و داده‌ای ارسال نمی‌شود.'],
    afterInstall: 'پس از نصب، یک‌بار دستور `token-optimizer init` را اجرا کنید.',
    install: {
      mac: { type: 'shell', cmd: 'npm install -g token-optimizer' },
      linux: { type: 'shell', cmd: 'npm install -g token-optimizer' },
      win: { type: 'shell', cmd: 'npm install -g token-optimizer' }
    }
  },
  {
    id: 'llmlingua',
    name: 'LLMLingua — فشرده‌سازی پرامپت (Research)',
    category: 'compression',
    tagline: 'تا ۲۰ برابر فشرده‌سازی prompt بدون افت عملکرد',
    repo: 'https://github.com/microsoft/LLMLingua',
    locked: true,
    price: 50000,
    description: 'کتابخانه پژوهشی مایکروسافت برای فشرده‌سازی پرامپت‌ها با یک مدل زبانی کوچک جهت فیلتر توکن‌های با اهمیت کمتر.',
    howItWorks: 'پرامپت ورودی را پردازش و بازنویسی می‌کند تا هزینه‌های توکن مدل‌های ابری کاهش یابد.',
    claims: ['تا ۲۰ برابر فشرده‌سازی پرامپت با افت بسیار نامحسوس کیفیت'],
    notes: ['بیشتر یک ابزار کتابخانه‌ای و پژوهشی است تا ابزار آماده مصرف ترمینال.'],
    afterInstall: 'پس از نصب، می‌توانید کتابخانه را در اسکریپت‌های پایتون خود وارد کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install llmlingua' },
      linux: { type: 'shell', cmd: 'pip install llmlingua' },
      win: { type: 'shell', cmd: 'pip install llmlingua' }
    }
  },
  {
    id: 'llmlingua-2',
    name: 'LLMLingua-2 — فشرده‌سازی سریع پرامپت',
    category: 'compression',
    tagline: '۲ تا ۵ برابر فشرده‌سازی سریع و امینِ متن',
    repo: 'https://github.com/microsoft/LLMLingua',
    locked: true,
    price: 50000,
    description: 'نسخه دوم و بهینه‌سازی‌شده ابزار LLMLingua با انکودر بسیار سبک‌تر و تقطیر داده بر پایه GPT-4 برای عملکرد سریع‌تر.',
    howItWorks: 'فشرده‌سازی متن را در سطح کلمه و ساختار با سرعت ۳ الی ۶ برابر نسخه قبلی انجام می‌دهد.',
    claims: ['فشرده‌سازی ۲ تا ۵ برابری پرامپت با سرعت اجرای بسیار بالا'],
    notes: ['کیفیت فشرده‌سازی به نوع سناریو بستگی دارد.'],
    afterInstall: 'کتابخانه را نصب کرده و آن را در کدهای عامل خود ایمپورت کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install llmlingua' },
      linux: { type: 'shell', cmd: 'pip install llmlingua' },
      win: { type: 'shell', cmd: 'pip install llmlingua' }
    }
  },

  // --- ۲. ایندکس کدبیس و بسته‌بندی (index) ---
  {
    id: 'codebase-memory-mcp',
    name: 'Codebase Memory (MCP)',
    category: 'index',
    tagline: 'تا ~۱۰× توکن کمتر برای کاوش کدبیس با گراف دانش',
    repo: 'https://github.com/DeusData/codebase-memory-mcp',
    recommended: true,
    locked: false,
    uiUrl: 'http://localhost:9749',
    description: 'سرور MCP که با استفاده از Tree-sitter یک «گراف دانش» پایدار از کدبیس می‌سازد و جستجوها را بدون نیاز به پیمایش کل فایل‌ها پاسخ می‌دهد.',
    howItWorks: 'تنظیمات MCP را به عامل‌های شما اضافه کرده و کدهای پروژه را در یک گراف محلی به صورت هوشمند ذخیره می‌کند.',
    claims: ['تا ۱۰ برابر مصرف توکن کمتر در کاوش کدهای منبع', 'کاهش ۲.۱ برابری فراخوانی ابزارها توسط عامل'],
    notes: ['داده محلی می‌ماند. سازگار با Claude Code، Cursor و Codex CLI.'],
    afterInstall: 'agent را restart کن و در آن بنویس: «Index this project».',
    install: {
      mac: { type: 'shell', cmd: 'curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash -s -- --ui' },
      linux: { type: 'shell', cmd: 'curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash -s -- --ui' },
      win: { type: 'shell', cmd: 'curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash -s -- --ui' }
    }
  },
  {
    id: 'codegraph',
    name: 'CodeGraph — همگام‌سازی گراف محلی کد',
    category: 'index',
    tagline: 'کاهش ۲۳–۶۴٪ توکن در جستجوی فایل‌ها',
    repo: 'https://github.com/colbymchenry/codegraph',
    locked: false,
    description: 'گراف دانش کد محلی با همگام‌سازی خودکار و پروتکل MCP که عامل را از انجام دستورات پرهزینه grep و read بی‌نیاز می‌کند.',
    howItWorks: 'کدهای پروژه را اسکن کرده و به صورت معنایی به عامل هوشمند معرفی می‌کند.',
    claims: ['۵۸٪ ابزار کمتر، ۲۲٪ سرعت بیشتر، و ۲۳٪ تا ۶۴٪ مصرف توکن کمتر'],
    notes: ['اجرای ۱۰۰٪ محلی و بدون نیاز به کلید API.'],
    afterInstall: 'پس از نصب، دستور `codegraph init` را در ریشه پروژه اجرا کنید.',
    install: {
      mac: { type: 'shell', cmd: 'npm install -g @colbymchenry/codegraph && codegraph init' },
      linux: { type: 'shell', cmd: 'npm install -g @colbymchenry/codegraph && codegraph init' },
      win: { type: 'shell', cmd: 'npm install -g @colbymchenry/codegraph && codegraph init' }
    }
  },
  {
    id: 'serena',
    name: 'Serena — کاوشگر معنایی نمادهای کدبیس',
    category: 'index',
    tagline: 'جستجوی معنایی و ویرایش کد در سطح Symbol',
    repo: 'https://github.com/serena-agent/serena',
    locked: false,
    description: 'ابزار کاوش، ویرایش و ریفکتورینگ معنایی کد با استفاده از زبان سرور (LSP) یا بک‌اندهای IDE مانند JetBrains.',
    howItWorks: 'به ساختار درختی پروژه و متدها گوش داده و پاسخ‌های فشرده معنایی تولید می‌کند.',
    claims: ['افزایش شدید دقت عملیاتی در بازنویسی کدبیس‌های بزرگ'],
    notes: ['نیازمند ابزار پکیج‌منیجر uv و مفسر پایتون نسخه ۳.۱۳ به بالا.'],
    afterInstall: 'دستور `serena init` را در پوشه پروژه اجرا کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install serena-agent' },
      linux: { type: 'shell', cmd: 'pip install serena-agent' },
      win: { type: 'shell', cmd: 'pip install serena-agent' }
    }
  },
  {
    id: 'jcodemunch',
    name: 'jCodeMunch MCP — بازیابی نمادمحور کد',
    category: 'index',
    tagline: 'تا ۹۵٪ کاهش متوسط توکن در بازیابی کد گیت‌هاب',
    repo: 'https://github.com/jCodeMunch/jCodeMunch',
    locked: false,
    description: 'سرور MCP بازیابی و جستجوی کدهای پروژه از طریق درخت AST و ابزار تجزیه نحوی Tree-sitter.',
    howItWorks: 'به جای ارسال کل فایل، متدها و متغیرهای هدف را بازیابی و فشرده می‌کند.',
    claims: ['کاهش میانگین ۹۵٪ مصرف توکن روی مخازن تیمی'],
    notes: ['بیشتر برای پروژه‌های متصل به GitHub بهینه‌سازی شده است.'],
    afterInstall: 'عامل هوشمند را مجددا اجرا کرده و سرور MCP را پیکربندی کنید.',
    install: {
      mac: { type: 'shell', cmd: 'npm install -g jcode-munch-mcp' },
      linux: { type: 'shell', cmd: 'npm install -g jcode-munch-mcp' },
      win: { type: 'shell', cmd: 'npm install -g jcode-munch-mcp' }
    }
  },
  {
    id: 'code-review-graph',
    name: 'Code Review Graph — تحلیل هوشمند تغییرات',
    category: 'index',
    tagline: 'نقشه کانتکست حداقلی برای بررسی کدهای مخازن بزرگ',
    repo: 'https://github.com/code-review-graph/code-review-graph',
    locked: false,
    description: 'ابزار تولید نقشه تعاملات کد جهت ارزیابی مرج‌ریکوئست‌ها بدون نیاز به خواندن کل مخزن.',
    howItWorks: 'شعاع تغییرات کد (blast radius) را مشخص کرده و کانتکست محدودی برای بررسی آماده می‌کند.',
    claims: ['کاهش محسوس حجم کانتکست در فرآیند Code Review'],
    notes: ['برای پروژه‌های با بیش از ۵۰۰ فایل، پردازش اولیه حدود ۱۰ ثانیه زمان می‌برد.'],
    afterInstall: 'دستور `code-review-graph install` را اجرا کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install code-review-graph' },
      linux: { type: 'shell', cmd: 'pip install code-review-graph' },
      win: { type: 'shell', cmd: 'pip install code-review-graph' }
    }
  },
  {
    id: 'codegraph-context',
    name: 'CodeGraphContext — تصویرسازی ارتباطات کد',
    category: 'index',
    tagline: 'تصویرسازی و کوئری‌زدن روی گراف کد محلی',
    repo: 'https://github.com/codegraph-context/codegraph-context',
    locked: false,
    description: 'سرور MCP و ابزار CLI که کدهای محلی را در پایگاه‌داده گراف محلی ذخیره و تصویرسازی می‌کند.',
    howItWorks: 'رابط بصری و کوئری‌های تعاملی برای کشف ارتباطات توابع در اختیار عامل قرار می‌دهد.',
    claims: ['درک سریع‌تر روابط توابع و متغیرها توسط عوامل هوش مصنوعی'],
    notes: ['نسبت به codebase-memory پردازش سنگین‌تری دارد.'],
    afterInstall: 'عامل هوشمند را بازنشانی کرده و سرور MCP را فراخوانی کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install codegraph-context' },
      linux: { type: 'shell', cmd: 'pip install codegraph-context' },
      win: { type: 'shell', cmd: 'pip install codegraph-context' }
    }
  },
  {
    id: 'context7',
    name: 'Context7 — بازیابی مستندات کتابخانه‌ها',
    category: 'index',
    tagline: 'بازیابی مستندات بروز کتابخانه‌ها برای ادیتورها',
    repo: 'https://github.com/context7/context7',
    locked: false,
    description: 'سرور MCP که مستندات به‌روز و دقیق فریمورک‌ها را دانلود کرده و به جای ارسال فایل‌های داکس بزرگ در کانتکست عامل بارگذاری می‌کند.',
    howItWorks: 'عامل در زمان نیاز مستندات دقیق تابع یا کتابخانه را از طریق این ابزار بازیابی می‌کند.',
    claims: ['کاهش شدید خطاها و خروجی‌های نادرست مدل به دلیل مستندات قدیمی'],
    notes: ['ارزش اصلی در ارائه مستندات تر و تازه است تا فشرده‌سازی متنی.'],
    afterInstall: 'سرور MCP آن را در ادیتور خود ثبت و راه‌اندازی کنید.',
    install: {
      mac: { type: 'shell', cmd: 'npm install -g context7-mcp' },
      linux: { type: 'shell', cmd: 'npm install -g context7-mcp' },
      win: { type: 'shell', cmd: 'npm install -g context7-mcp' }
    }
  },
  {
    id: 'repomix',
    name: 'Repomix — بسته‌بندی کدبیس (TypeScript)',
    category: 'index',
    tagline: 'بسته‌بندی پروژه در یک فایل متنی با کنترل بودجه توکن',
    repo: 'https://github.com/yamadashy/repomix',
    locked: true,
    price: 50000,
    description: 'کل پروژه را با ساختار درختی و تفکیک فایل‌ها در یک فایل متنی بهینه‌شده برای هوش مصنوعی بسته‌بندی می‌کند.',
    howItWorks: 'فایل کدهای پروژه را می‌خواند و به صورت فشرده با ذکر تعداد توکن‌ها ذخیره می‌کند.',
    claims: ['کنترل بودجه و پیشگیری از سرریز شدن سقف توکن‌ها'],
    notes: ['از فایل‌های نادیده‌گرفته‌شده (.gitignore) پشتیبانی می‌کند.'],
    afterInstall: 'پس از فعال‌سازی، با دستور `npx repomix` پروژه را بسته‌بندی کنید.',
    install: {
      mac: { type: 'shell', cmd: 'npx repomix' },
      linux: { type: 'shell', cmd: 'npx repomix' },
      win: { type: 'shell', cmd: 'npx repomix' }
    }
  },
  {
    id: 'gitingest',
    name: 'Gitingest — خلاصه‌ساز متنی ریپازیتوری',
    category: 'index',
    tagline: 'ساخت خلاصه متنی بهینه‌شده از لینک گیت‌هاب',
    repo: 'https://github.com/cyclotivity/gitingest',
    locked: false,
    description: 'کدهای هر ریپازیتوری آنلاین گیت‌هاب را از روی لینک آن خوانده و یک فایل متنی منسجم به همراه تعداد دقیق توکن‌های آن می‌سازد.',
    howItWorks: 'درخت و کدهای پروژه را دریافت کرده و به فرمت بهینه‌شده مناسب کات‌وپست تبدیل می‌کند.',
    claims: ['بارگذاری سریع هر مخزن عمومی در کانتکست مدل بدون فرآیند شبیه‌سازی دستی'],
    notes: ['برای پروژه‌های خصوصی نیاز به تعریف Token گیت‌هاب دارد.'],
    afterInstall: 'با اجرای دستور `gitingest <url>` خلاصه کدهای آن ریپازیتوری را بسازید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install gitingest' },
      linux: { type: 'shell', cmd: 'pip install gitingest' },
      win: { type: 'shell', cmd: 'pip install gitingest' }
    }
  },

  // --- ۳. لایه‌های حافظه بلندمدت (memory) ---
  {
    id: 'mem0',
    name: 'Mem0 — حافظه بلندمدت هوشمند (Rust/Python)',
    category: 'memory',
    tagline: 'تا ۹۰٪+ صرفه‌جویی در هزینه توکن با ذخیره حافظه چت‌ها',
    repo: 'https://github.com/mem0ai/mem0',
    locked: true,
    price: 50000,
    description: 'لایه حافظه بلندمدت برای دستیارهای هوشمند. به جای کپی کردن کل تاریخچه جلسات چت، فکت‌های کلیدی را بازیابی و در ورودی مدل تزریق می‌کند.',
    howItWorks: 'یک پایگاه داده معنایی محلی از علایق و کارهای گذشته کاربر می‌سازد و به طور پویا موارد لازم را می‌خواند.',
    claims: ['کاهش بیش از ۹۰ درصدی هزینه‌های توکن تاریخچه', 'کاهش ۹۱ درصدی تاخیر پاسخ‌دهی (Latency)'],
    notes: ['نیازمند مفسر پایتون است. نسخه خودمیزبان نیاز به کانفیگ دیتابیس برداری دارد.'],
    afterInstall: 'پس از فعال‌سازی، نمونه کدهای اتصال حافظه نمایش داده می‌شود.',
    install: {
      mac: { type: 'shell', cmd: 'pip install mem0ai' },
      linux: { type: 'shell', cmd: 'pip install mem0ai' },
      win: { type: 'shell', cmd: 'pip install mem0ai' }
    }
  },
  {
    id: 'graphiti',
    name: 'Graphiti — گراف دانش زمانی حافظه',
    category: 'memory',
    tagline: 'حافظه گراف معنایی و زمانی برای عوامل هوشمند',
    repo: 'https://github.com/getgraphiti/graphiti',
    locked: false,
    description: 'گراف دانش زمانی برای ثبت فکت‌ها همراه با زمان وقوع و منبع (provenance) جهت مدیریت حافظه در بات‌های چت.',
    howItWorks: 'تغییر داده‌ها در طول زمان را ردیابی کرده و دقیق‌ترین اطلاعات را بازیابی می‌کند.',
    claims: ['تا ۱۸.۵٪ بهبود در دقت پاسخ‌دهی و ۹۰٪ کاهش تاخیر مدل نسبت به روش‌های سنتی RAG'],
    notes: ['به عنوان فریم‌ورک برنامه‌نویسی برای ساخت عوامل هوشمند کاربرد دارد.'],
    afterInstall: 'محیط توسعه خود را ری‌استارت کرده و داکیومنت اتصال را بخوانید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install graphiti-core' },
      linux: { type: 'shell', cmd: 'pip install graphiti-core' },
      win: { type: 'shell', cmd: 'pip install graphiti-core' }
    }
  },
  {
    id: 'cognee',
    name: 'Cognee — موتور سازماندهی حافظه کانتکست',
    category: 'memory',
    tagline: 'پلتفرم حافظه و استدلال بر پایه گراف دانش',
    repo: 'https://github.com/cognee-io/cognee',
    locked: false,
    description: 'موتور سازماندهی داده‌ها با دیتابیس گراف و بردارها به صورت لوکال یا کانتینر داکر جهت بازیابی اطلاعات گذشته.',
    howItWorks: 'دیتا را ایندکس کرده و به صورت خودکار مدل‌های معنایی برای استدلال عامل ایجاد می‌کند.',
    claims: ['مدیریت حافظه در سطح سازمانی و مخازن بزرگ داده'],
    notes: ['نسبت به Mem0 برای پیاده‌سازی‌های ساده سنگین‌تر است.'],
    afterInstall: 'داکر را اجرا کرده و فایل پیکربندی `.env` را پر کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install cognee' },
      linux: { type: 'pip install cognee' },
      win: { type: 'shell', cmd: 'pip install cognee' }
    }
  },
  {
    id: 'projectmem',
    name: 'projectmem — حافظه محلی و ایمن کدهای پروژه',
    category: 'memory',
    tagline: 'حافظه محلی بدون نیاز به کلود با مصرف ۸۰۰ توکن',
    repo: 'https://github.com/projectmem/projectmem',
    locked: false,
    description: 'سیستم حافظه محلی و رویدادمحور برای عوامل کدنویسی که با ذخیره هوشمند وقایع، مصرف توکن‌ها را کنترل می‌کند.',
    howItWorks: 'اطلاعات جلسات برنامه‌نویسی را در فایل‌های لوکال ثبت و در مواقع لزوم در کانتکست بارگذاری می‌کند.',
    claims: ['کاهش حجم حافظه سشن از ۲۰,۰۰۰ توکن به ۱,۵۰۰ توکن با معماری آفلاین'],
    notes: ['صد در صد آفلاین و محلی جهت حفظ حریم خصوصی کدهای حساس.'],
    afterInstall: 'عامل هوشمند را باز کرده و دستور `projectmem init` را اجرا کنید.',
    install: {
      mac: { type: 'shell', cmd: 'pip install projectmem' },
      linux: { type: 'shell', cmd: 'pip install projectmem' },
      win: { type: 'shell', cmd: 'pip install projectmem' }
    }
  },
  {
    id: 'agentmemory',
    name: 'agentmemory — حافظه پایدار چت‌ها و متغیرها',
    category: 'memory',
    tagline: 'تا ۷۴٪ توکن کمتر با حافظه پایدار چت‌ها',
    repo: 'https://github.com/agentmemory/agentmemory',
    locked: false,
    description: 'زیرساخت و سرور محلی جهت مدیریت، جستجو و تزریق چت‌ها و کارهای جلسات قبل به عوامل برنامه‌نویسی بدون ارسال مجدد کانتکست.',
    howItWorks: 'حافظه را به بخش‌های مجزا تقسیم کرده و بر اساس نمایه معنایی آن‌ها را به عامل ارائه می‌کند.',
    claims: ['کاهش تا ۷۴٪ مصرف توکن نسبت به خلاصه‌سازی ساده کانتکست توسط LLM'],
    notes: ['شامل ابزارهای امنیتی جهت ایزوله نگه‌داشتن کانتکست پروژه.'],
    afterInstall: 'سرور را با دستور `agentmemory start` اجرا کرده و پورت آن را تنظیم کنید.',
    install: {
      mac: { type: 'shell', cmd: 'npm install -g @agentmemory/agentmemory' },
      linux: { type: 'shell', cmd: 'npm install -g @agentmemory/agentmemory' },
      win: { type: 'shell', cmd: 'npm install -g @agentmemory/agentmemory' }
    }
  },
  {
    id: 'engram',
    name: 'Engram — زیرساخت محلی حافظه اشتراکی',
    category: 'memory',
    tagline: 'زیرساخت حافظه پایدار و مشترک عوامل برنامه‌نویسی',
    repo: 'https://github.com/engram-ai/engram',
    locked: false,
    description: 'زیرساخت بومی برای اشتراک‌گذاری حافظه و یافته‌های برنامه‌نویسی بین چند دستیار توسعه روی سیستم محلی به صورت دیمون (Daemon).',
    howItWorks: 'به عنوان یک وب‌سرویس پس‌زمینه اجرا شده و حافظه متدهای نوشته شده را به عوامل متصل می‌رساند.',
    claims: ['امکان همکاری هماهنگ چند عامل برنامه‌نویسی با حافظه یکسان'],
    notes: ['پایداری بالای سرویس دیمون روی سیستم‌عامل‌های یونیکسی.'],
    afterInstall: 'سرویس پس‌زمینه Engram را راه‌اندازی و بررسی کنید.',
    install: {
      mac: { type: 'shell', cmd: 'curl -fsSL https://engram.sh/install.sh | bash' },
      linux: { type: 'shell', cmd: 'curl -fsSL https://engram.sh/install.sh | bash' },
      win: { type: 'shell', cmd: 'curl -fsSL https://engram.sh/install.sh | bash' }
    }
  }
];

// Initialize JSON database with all tables
function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ licenses: [], payments: [], users: [], otps: [], projects: [], tools: [], notifications: [], usages: [] }, null, 2));
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (!db.licenses) db.licenses = [];
    if (!db.payments) db.payments = [];
    if (!db.users) db.users = [];
    if (!db.otps) db.otps = [];
    if (!db.projects) db.projects = [];
    if (!db.notifications) db.notifications = [];
    if (!db.usages) db.usages = [];
    if (!db.settings) {
      db.settings = {};
    }
    // Set defaults for missing settings
    const def = db.settings;
    if (def.merchantId === undefined) def.merchantId = process.env.MERCHANT_ID || '00000000-0000-0000-0000-000000000000';
    if (def.smsApiKey === undefined) def.smsApiKey = process.env.SMS_IR_API_KEY || 'your-sms-ir-api-key';
    if (def.smsTemplateId === undefined) def.smsTemplateId = Number(process.env.SMS_IR_TEMPLATE_ID) || 100000;
    if (def.adminPassword === undefined) def.adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (def.adminPhone === undefined) def.adminPhone = process.env.ADMIN_PHONE || '09123456789';
    if (def.adminEmail === undefined) def.adminEmail = process.env.ADMIN_EMAIL || 'admin@tokensaver.ir';
    if (def.proAmount === undefined) def.proAmount = 199000;
    if (def.proDescription === undefined) def.proDescription = 'اشتراک ماهانه پرو TokenSaver';
    if (def.proPlanDays === undefined) def.proPlanDays = 30;
    if (def.serverUrl === undefined) def.serverUrl = 'http://localhost:8080';
    if (def.zarinpalSandbox === undefined) def.zarinpalSandbox = true;
    if (def.defaultUsageLimit === undefined) def.defaultUsageLimit = 10;
    if (def.googleClientId === undefined) def.googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    if (def.googleClientSecret === undefined) def.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    
    // Populate tools table from SERVER_TOOLS_REGISTRY if missing or out of date
    if (!db.tools || db.tools.length < SERVER_TOOLS_REGISTRY.length) {
      db.tools = SERVER_TOOLS_REGISTRY;
    }

    // Ensure all tools have a usageLimit
    db.tools.forEach(t => {
      if (t.usageLimit === undefined) {
        t.usageLimit = def.defaultUsageLimit;
      }
    });
    
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    return db;
  } catch (e) {
    const fallbackTools = SERVER_TOOLS_REGISTRY.map(t => {
      if (t.usageLimit === undefined) t.usageLimit = 10;
      return t;
    });
    const fallbackSettings = {
      merchantId: process.env.MERCHANT_ID || '00000000-0000-0000-0000-000000000000',
      smsApiKey: process.env.SMS_IR_API_KEY || 'your-sms-ir-api-key',
      smsTemplateId: Number(process.env.SMS_IR_TEMPLATE_ID) || 100000,
      adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
      adminPhone: process.env.ADMIN_PHONE || '09123456789',
      adminEmail: process.env.ADMIN_EMAIL || 'admin@tokensaver.ir',
      proAmount: 199000,
      proDescription: 'اشتراک ماهانه پرو TokenSaver',
      proPlanDays: 30,
      serverUrl: 'http://localhost:8080',
      zarinpalSandbox: true,
      defaultUsageLimit: 10,
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    };
    return { licenses: [], payments: [], users: [], otps: [], projects: [], tools: fallbackTools, usages: [], settings: fallbackSettings };
  }
}

// Atomic write: write to a temp file then rename, so a crash/concurrent write
// can never leave db.json half-written or corrupted.
function saveDb(data) {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

// HTML-escape untrusted values before injecting them into admin HTML templates.
// Prevents stored XSS via user-controlled fields (names, emails, tool data, etc.).
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Strip HTML tags and clamp length on free-text user input (defense in depth).
function sanitizeText(v, max) {
  return String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim().slice(0, max || 100);
}

// --- Subscription helpers (monthly Pro) ---
function isProActive(user) {
  if (!user || !user.isPro) return false;
  if (!user.proExpiresAt) return true; // legacy lifetime licenses
  return new Date(user.proExpiresAt).getTime() > Date.now();
}

// Activate/extend a monthly subscription; stacks on top of remaining time.
function activateSubscription(user, days) {
  user.isPro = true;
  const now = Date.now();
  const current = user.proExpiresAt ? new Date(user.proExpiresAt).getTime() : 0;
  const base = current > now ? current : now;
  user.proExpiresAt = new Date(base + (days || 30) * 24 * 60 * 60 * 1000).toISOString();
  return user.proExpiresAt;
}

// Helper: send SMS verification via sms.ir
function sendSms(mobile, code) {
  const db = loadDb();
  const apiKey = db.settings ? db.settings.smsApiKey : (process.env.SMS_IR_API_KEY || 'your-sms-ir-api-key');
  const templateId = Number(db.settings ? db.settings.smsTemplateId : (process.env.SMS_IR_TEMPLATE_ID || 100000));
  
  if (!apiKey || apiKey === 'your-sms-ir-api-key') {
    console.log(`\n========================================`);
    console.log(`[SMS.IR SANDBOX] Mobile: ${mobile}`);
    console.log(`[SMS.IR SANDBOX] OTP Code: ${code}`);
    console.log(`========================================\n`);
    return Promise.resolve({ ok: true, sandbox: true });
  }
  
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      mobile: mobile,
      templateId: templateId,
      parameters: [
        {
          name: "Code",
          value: String(code)
        }
      ]
    });
    
    const req = https.request({
      hostname: 'api.sms.ir',
      path: '/v1/send/verify',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const resJson = JSON.parse(body);
          if (resJson.status === 1 || resJson.status === 100 || resJson.ok) {
            resolve({ ok: true, data: resJson });
          } else {
            reject(new Error(`SMS.ir returned status: ${resJson.status || resJson.error || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true });
          } else {
            reject(new Error(`SMS.ir returned status ${res.statusCode}: ${body}`));
          }
        }
      });
    });
    
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Helpers for Zarinpal requests
function postRequest(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    const data = JSON.stringify(payload);
    
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Invalid JSON response from Zarinpal'));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// User authentication middleware
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'احراز هویت ناموفق بود.' });
  }
  const token = authHeader.split(' ')[1];
  const db = loadDb();
  const user = db.users.find(u => u.token === token);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'توکن نامعتبر است.' });
  }
  req.user = user;
  next();
}

// Random, unforgeable admin session tokens (in-memory; reset on server restart).
const adminSessions = new Set();

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function isAdmin(req, res, next) {
  const sid = getCookie(req, 'admin_session');
  if (sid && adminSessions.has(sid)) {
    next();
  } else {
    res.redirect('/login?redirect=/admin');
  }
}

// --- ENDPOINTS ---

// 1. Get Application Configuration (including tools registry)
app.get('/api/app-config', (req, res) => {
  const db = loadDb();
  res.json({
    ok: true,
    version: '1.2.0',
    tools: db.tools,
    pricing: {
      amount: db.settings.proAmount,
      currency: 'IRT',
      description: db.settings.proDescription
    }
  });
});

// 1.1. Get dynamic platform statistics (users and projects optimized)
app.get('/api/stats', (req, res) => {
  const db = loadDb();
  const baseUsers = 12450;
  const baseProjects = 8120;
  const usersCount = (db.users || []).length + baseUsers;
  const projectsCount = (db.projects || []).length + baseProjects;
  res.json({
    ok: true,
    usersCount,
    projectsCount
  });
});

// 2. Auth: Send OTP via SMS
app.post('/api/auth/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber || !/^09\d{9}$/.test(phoneNumber)) {
    return res.json({ ok: false, error: 'شماره موبایل معتبر نیست. مثال: 09123456789' });
  }
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const db = loadDb();
  
  // Remove older OTPs for this number
  db.otps = db.otps.filter(o => o.phoneNumber !== phoneNumber);
  db.otps.push({
    phoneNumber,
    code,
    expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
  });
  saveDb(db);
  
  try {
    const smsRes = await sendSms(phoneNumber, code);
    res.json({ ok: true, message: 'کد تایید ارسال شد.', sandbox: !!smsRes.sandbox });
  } catch (err) {
    res.json({ ok: false, error: 'خطا در ارسال پیامک: ' + err.message });
  }
});

// 3. Auth: Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { phoneNumber, code, name, email } = req.body;
  if (!phoneNumber || !code) {
    return res.json({ ok: false, error: 'شماره موبایل و کد تایید الزامی هستند.' });
  }
  
  const db = loadDb();
  const otpIndex = db.otps.findIndex(o => o.phoneNumber === phoneNumber && o.code === code && o.expiresAt > Date.now());
  
  if (otpIndex === -1) {
    return res.json({ ok: false, error: 'کد تایید نامعتبر یا منقضی شده است.' });
  }
  
  // Clear the OTP
  db.otps.splice(otpIndex, 1);
  
  const cleanName = sanitizeText(name, 60) || 'کاربر TokenSaver';
  const cleanEmail = sanitizeText(email, 120);
  let user = db.users.find(u => u.phoneNumber === phoneNumber);
  if (!user) {
    user = {
      id: uuidv4(),
      phoneNumber,
      name: cleanName,
      email: cleanEmail,
      token: uuidv4(),
      isPro: false,
      purchasedTools: [],
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.token = uuidv4();
    if (name) user.name = cleanName;
    if (email) user.email = cleanEmail;
    if (!user.purchasedTools) user.purchasedTools = [];
  }
  
  saveDb(db);
  
  res.json({
    ok: true,
    token: user.token,
    user: {
      phoneNumber: user.phoneNumber,
      name: user.name,
      email: user.email,
      isPro: user.isPro,
      purchasedTools: user.purchasedTools || []
    }
  });
});

// 3.1. Auth: Password login (unified for admin / special users)
app.post('/api/auth/login-password', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ ok: false, error: 'نام کاربری و کلمه عبور الزامی هستند.' });
  }
  
  const db = loadDb();
  const adminPass = (db.settings && db.settings.adminPassword) || ADMIN_PASSWORD;
  const adminPhone = (db.settings && db.settings.adminPhone) || '09123456789';
  const adminEmail = (db.settings && db.settings.adminEmail) || 'admin@tokensaver.ir';
  
  // Check if it is the admin logging in
  if (
    (username === 'admin' || username === adminPhone || username === adminEmail) &&
    password === adminPass
  ) {
    // Generate secure admin session cookie
    const sid = uuidv4();
    adminSessions.add(sid);
    res.setHeader('Set-Cookie', `admin_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.json({ ok: true, isAdmin: true, redirect: '/admin' });
  }
  
  res.json({ ok: false, error: 'نام کاربری یا کلمه عبور نادرست است.' });
});

// 3.2. Auth: Forgot Password (unified for admin / password users)
app.post('/api/auth/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.json({ ok: false, error: 'وارد کردن شماره موبایل یا ایمیل الزامی است.' });
  }
  
  const db = loadDb();
  const adminPhone = (db.settings && db.settings.adminPhone) || '09123456789';
  const adminEmail = (db.settings && db.settings.adminEmail) || 'admin@tokensaver.ir';
  
  if (identifier === adminPhone || identifier === adminEmail || identifier === 'admin') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save verification OTP code
    db.otps = db.otps.filter(o => o.phoneNumber !== adminPhone);
    db.otps.push({
      phoneNumber: adminPhone,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });
    saveDb(db);
    
    // Send via SMS or Email based on input
    if (identifier === adminPhone || /^09\d{9}$/.test(identifier)) {
      try {
        await sendSms(adminPhone, code);
        return res.json({ ok: true, type: 'sms', message: 'کد بازیابی از طریق پیامک ارسال شد.' });
      } catch (err) {
        return res.json({ ok: false, error: 'خطا در ارسال پیامک بازیابی: ' + err.message });
      }
    } else {
      // Simulate Email sending (prints to console, logs success)
      console.log(`[EMAIL SEND] Recovery code sent to ${adminEmail}: ${code}`);
      return res.json({ ok: true, type: 'email', message: 'کد بازیابی به ایمیل مدیریت ارسال شد. (کد تایید در لاگ سرور ثبت گردید)' });
    }
  }
  
  res.json({ ok: false, error: 'کاربری با این مشخصات یافت نشد.' });
});

// 3.3. Auth: Reset Password
app.post('/api/auth/reset-password', (req, res) => {
  const { identifier, code, newPassword } = req.body;
  if (!identifier || !code || !newPassword) {
    return res.json({ ok: false, error: 'ورودی‌ها نامعتبر هستند.' });
  }
  
  const db = loadDb();
  const adminPhone = (db.settings && db.settings.adminPhone) || '09123456789';
  
  if (identifier === adminPhone || identifier === 'admin' || identifier === (db.settings && db.settings.adminEmail)) {
    const otpIndex = db.otps.findIndex(o => o.phoneNumber === adminPhone && o.code === code && o.expiresAt > Date.now());
    
    if (otpIndex === -1) {
      return res.json({ ok: false, error: 'کد تایید نامعتبر یا منقضی شده است.' });
    }
    
    // Clear OTP
    db.otps.splice(otpIndex, 1);
    
    // Reset admin password
    if (!db.settings) db.settings = {};
    db.settings.adminPassword = newPassword.trim();
    saveDb(db);
    
    return res.json({ ok: true, message: 'کلمه عبور مدیریت با موفقیت تغییر یافت.' });
  }
  
  res.json({ ok: false, error: 'درخواست نامعتبر است.' });
});

// 3.5. Auth: Google OAuth URL
app.get('/api/auth/google/url', (req, res) => {
  const db = loadDb();
  const clientId = db.settings.googleClientId;
  if (!clientId) return res.json({ ok: false, error: 'شناسه کلاینت گوگل در سرور تنظیم نشده است.' });
  
  const redirectUri = `${db.settings.serverUrl}/api/auth/google/callback`;
  const scope = 'email profile';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
  
  res.json({ ok: true, url });
});

// 3.6. Auth: Google OAuth Callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('کد اعتبارسنجی ارسال نشده است.');
  
  const db = loadDb();
  const clientId = db.settings.googleClientId;
  const clientSecret = db.settings.googleClientSecret;
  const redirectUri = `${db.settings.serverUrl}/api/auth/google/callback`;
  
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error('دریافت توکن دسترسی از گوگل با خطا مواجه شد.');
    }
    
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();
    
    if (!userData.email) {
      throw new Error('حساب گوگل فاقد ایمیل معتبر است.');
    }
    
    let user = db.users.find(u => u.email === userData.email || u.googleId === userData.id);
    if (!user) {
      user = {
        id: uuidv4(),
        googleId: userData.id,
        email: sanitizeText(userData.email, 120),
        name: sanitizeText(userData.name, 60) || 'کاربر TokenSaver (گوگل)',
        phoneNumber: '',
        token: uuidv4(),
        isPro: false,
        purchasedTools: [],
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
    } else {
      user.token = uuidv4();
      user.googleId = userData.id;
      user.name = userData.name || user.name;
    }
    saveDb(db);
    
    res.send(`
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head><meta charset="utf-8"><title>ورود موفق</title></head>
      <body style="font-family: sans-serif; text-align: center; background: #050508; color: #fff; padding-top: 5rem;">
        <h2 style="color: #10b981;">ورود با موفقیت انجام شد ✓</h2>
        <p style="color: #94a3b8;">در حال بازگشت به نرم‌افزار...</p>
        <script>
          // LocalStorage save for web dashboard
          localStorage.setItem('tokensaver_token', '${user.token}');
          // Deep link redirect for electron or close window
          setTimeout(() => {
            window.location.href = 'tokensaver://auth?token=${user.token}';
            window.close();
          }, 1500);
        </script>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send('<html dir="rtl"><body style="background:#050508; color:#ef4444; font-family:sans-serif; text-align:center; padding-top:5rem;"><h2>ورود با خطا مواجه شد</h2><p>' + err.message + '</p></body></html>');
  }
});

// 4. Auth: Get User status
app.get('/api/auth/status', authenticateUser, (req, res) => {
  res.json({
    ok: true,
    user: {
      phoneNumber: req.user.phoneNumber,
      name: req.user.name,
      email: req.user.email,
      isPro: isProActive(req.user),
      proExpiresAt: req.user.proExpiresAt || null,
      purchasedTools: req.user.purchasedTools || []
    }
  });
});

// 5. Sync Projects metadata
app.post('/api/projects/sync', authenticateUser, (req, res) => {
  const projPath = sanitizeText(req.body.path, 400);
  const name = sanitizeText(req.body.name, 120);
  const { savedTokens, savedPercent } = req.body;
  if (!projPath || !name) {
    return res.json({ ok: false, error: 'اطلاعات پروژه ناقص است.' });
  }

  const db = loadDb();
  let proj = db.projects.find(p => p.userPhone === req.user.phoneNumber && p.path === projPath);

  if (!proj) {
    proj = {
      id: uuidv4(),
      userPhone: req.user.phoneNumber,
      name,
      path: projPath,
      savedTokens: Number(savedTokens) || 0,
      savedPercent: Number(savedPercent) || 0,
      updatedAt: new Date().toISOString()
    };
    db.projects.push(proj);
  } else {
    proj.name = name;
    proj.savedTokens = Number(savedTokens) || 0;
    proj.savedPercent = Number(savedPercent) || 0;
    proj.updatedAt = new Date().toISOString();
  }
  
  saveDb(db);
  res.json({ ok: true });
});

// 6. Request Payment via Zarinpal (Full subscription purchase)
app.post('/api/payment/request', authenticateUser, async (req, res) => {
  const db = loadDb();
  const amount = db.settings.proAmount;
  const description = db.settings.proDescription;
  
  const mId = db.settings.merchantId;
  const isSand = db.settings.zarinpalSandbox;

  const paymentRequestUrl = isSand 
    ? 'https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentRequest.json'
    : 'https://api.zarinpal.com/pg/v4/payment/request.json';
    
  const callbackUrl = `${db.settings.serverUrl}/api/payment/callback`;
  
  const payload = isSand ? {
    MerchantID: mId,
    Amount: amount,
    Description: description,
    CallbackURL: callbackUrl,
    Metadata: { email: req.user.email, mobile: req.user.phoneNumber }
  } : {
    merchant_id: mId,
    amount: amount * 10,
    description: description,
    callback_url: callbackUrl,
    metadata: { email: req.user.email, mobile: req.user.phoneNumber }
  };

  try {
    const result = await postRequest(paymentRequestUrl, payload);
    const status = isSand ? result.Status : (result.data ? result.data.code : -1);
    const authority = isSand ? result.Authority : (result.data ? result.data.authority : null);
    
    if (status === 100 || (status === 100 && authority)) {
      const dbInstance = loadDb();
      dbInstance.payments.push({
        authority,
        amount,
        userPhone: req.user.phoneNumber,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      saveDb(dbInstance);
      
      const startPayUrl = isSand
        ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
        : `https://www.zarinpal.com/pg/StartPay/${authority}`;
        
      res.json({ ok: true, paymentUrl: startPayUrl, authority });
    } else {
      res.json({ ok: false, error: 'خطا در ثبت درخواست پرداخت زرین‌پال. کد: ' + status });
    }
  } catch (err) {
    res.json({ ok: false, error: 'خطا در اتصال به درگاه پرداخت: ' + err.message });
  }
});

// API: Check usage limits and register usage of a tool on a project
app.post('/api/tools/use', authenticateUser, (req, res) => {
  const { toolId, projectPath } = req.body;
  if (!toolId || !projectPath) {
    return res.json({ ok: false, error: 'شناسه ابزار و مسیر پروژه الزامی است.' });
  }

  const db = loadDb();
  const tool = db.tools.find(t => t.id === toolId);
  if (!tool) {
    return res.json({ ok: false, error: 'ابزار یافت نشد.' });
  }

  if (!db.usages) db.usages = [];

  // Find all usages of this tool by this user
  const userUsages = db.usages.filter(u => u.userPhone === req.user.phoneNumber && u.toolId === toolId);
  
  // Check if already used on this project
  const alreadyUsed = userUsages.some(u => u.projectPath === projectPath);
  
  const limit = tool.usageLimit !== undefined ? tool.usageLimit : db.settings.defaultUsageLimit;

  if (alreadyUsed) {
    return res.json({ ok: true, usageCount: userUsages.length, limit });
  }

  // Not used on this project yet. Check if limit is reached.
  if (userUsages.length >= limit) {
    return res.json({ 
      ok: false, 
      error: `سقف مجاز استفاده از این ابزار روی پروژه‌ها به پایان رسیده است (حداکثر ${limit} پروژه).`,
      usageCount: userUsages.length,
      limit
    });
  }

  // Register new usage
  const newUsage = {
    id: uuidv4(),
    userPhone: req.user.phoneNumber,
    toolId,
    projectPath,
    createdAt: new Date().toISOString()
  };
  db.usages.push(newUsage);
  saveDb(db);

  res.json({ ok: true, usageCount: userUsages.length + 1, limit });
});

// 7. Request payment for a specific dynamic Tool
app.post('/api/payment/request-tool', authenticateUser, async (req, res) => {
  const { toolId } = req.body;
  if (!toolId) {
    return res.json({ ok: false, error: 'شناسه ابزار ارسال نشده است.' });
  }
  
  const db = loadDb();
  const tool = db.tools.find(t => t.id === toolId);
  if (!tool) {
    return res.json({ ok: false, error: 'ابزار یافت نشد.' });
  }
  
  const price = tool.price || 50000;
  const description = `خرید ابزار ${tool.name} برای ${req.user.phoneNumber}`;
  
  const mId = db.settings.merchantId;
  const isSand = db.settings.zarinpalSandbox;

  const paymentRequestUrl = isSand 
    ? 'https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentRequest.json'
    : 'https://api.zarinpal.com/pg/v4/payment/request.json';
    
  const callbackUrl = `${db.settings.serverUrl}/api/payment/callback`;
  
  const payload = isSand ? {
    MerchantID: mId,
    Amount: price,
    Description: description,
    CallbackURL: callbackUrl,
    Metadata: { email: req.user.email, mobile: req.user.phoneNumber, toolId }
  } : {
    merchant_id: mId,
    amount: price * 10,
    description: description,
    callback_url: callbackUrl,
    metadata: { email: req.user.email, mobile: req.user.phoneNumber, toolId }
  };

  try {
    const result = await postRequest(paymentRequestUrl, payload);
    const status = isSand ? result.Status : (result.data ? result.data.code : -1);
    const authority = isSand ? result.Authority : (result.data ? result.data.authority : null);
    
    if (status === 100 || (status === 100 && authority)) {
      db.payments.push({
        authority,
        amount: price,
        userPhone: req.user.phoneNumber,
        toolId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      saveDb(db);
      
      const startPayUrl = isSand
        ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
        : `https://www.zarinpal.com/pg/StartPay/${authority}`;
        
      res.json({ ok: true, paymentUrl: startPayUrl, authority });
    } else {
      res.json({ ok: false, error: 'خطا در ثبت درخواست پرداخت زرین‌پال. کد: ' + status });
    }
  } catch (err) {
    res.json({ ok: false, error: 'خطا در اتصال به درگاه پرداخت: ' + err.message });
  }
});

// 8. Payment Callback (Handles Zarinpal redirect)
app.get('/api/payment/callback', async (req, res) => {
  const authority = req.query.Authority;
  const status = req.query.Status;
  
  if (status !== 'OK' || !authority) {
    return res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h1 style="color:#ef4444;">پرداخت ناموفق بود یا لغو شد</h1>
        <p style="color:#94a3b8;">تراکنش شما توسط درگاه پرداخت لغو گردید.</p>
        <button onclick="window.close()" style="padding:0.7rem 1.5rem; background:#3b82f6; color:white; border:none; border-radius:8px; cursor:pointer;">بستن پنجره</button>
      </div>
    `);
  }
  
  const db = loadDb();
  const payment = db.payments.find(p => p.authority === authority);
  if (!payment) {
    return res.status(404).send('تراکنش یافت نشد.');
  }
  
  const mId = db.settings.merchantId;
  const isSand = db.settings.zarinpalSandbox;

  const verifyUrl = isSand
    ? 'https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentVerification.json'
    : 'https://api.zarinpal.com/pg/v4/payment/verify.json';
    
  const payload = isSand ? {
    MerchantID: mId,
    Authority: authority,
    Amount: payment.amount
  } : {
    merchant_id: mId,
    amount: payment.amount * 10,
    authority: authority
  };
  
  try {
    const result = await postRequest(verifyUrl, payload);
    const verifyStatus = isSand ? result.Status : (result.data ? result.data.code : -1);
    
    if (verifyStatus === 100 || verifyStatus === 101) {
      payment.status = 'completed';
      
      const user = db.users.find(u => u.phoneNumber === payment.userPhone);
      if (user) {
        if (payment.toolId) {
          if (!user.purchasedTools) user.purchasedTools = [];
          if (!user.purchasedTools.includes(payment.toolId)) {
            user.purchasedTools.push(payment.toolId);
          }
        } else {
          // Monthly subscription: activate/extend by proPlanDays
          activateSubscription(user, db.settings.proPlanDays || 30);
        }
      }

      const licenseKey = `TS-PRO-${uuidv4().substring(0, 8).toUpperCase()}-${uuidv4().substring(9, 13).toUpperCase()}`;
      db.licenses.push({
        key: licenseKey,
        userPhone: payment.userPhone,
        toolId: payment.toolId || null,
        createdAt: new Date().toISOString()
      });
      
      saveDb(db);
      
      const successMessage = payment.toolId 
        ? 'ابزار با موفقیت فعال شد. قفل آن در نرم‌افزار باز شد.'
        : 'حساب کاربری شما ارتقا یافت. برای موارد دسکتاپ قدیمی، این لایسنس را در نرم‌افزار وارد کنید.';
      
      res.send(`
        <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
          <div style="max-width:500px; margin:auto; background:#0a0a10; border:1px solid rgba(255,255,255,0.08); padding:2rem; border-radius:16px;">
            <h1 style="color:#10b981; margin-bottom:1rem;">✓ پرداخت با موفقیت انجام شد</h1>
            <p style="color:#94a3b8; font-size:0.95rem; margin-bottom:1.5rem;">${successMessage}</p>
            <div style="background:#1e1b4b; border:1px dashed #8b5cf6; padding:1rem; border-radius:10px; font-family:monospace; font-size:1.2rem; color:#c084fc; letter-spacing:1px; margin-bottom:2rem; user-select:all;">
              ${licenseKey}
            </div>
            <p style="color:#ef4444; font-size:0.8rem; margin-bottom:2rem;">این پنجره را ببندید و به نرم‌افزار بازگردید.</p>
            <button onclick="window.close()" style="padding:0.7rem 1.5rem; background:linear-gradient(120deg, #3b82f6, #8b5cf6); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">بستن و بازگشت به نرم‌افزار</button>
          </div>
        </div>
      `);
    } else {
      res.send(`
        <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
          <h1 style="color:#ef4444;">تایید پرداخت ناموفق بود</h1>
          <p style="color:#94a3b8;">کد پاسخ زرین‌پال: ${verifyStatus}</p>
          <button onclick="window.close()" style="padding:0.7rem 1.5rem; background:#3b82f6; color:white; border:none; border-radius:8px; cursor:pointer;">بستن پنجره</button>
        </div>
      `);
    }
  } catch (err) {
    res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h1 style="color:#ef4444;">خطای سرور در تایید پرداخت</h1>
        <p>${err.message}</p>
        <button onclick="window.close()" style="padding:0.7rem 1.5rem; background:#3b82f6; color:white; border:none; border-radius:8px; cursor:pointer;">بستن پنجره</button>
      </div>
    `);
  }
});

// 9. Verify License Key (Backward compatible)
app.post('/api/license/verify', (req, res) => {
  const { licenseKey } = req.body;
  if (!licenseKey) {
    return res.json({ ok: false, error: 'کد لایسنس ارسال نشده است.' });
  }
  
  const db = loadDb();
  const license = db.licenses.find(l => l.key === licenseKey);
  
  if (license) {
    const user = db.users.find(u => u.phoneNumber === license.userPhone);
    if (user) {
      if (license.toolId) {
        if (!user.purchasedTools) user.purchasedTools = [];
        if (!user.purchasedTools.includes(license.toolId)) {
          user.purchasedTools.push(license.toolId);
        }
      } else {
        // Monthly subscription via license key: activate/extend
        activateSubscription(user, db.settings.proPlanDays || 30);
      }
      saveDb(db);
    }

    res.json({
      ok: true,
      active: license.toolId ? true : isProActive(user),
      plan: license.toolId ? 'tool' : 'pro',
      toolId: license.toolId || null,
      proExpiresAt: user ? user.proExpiresAt || null : null,
      features: ['rtk', 'headroom', 'llmlingua', 'mem0', 'repomix'],
      owner: user ? user.name : 'کاربر پرو',
      email: user ? user.email : '',
      activatedAt: license.createdAt
    });
  } else {
    res.json({ ok: false, error: 'کد لایسنس معتبر نیست.' });
  }
});

// --- ADMIN PANELS ROUTING ---

// Admin login page (redirects to unified frontend /login)
app.get('/admin/login', (req, res) => {
  res.redirect('/login?redirect=/admin');
});

// Admin login post (legacy compatibility, redirecting to /login on error)
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  const db = loadDb();
  const adminPass = (db.settings && db.settings.adminPassword) || ADMIN_PASSWORD;
  if (password === adminPass) {
    const sid = uuidv4() + uuidv4();
    adminSessions.add(sid);
    res.setHeader('Set-Cookie', `admin_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    res.redirect('/admin');
  } else {
    res.redirect('/login?redirect=/admin&error=password');
  }
});

// Admin logout (clears session and redirects to unified frontend /login)
app.get('/admin/logout', (req, res) => {
  const sid = getCookie(req, 'admin_session');
  if (sid) adminSessions.delete(sid);
  res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.redirect('/login');
});

// Admin: Add dynamic tool
app.post('/admin/tools/add', isAdmin, (req, res) => {
  const { id, name, category, tagline, repo, recommended, locked, price, description, howItWorks, claims, notes, afterInstall, installMac, installWin, installLinux, uiUrl, usageLimit } = req.body;
  
  if (!id || !name) {
    return res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h2 style="color:#ef4444;">شناسه و نام ابزار الزامی است</h2>
        <a href="/admin" style="color:#3b82f6; text-decoration:none;">بازگشت به پنل</a>
      </div>
    `);
  }
  
  const db = loadDb();
  const existing = db.tools.find(t => t.id === id);
  if (existing) {
    return res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h2 style="color:#ef4444;">ابزاری با این شناسه قبلا ثبت شده است</h2>
        <a href="/admin" style="color:#3b82f6; text-decoration:none;">بازگشت به پنل</a>
      </div>
    `);
  }
  
  const newTool = {
    id,
    name,
    category: category || 'compression',
    tagline,
    repo,
    recommended: recommended === 'on',
    locked: locked === 'on',
    price: Number(price) || 50000,
    uiUrl: uiUrl || '',
    usageLimit: Number(usageLimit) || 10,
    description,
    howItWorks,
    claims: claims ? claims.split('\n').map(c => c.trim()).filter(Boolean) : [],
    notes: notes ? notes.split('\n').map(n => n.trim()).filter(Boolean) : [],
    afterInstall,
    install: {
      mac: { type: 'shell', cmd: installMac || '' },
      win: { type: 'shell', cmd: installWin || '' },
      linux: { type: 'shell', cmd: installLinux || '' }
    }
  };
  
  db.tools.push(newTool);
  saveDb(db);
  res.redirect('/admin');
});

// Admin: Delete dynamic tool
app.post('/admin/tools/delete/:id', isAdmin, (req, res) => {
  const toolId = req.params.id;
  const db = loadDb();
  db.tools = db.tools.filter(t => t.id !== toolId);
  saveDb(db);
  res.redirect('/admin');
});

// Admin: Edit dynamic tool
app.post('/admin/tools/edit', isAdmin, (req, res) => {
  const { id, name, category, tagline, repo, recommended, locked, price, description, howItWorks, claims, notes, afterInstall, installMac, installWin, installLinux, uiUrl, usageLimit } = req.body;
  
  if (!id || !name) {
    return res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h2 style="color:#ef4444;">شناسه و نام ابزار الزامی است</h2>
        <a href="/admin" style="color:#3b82f6; text-decoration:none;">بازگشت به پنل</a>
      </div>
    `);
  }
  
  const db = loadDb();
  const toolIndex = db.tools.findIndex(t => t.id === id);
  if (toolIndex === -1) {
    return res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h2 style="color:#ef4444;">ابزاری با شناسه ${id} یافت نشد</h2>
        <a href="/admin" style="color:#3b82f6; text-decoration:none;">بازگشت به پنل</a>
      </div>
    `);
  }
  
  // Update the existing tool
  db.tools[toolIndex] = {
    id,
    name,
    category: category || 'compression',
    tagline,
    repo,
    recommended: recommended === 'on',
    locked: locked === 'on',
    price: Number(price) || 50000,
    uiUrl: uiUrl || '',
    usageLimit: Number(usageLimit) || 10,
    description,
    howItWorks,
    claims: claims ? claims.split('\n').map(c => c.trim()).filter(Boolean) : [],
    notes: notes ? notes.split('\n').map(n => n.trim()).filter(Boolean) : [],
    afterInstall,
    install: {
      mac: { type: 'shell', cmd: installMac || '' },
      win: { type: 'shell', cmd: installWin || '' },
      linux: { type: 'shell', cmd: installLinux || '' }
    }
  };
  
  saveDb(db);
  res.redirect('/admin');
});

// Admin: Send dynamic message / notification to user(s)
app.post('/admin/notifications/send', isAdmin, (req, res) => {
  const { recipientType, userPhone, message } = req.body;
  
  if (!message || message.trim() === '') {
    return res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h2 style="color:#ef4444;">متن پیام نمی‌تواند خالی باشد</h2>
        <a href="/admin" style="color:#3b82f6; text-decoration:none;">بازگشت به پنل</a>
      </div>
    `);
  }
  
  const targetPhone = recipientType === 'all' ? 'all' : userPhone;
  if (recipientType === 'specific' && (!targetPhone || !/^09\d{9}$/.test(targetPhone))) {
    return res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h2 style="color:#ef4444;">شماره موبایل گیرنده معتبر نیست</h2>
        <a href="/admin" style="color:#3b82f6; text-decoration:none;">بازگشت به پنل</a>
      </div>
    `);
  }
  
  const db = loadDb();
  if (!db.notifications) db.notifications = [];
  
  const newNotification = {
    id: uuidv4(),
    userPhone: targetPhone,
    message: message.trim(),
    createdAt: new Date().toISOString(),
    readBy: []
  };
  
  db.notifications.push(newNotification);
  saveDb(db);
  
  res.redirect('/admin?tab=tab-messages');
});

// Admin: Delete dynamic notification
app.post('/admin/notifications/delete/:id', isAdmin, (req, res) => {
  const notifId = req.params.id;
  const db = loadDb();
  if (db.notifications) {
    db.notifications = db.notifications.filter(n => n.id !== notifId);
    saveDb(db);
  }
  res.redirect('/admin?tab=tab-messages');
});

// Admin: Reset usages for a user-tool pair
app.post('/admin/usages/reset/:userPhone/:toolId', isAdmin, (req, res) => {
  const { userPhone, toolId } = req.params;
  const db = loadDb();
  if (db.usages) {
    db.usages = db.usages.filter(u => !(u.userPhone === userPhone && u.toolId === toolId));
    saveDb(db);
  }
  res.redirect('/admin?tab=tab-usages');
});

// Admin: Manually extend a user's monthly subscription by one period
app.post('/admin/users/extend/:phone', isAdmin, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.phoneNumber === req.params.phone);
  if (user) {
    activateSubscription(user, db.settings.proPlanDays || 30);
    saveDb(db);
  }
  res.redirect('/admin?tab=tab-users');
});

// Admin: Manually cancel/disable a user's subscription
app.post('/admin/users/cancel/:phone', isAdmin, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.phoneNumber === req.params.phone);
  if (user) {
    user.isPro = false;
    user.proExpiresAt = null;
    saveDb(db);
  }
  res.redirect('/admin?tab=tab-users');
});

// Admin: Save settings
app.post('/admin/settings/save', isAdmin, (req, res) => {
  const { merchantId, smsApiKey, smsTemplateId, adminPassword, adminPhone, adminEmail, proAmount, proDescription, proPlanDays, serverUrl, zarinpalSandbox, defaultUsageLimit, googleClientId, googleClientSecret } = req.body;
  
  if (!merchantId || !smsApiKey || !smsTemplateId || !adminPassword || !serverUrl) {
    return res.send(`
      <div style="direction:rtl; text-align:center; padding:3rem; font-family:sans-serif; background:#050508; color:#fff; min-height:100vh;">
        <h2 style="color:#ef4444;">فیلدهای ضروری (شناسه درگاه، توکن پیامک، آدرس سرور و پسورد) الزامی هستند</h2>
        <a href="/admin?tab=tab-settings" style="color:#3b82f6; text-decoration:none;">بازگشت به تنظیمات</a>
      </div>
    `);
  }
  
  const db = loadDb();
  db.settings = {
    merchantId: merchantId.trim(),
    smsApiKey: smsApiKey.trim(),
    smsTemplateId: Number(smsTemplateId) || 100000,
    adminPassword: adminPassword.trim(),
    adminPhone: adminPhone ? adminPhone.trim() : '09123456789',
    adminEmail: adminEmail ? adminEmail.trim() : 'admin@tokensaver.ir',
    proAmount: Number(proAmount) || 199000,
    proDescription: proDescription ? proDescription.trim() : 'اشتراک ماهانه پرو TokenSaver',
    proPlanDays: Number(proPlanDays) || 30,
    serverUrl: serverUrl.trim().replace(/\/$/, ''),
    zarinpalSandbox: zarinpalSandbox === 'on',
    defaultUsageLimit: Number(defaultUsageLimit) || 10,
    googleClientId: googleClientId ? googleClientId.trim() : '',
    googleClientSecret: googleClientSecret ? googleClientSecret.trim() : ''
  };
  saveDb(db);
  res.redirect('/admin?tab=tab-settings');
});

// API: Get notifications for current user
app.get('/api/notifications', authenticateUser, (req, res) => {
  const db = loadDb();
  if (!db.notifications) db.notifications = [];
  
  // Filter notifications sent to 'all' or specifically to this user
  const userNotifs = db.notifications.filter(n => 
    n.userPhone === 'all' || n.userPhone === req.user.phoneNumber
  );
  
  res.json({
    ok: true,
    notifications: userNotifs
  });
});

// Main Admin Dashboard UI
app.get('/admin', isAdmin, (req, res) => {
  const db = loadDb();
  if (!db.notifications) db.notifications = [];
  
  const settings = db.settings || {
    merchantId: '00000000-0000-0000-0000-000000000000',
    smsApiKey: 'your-sms-ir-api-key',
    smsTemplateId: 100000,
    adminPassword: 'admin123'
  };

  // Prepare notification rows
  const notifRows = db.notifications.map(n => `
    <tr>
      <td style="font-family: monospace; font-size: 0.8rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${n.id}">${n.id}</td>
      <td style="font-family: monospace; font-weight: bold; color: ${n.userPhone === 'all' ? '#60a5fa' : '#c084fc'};">
        ${n.userPhone === 'all' ? 'همه کاربران (Broadcast)' : n.userPhone}
      </td>
      <td style="max-width: 400px; word-wrap: break-word; font-size: 0.88rem;">${(n.message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
      <td style="font-size: 0.8rem; color: #94a3b8;">${n.readBy ? n.readBy.length : 0} نفر</td>
      <td style="font-size: 0.8rem; color: #94a3b8;">${new Date(n.createdAt).toLocaleDateString('fa-IR')} ${new Date(n.createdAt).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</td>
      <td>
        <form method="POST" action="/admin/notifications/delete/${n.id}" onsubmit="return confirm('آیا از حذف این پیام مطمئن هستید؟')" style="margin:0;">
          <button type="submit" style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">حذف</button>
        </form>
      </td>
    </tr>
  `).reverse().join('');
  
  // Calculate analytics
  const totalUsers = db.users.length;
  const proUsers = db.users.filter(u => isProActive(u)).length;
  const completedPayments = db.payments.filter(p => p.status === 'completed');
  const totalRevenue = completedPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalProjects = db.projects.length;
  const totalSavedTokens = db.projects.reduce((acc, p) => acc + p.savedTokens, 0);
  const totalSavedCost = db.projects.reduce((acc, p) => acc + (p.savedTokens / 1000000) * 15, 0);
  
  // Prepare user detail rows
  const userRows = db.users.map(u => {
    const userProjects = db.projects.filter(p => p.userPhone === u.phoneNumber);
    const userSavedTokens = userProjects.reduce((acc, p) => acc + p.savedTokens, 0);
    const userSavedCost = (userSavedTokens / 1000000) * 15;
    const purchasedList = u.purchasedTools && u.purchasedTools.length > 0 
      ? u.purchasedTools.map(tId => `<code style="background:rgba(255,255,255,0.05); padding:0.15rem 0.3rem; border-radius:4px; font-size:0.75rem; margin-left:0.2rem;">${esc(tId)}</code>`).join('')
      : '—';
    
    return `
      <tr>
        <td>${esc(u.name)}</td>
        <td style="font-family: monospace;">${esc(u.phoneNumber)}</td>
        <td>${esc(u.email) || '—'}</td>
        <td>
          <span class="badge ${isProActive(u) ? 'pro' : 'free'}">
            ${isProActive(u) ? 'Pro نسخه پرو' : (u.isPro ? 'Pro منقضی‌شده' : 'Free رایگان')}
          </span>
          ${u.proExpiresAt ? `<div style="font-size:0.7rem; color:#94a3b8; margin-top:0.25rem;">تا ${new Date(u.proExpiresAt).toLocaleDateString('fa-IR')}</div>` : ''}
        </td>
        <td>${purchasedList}</td>
        <td>${userProjects.length} پروژه</td>
        <td style="color:#10b981; font-weight:bold;">${userSavedTokens.toLocaleString()} (~${userSavedCost.toFixed(2)}$)</td>
        <td style="font-size:0.8rem; color:#94a3b8;">${new Date(u.createdAt).toLocaleDateString('fa-IR')}</td>
        <td style="white-space:nowrap;">
          <form method="POST" action="/admin/users/extend/${u.phoneNumber}" style="display:inline; margin:0;">
            <button type="submit" title="افزودن یک دوره اشتراک" style="background:rgba(16,185,129,0.12); border:1px solid #10b981; color:#10b981; padding:0.3rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">تمدید +۱ ماه</button>
          </form>
          ${isProActive(u) ? `<form method="POST" action="/admin/users/cancel/${u.phoneNumber}" onsubmit="return confirm('اشتراک این کاربر لغو شود؟')" style="display:inline; margin:0 0.3rem;">
            <button type="submit" title="غیرفعال‌سازی اشتراک" style="background:rgba(239,68,68,0.12); border:1px solid #ef4444; color:#ef4444; padding:0.3rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">لغو</button>
          </form>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Prepare transaction rows
  const paymentRows = db.payments.map(p => `
    <tr>
      <td style="font-family: monospace; font-size:0.8rem;">${p.authority}</td>
      <td style="font-family: monospace;">${p.userPhone}</td>
      <td>${p.toolId ? `<code style="color:#c084fc; font-weight:bold;">${p.toolId}</code>` : '<span style="color:#10b981;">Pro Plan</span>'}</td>
      <td>${p.amount.toLocaleString()} تومان</td>
      <td>
        <span class="badge ${p.status === 'completed' ? 'pro' : 'free'}">
          ${p.status === 'completed' ? 'موفق' : 'در انتظار'}
        </span>
      </td>
      <td style="font-size:0.8rem; color:#94a3b8;">${new Date(p.createdAt).toLocaleDateString('fa-IR')}</td>
    </tr>
  `).join('');

  // Prepare project details rows
  const projectRows = db.projects.map(p => {
    const user = db.users.find(u => u.phoneNumber === p.userPhone);
    const cost = (p.savedTokens / 1000000) * 15;
    return `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${esc(user ? user.name : 'نامشخص')} (${esc(p.userPhone)})</td>
        <td style="direction: ltr; text-align: left; font-family: monospace; font-size: 0.8rem; color: #94a3b8;" title="${esc(p.path)}">${esc(p.path)}</td>
        <td>${p.savedPercent}%</td>
        <td style="color:#10b981; font-weight:bold;">${p.savedTokens.toLocaleString()} (~${cost.toFixed(2)}$)</td>
        <td style="font-size:0.8rem; color:#94a3b8;">${new Date(p.updatedAt).toLocaleDateString('fa-IR')}</td>
      </tr>
    `;
  }).join('');

  // Calculate user-tool usages
  if (!db.usages) db.usages = [];
  const usageGroupMap = {};
  db.usages.forEach(u => {
    const key = `${u.userPhone}_${u.toolId}`;
    if (!usageGroupMap[key]) {
      usageGroupMap[key] = {
        userPhone: u.userPhone,
        toolId: u.toolId,
        projects: [],
        earliest: u.createdAt
      };
    }
    if (!usageGroupMap[key].projects.includes(u.projectPath)) {
      usageGroupMap[key].projects.push(u.projectPath);
    }
    if (u.createdAt < usageGroupMap[key].earliest) {
      usageGroupMap[key].earliest = u.createdAt;
    }
  });

  const usageRows = Object.values(usageGroupMap).map(g => {
    const user = db.users.find(u => u.phoneNumber === g.userPhone);
    const tool = db.tools.find(t => t.id === g.toolId) || { name: g.toolId, usageLimit: 10 };
    const limit = tool.usageLimit !== undefined ? tool.usageLimit : 10;
    const userName = user ? user.name : 'نامشخص';
    
    return `
      <tr>
        <td>${esc(userName)} (${esc(g.userPhone)})</td>
        <td>${tool.name} (<code style="color:#60a5fa;">${g.toolId}</code>)</td>
        <td style="font-family:monospace; font-size:0.75rem; text-align:left; direction:ltr; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(g.projects.join('\n'))}">
          ${esc(g.projects.join(', '))}
        </td>
        <td style="font-weight:bold; color: ${g.projects.length >= limit ? '#ef4444' : '#10b981'};">
          ${g.projects.length} / ${limit} پروژه
        </td>
        <td style="font-size:0.8rem; color:#94a3b8;">${new Date(g.earliest).toLocaleDateString('fa-IR')}</td>
        <td>
          <form method="POST" action="/admin/usages/reset/${g.userPhone}/${g.toolId}" onsubmit="return confirm('آیا از ریست کردن تعداد استفاده این کاربر برای این ابزار مطمئن هستید؟')" style="margin:0;">
            <button type="submit" style="background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; color: #f59e0b; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">ریست تعداد استفاده</button>
          </form>
        </td>
      </tr>
    `;
  }).join('');

  // Prepare dynamic tools list for admin tab
  const toolItemsHtml = db.tools.map(t => `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
      <div>
        <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">${esc(t.name)} <span style="font-family: monospace; font-size: 0.8rem; color: #60a5fa;">(${esc(t.id)})</span></h4>
        <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem;">${esc(t.tagline) || 'بدون شعار'}</div>
        <div style="font-size: 0.75rem; margin-top: 0.4rem;">
          <span class="badge ${t.locked ? 'pro' : 'free'}" style="padding: 0.1rem 0.4rem; font-size: 0.7rem;">${t.locked ? 'پولی' : 'رایگان'}</span>
          ${t.locked ? `<span style="color: #c084fc; font-weight: bold; margin-right: 0.5rem; font-size: 0.75rem;">${t.price ? t.price.toLocaleString() : '50,000'} تومان</span>` : ''}
          ${t.recommended ? `<span class="badge" style="background:rgba(59,130,246,0.1); border:1px solid #3b82f6; color:#3b82f6; padding:0.1rem 0.4rem; font-size:0.7rem; margin-right:0.5rem;">پیشنهادی</span>` : ''}
          <span class="badge" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; padding:0.1rem 0.4rem; font-size:0.7rem; margin-right:0.5rem;">سقف استفاده: ${t.usageLimit !== undefined ? t.usageLimit : 10} پروژه</span>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button onclick="startEditTool('${t.id}')" style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; color: #3b82f6; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; font-weight: bold; cursor: pointer;">ویرایش</button>
        <form method="POST" action="/admin/tools/delete/${t.id}" onsubmit="return confirm('آیا از حذف این ابزار مطمئن هستید؟')">
          <button type="submit" style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; font-weight: bold; cursor: pointer;">حذف</button>
        </form>
      </div>
    </div>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>پنل مدیریت Token Saver</title>
      <style>
        body { background: #050508; color: #fff; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; }
        .container { max-width: 1200px; margin: auto; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1rem; }
        h1 { font-size: 1.8rem; margin: 0; color: #60a5fa; }
        .btn-logout { padding: 0.5rem 1.2rem; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; color: #ef4444; cursor: pointer; text-decoration: none; font-size: 0.9rem; font-weight: bold; transition: background 0.3s; }
        .btn-logout:hover { background: rgba(239, 68, 68, 0.2); }
        
        /* Stats Grid */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
        .stat-card { background: rgba(10, 10, 16, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
        .stat-card.glow-pro { border-color: rgba(139, 92, 246, 0.3); box-shadow: 0 0 15px rgba(139, 92, 246, 0.1); }
        .stat-label { font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 0.5rem; }
        .stat-val { font-size: 2rem; font-weight: bold; color: #f3f4f6; }
        .stat-sub { font-size: 0.78rem; color: #10b981; margin-top: 0.4rem; display: block; }
        
        /* Tabs */
        .tab-buttons { display: flex; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 1.5rem; }
        .tab-btn { padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid transparent; color: #94a3b8; font-size: 1rem; font-weight: bold; cursor: pointer; transition: all 0.3s; }
        .tab-btn.active { border-color: #3b82f6; color: #3b82f6; }
        
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        /* Tables & Forms */
        table { width: 100%; border-collapse: collapse; background: rgba(10, 10, 16, 0.5); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        th, td { padding: 1rem; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.05); }
        th { background: rgba(255,255,255,0.02); font-weight: bold; color: #60a5fa; font-size: 0.9rem; }
        tr:hover { background: rgba(255,255,255,0.02); }
        td { font-size: 0.92rem; }
        
        .field { width: 100%; padding: 0.55rem 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #fff; box-sizing: border-box; margin-bottom: 1rem; font-size: 0.88rem; outline: none; transition: border 0.3s; }
        .field:focus { border-color: #3b82f6; }
        .btn { width: 100%; padding: 0.55rem; background: linear-gradient(120deg, #3b82f6, #8b5cf6); border: none; border-radius: 6px; color: white; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: opacity 0.3s; }
        .btn:hover { opacity: 0.9; }
        
        .badge { padding: 0.25rem 0.6rem; border-radius: 50px; font-size: 0.78rem; font-weight: bold; display: inline-block; }
        .badge.pro { background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; }
        .badge.free { background: rgba(148, 163, 184, 0.1); border: 1px solid #94a3b8; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; font-weight: 900; font-family: 'JetBrains Mono', 'Fira Code', monospace; background: linear-gradient(120deg, #3b82f6, #8b5cf6 55%, #10b981); color: #fff; font-size: 1.2rem; box-shadow: 0 0 10px rgba(59,130,246,0.5);">T</div>
            <h1 style="font-size: 1.5rem; margin: 0; font-weight: 800; color: #fff;">پنل مدیریت <span style="background: linear-gradient(120deg, #3b82f6, #8b5cf6 55%, #10b981); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Token Saver</span></h1>
          </div>
          <a href="/admin/logout" class="btn-logout">خروج از سیستم</a>
        </header>
        
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">کل کاربران</span>
            <div class="stat-val">${totalUsers}</div>
            <span class="stat-sub">${proUsers} کاربر نسخه پرو عمومی</span>
          </div>
          <div class="stat-card glow-pro">
            <span class="stat-label">درآمد درگاه زرین‌پال</span>
            <div class="stat-val" style="color: #c084fc;">${totalRevenue.toLocaleString()} تومان</div>
            <span class="stat-sub" style="color: #c084fc;">تراکنش‌های کاملاً موفق</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">پروژه‌های متصل</span>
            <div class="stat-val">${totalProjects}</div>
            <span class="stat-sub">میانگین ${(totalProjects / (totalUsers || 1)).toFixed(1)} پروژه به ازای کاربر</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">توکن‌های صرفه‌جویی‌شده</span>
            <div class="stat-val" style="color:#10b981;">${totalSavedTokens.toLocaleString()}</div>
            <span class="stat-sub">صرفه‌جویی ارزی معادل ~${totalSavedCost.toFixed(2)}$</span>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="tab-buttons">
          <button class="tab-btn active" onclick="switchTab('tab-users', this)">کاربران (${totalUsers})</button>
          <button class="tab-btn" onclick="switchTab('tab-projects', this)">پروژه‌ها (${totalProjects})</button>
          <button class="tab-btn" onclick="switchTab('tab-payments', this)">تراکنش‌ها (${completedPayments.length})</button>
          <button class="tab-btn" onclick="switchTab('tab-tools-mgmt', this)">مدیریت ابزارها (${db.tools.length})</button>
          <button class="tab-btn" onclick="switchTab('tab-usages', this)">استفاده از ابزارها (${db.usages ? db.usages.length : 0})</button>
          <button class="tab-btn" onclick="switchTab('tab-messages', this)">ارسال پیام و نوتیفیکیشن (${db.notifications ? db.notifications.length : 0})</button>
          <button class="tab-btn" onclick="switchTab('tab-settings', this)">تنظیمات سیستم</button>
        </div>
        
        <!-- Tab Content: Users -->
        <div id="tab-users" class="tab-content active">
          <table>
            <thead>
              <tr>
                <th>نام کاربر</th>
                <th>شماره تماس</th>
                <th>ایمیل</th>
                <th>وضعیت عمومی</th>
                <th>ابزارهای خریداری‌شده</th>
                <th>پروژه‌ها</th>
                <th>میزان صرفه‌جویی</th>
                <th>تاریخ عضویت</th>
                <th>مدیریت اشتراک</th>
              </tr>
            </thead>
            <tbody>
              ${userRows || '<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:2rem;">کاربری یافت نشد.</td></tr>'}
            </tbody>
          </table>
        </div>
        
        <!-- Tab Content: Projects -->
        <div id="tab-projects" class="tab-content">
          <table>
            <thead>
              <tr>
                <th>نام پروژه</th>
                <th>مالک</th>
                <th>مسیر محلی</th>
                <th>میزان فشرده‌سازی</th>
                <th>توکن صرفه‌جویی‌شده</th>
                <th>آخرین به‌روزرسانی</th>
              </tr>
            </thead>
            <tbody>
              ${projectRows || '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">پروژه‌ای همگام‌سازی نشده است.</td></tr>'}
            </tbody>
          </table>
        </div>
        
        <!-- Tab Content: Payments -->
        <div id="tab-payments" class="tab-content">
          <table>
            <thead>
              <tr>
                <th>Authority درگاه</th>
                <th>شماره کاربر</th>
                <th>ابزار خریداری‌شده</th>
                <th>مبلغ پرداخت</th>
                <th>وضعیت تراکنش</th>
                <th>تاریخ پرداخت</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows || '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">تراکنشی یافت نشد.</td></tr>'}
            </tbody>
          </table>
        </div>
        
        <!-- Tab Content: Send Messages & Notifications -->
        <div id="tab-messages" class="tab-content">
          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 2rem;">
            <!-- Sent Messages List -->
            <div>
              <h2 style="color: #60a5fa; font-size: 1.2rem; margin-top:0; margin-bottom: 1.5rem;">تاریخچه پیام‌های ارسال‌شده به اپلیکیشن</h2>
              <table>
                <thead>
                  <tr>
                    <th>شناسه پیام</th>
                    <th>گیرنده</th>
                    <th>متن پیام</th>
                    <th>بازدید کلاینت</th>
                    <th>تاریخ ارسال</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  ${notifRows || '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">هیچ پیامی ارسال نشده است.</td></tr>'}
                </tbody>
              </table>
            </div>
            
            <!-- Send Message Form -->
            <div style="background: rgba(10, 10, 16, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 1.5rem; border-radius: 12px; height: fit-content;">
              <h2 style="color: #60a5fa; font-size: 1.2rem; margin-top:0; margin-bottom: 1.5rem;">ارسال پیام جدید</h2>
              <form method="POST" action="/admin/notifications/send" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.4rem;">نوع گیرنده پیام:</label>
                  <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 0.6rem;">
                    <label style="font-size:0.85rem; cursor:pointer;">
                      <input type="radio" name="recipientType" value="all" checked onchange="toggleRecipientInput(false)"> ارسال به همه کاربران (Broadcast)
                    </label>
                    <label style="font-size:0.85rem; cursor:pointer;">
                      <input type="radio" name="recipientType" value="specific" onchange="toggleRecipientInput(true)"> ارسال به کاربر خاص
                    </label>
                  </div>
                </div>
                
                <div id="specific-user-input" style="display: none; margin-bottom: 0.6rem;">
                  <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">شماره موبایل کاربر هدف (با پیش‌شماره 09):</label>
                  <input type="text" name="userPhone" class="field" style="font-family: monospace; margin-bottom: 0;" placeholder="09123456789">
                </div>
                
                <div>
                  <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">متن پیام / اطلاعیه:</label>
                  <textarea name="message" class="field" style="min-height: 120px; font-family: inherit; resize: vertical; margin-bottom: 0;" placeholder="پیام خود را بنویسید. این پیام بلافاصله در اپلیکیشن کلاینت کاربر(ها) نمایش داده می‌شود..." required></textarea>
                </div>
                
                <button type="submit" class="btn" style="padding: 0.6rem; font-weight: bold; background: linear-gradient(120deg, #3b82f6, #8b5cf6);">ارسال پیام جدید ✓</button>
              </form>
            </div>
          </div>
        </div>
        
        <!-- Tab Content: Tools Management -->
        <div id="tab-tools-mgmt" class="tab-content">
          <div style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 2rem;">
            <!-- Tools List -->
            <div>
              <h2 style="color: #60a5fa; font-size: 1.2rem; margin-top:0; margin-bottom: 1.5rem;">فهرست ابزارهای موجود</h2>
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${toolItemsHtml}
              </div>
            </div>
            
            <!-- Add/Edit Tool Form -->
            <div style="background: rgba(10, 10, 16, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 1.5rem; border-radius: 12px;">
              <h2 id="form-title" style="color: #60a5fa; font-size: 1.2rem; margin-top:0; margin-bottom: 1.5rem;">افزودن روش کاهش مصرف جدید</h2>
              <form id="tool-form" method="POST" action="/admin/tools/add" style="display: flex; flex-direction: column; gap: 0.6rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.8rem;">
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">شناسه ابزار (یکتا/انگلیسی):</label>
                    <input type="text" id="form-id" name="id" class="field" style="margin-bottom:0; font-family:monospace;" placeholder="my-new-tool" required>
                  </div>
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">نام ابزار (فارسی):</label>
                    <input type="text" id="form-name" name="name" class="field" style="margin-bottom:0;" placeholder="snip — فشرده‌سازی خروجی" required>
                  </div>
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">دسته‌بندی ابزار:</label>
                    <select id="form-category" name="category" class="field" style="margin-bottom:0;" required>
                      <option value="compression">فشرده‌سازی و پروکسی</option>
                      <option value="index">ایندکس کدبیس و بسته‌بندی</option>
                      <option value="memory">لایه‌های حافظه بلندمدت</option>
                    </select>
                  </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.8rem;">
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">تگ‌لاین (خلاصه ادعا):</label>
                    <input type="text" id="form-tagline" name="tagline" class="field" style="margin-bottom:0;" placeholder="۶۰–۹۰٪ توکن کمتر در خروجی shell">
                  </div>
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">قیمت (تومان):</label>
                    <input type="number" id="form-price" name="price" class="field" style="margin-bottom:0;" value="50000">
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.8rem;">
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">آدرس رابط کاربری ابزار (uiUrl - اختیاری):</label>
                    <input type="url" id="form-uiUrl" name="uiUrl" class="field" style="margin-bottom:0; font-family:monospace;" placeholder="http://localhost:9749">
                  </div>
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">سقف مجاز استفاده روی پروژه‌ها:</label>
                    <input type="number" id="form-usageLimit" name="usageLimit" class="field" style="margin-bottom:0;" value="10" required>
                  </div>
                </div>

                <div>
                  <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">آدرس ریپازیتوری گیت‌هاب:</label>
                  <input type="url" id="form-repo" name="repo" class="field" style="margin-bottom:0; font-family:monospace;" placeholder="https://github.com/...">
                </div>

                <div style="display: flex; gap: 1.5rem; align-items: center; margin: 0.2rem 0;">
                  <label style="font-size:0.8rem; cursor:pointer;"><input type="checkbox" id="form-recommended" name="recommended"> ابزار پیشنهادی (برجسته)</label>
                  <label style="font-size:0.8rem; cursor:pointer;"><input type="checkbox" id="form-locked" name="locked" checked> ابزار پولی (نیاز به خرید)</label>
                </div>

                <div>
                  <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">توضیحات کلی ابزار:</label>
                  <textarea id="form-description" name="description" class="field" style="margin-bottom:0; min-height:45px; font-family:inherit; resize:vertical;" placeholder="این ابزار خروجی دستورهای توسعه خودکار را قبل از رسیدن به agent خلاصه می‌کند..."></textarea>
                </div>

                <div>
                  <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">چگونه کار می‌کند:</label>
                  <input type="text" id="form-howItWorks" name="howItWorks" class="field" style="margin-bottom:0;" placeholder="بعد از نصب، با اجرای دستور snip init خروجی دستورهای توسعه فیلتر می‌شود.">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;">
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">ادعاهای پروژه (هر خط یک مورد):</label>
                    <textarea id="form-claims" name="claims" class="field" style="margin-bottom:0; min-height:40px; font-family:inherit;" placeholder="۶۰–۹۰٪ کاهش توکن روی خروجی&#10;نصب بدون وب‌سرور"></textarea>
                  </div>
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">نکات مهم (هر خط یک مورد):</label>
                    <textarea id="form-notes" name="notes" class="field" style="margin-bottom:0; min-height:40px; font-family:inherit;" placeholder="دیتا محلی می‌ماند&#10;تک باینری بدون وابستگی"></textarea>
                  </div>
                </div>

                <div>
                  <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">دستورهای پس از نصب:</label>
                  <input type="text" id="form-afterInstall" name="afterInstall" class="field" style="margin-bottom:0;" placeholder="دستور snip init را اجرا کنید.">
                </div>

                <h3 style="color: #60a5fa; font-size: 0.85rem; margin: 0.6rem 0 0.25rem 0;">اسکریپت‌های نصب خودکار (محیط ترمینال کدنویسی حرفه‌ای)</h3>
                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">اسکریپت نصب در سیستم‌عامل مک (macOS Terminal):</label>
                    <div style="background: #030305; border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                      <div style="background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0.3rem 0.6rem; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 0.68rem; color: #60a5fa; font-weight: bold; font-family: monospace;">bash - macOS</span>
                        <div style="display: flex; gap: 0.25rem;">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; display: inline-block;"></span>
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                        </div>
                      </div>
                      <textarea id="form-installMac" name="installMac" style="width: 100%; border: none; background: transparent; color: #10b981; padding: 0.6rem; box-sizing: border-box; font-family: 'Fira Code', 'Courier New', monospace; font-size: 0.75rem; line-height: 1.4; min-height: 100px; resize: vertical; outline: none; display: block;" placeholder="# اسکریپت نصب در مک را اینجا بنویسید (مثلا curl... | bash)"></textarea>
                    </div>
                  </div>
                  
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">اسکریپت نصب در سیستم‌عامل ویندوز (Windows Command Prompt/WSL):</label>
                    <div style="background: #030305; border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                      <div style="background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0.3rem 0.6rem; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 0.68rem; color: #a78bfa; font-weight: bold; font-family: monospace;">shell - Windows</span>
                        <div style="display: flex; gap: 0.25rem;">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; display: inline-block;"></span>
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                        </div>
                      </div>
                      <textarea id="form-installWin" name="installWin" style="width: 100%; border: none; background: transparent; color: #a78bfa; padding: 0.6rem; box-sizing: border-box; font-family: 'Fira Code', 'Courier New', monospace; font-size: 0.75rem; line-height: 1.4; min-height: 100px; resize: vertical; outline: none; display: block;" placeholder="# اسکریپت نصب در ویندوز را اینجا بنویسید (سازگار با محیط شل اجرا شونده)"></textarea>
                    </div>
                  </div>
                  
                  <div>
                    <label style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.2rem;">اسکریپت نصب در سیستم‌عامل لینوکس (Linux Shell):</label>
                    <div style="background: #030305; border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                      <div style="background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0.3rem 0.6rem; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 0.68rem; color: #f59e0b; font-weight: bold; font-family: monospace;">bash - Linux</span>
                        <div style="display: flex; gap: 0.25rem;">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; display: inline-block;"></span>
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                        </div>
                      </div>
                      <textarea id="form-installLinux" name="installLinux" style="width: 100%; border: none; background: transparent; color: #f59e0b; padding: 0.6rem; box-sizing: border-box; font-family: 'Fira Code', 'Courier New', monospace; font-size: 0.75rem; line-height: 1.4; min-height: 100px; resize: vertical; outline: none; display: block;" placeholder="# اسکریپت نصب در لینوکس را اینجا بنویسید"></textarea>
                    </div>
                  </div>
                </div>

                <div style="display: flex; gap: 0.8rem; margin-top: 0.8rem;">
                  <button type="submit" id="form-submit-btn" class="btn" style="flex: 1; padding: 0.5rem; background: linear-gradient(120deg, #3b82f6, #8b5cf6);">افزودن ابزار جدید ✓</button>
                  <button type="button" id="form-cancel-btn" class="btn" style="flex: 1; padding: 0.5rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; display: none;" onclick="cancelEditTool()">انصراف</button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        <!-- Tab Content: Tool Usages -->
        <div id="tab-usages" class="tab-content">
          <table>
            <thead>
              <tr>
                <th>کاربر</th>
                <th>نام ابزار</th>
                <th>پروژه‌های استفاده‌شده</th>
                <th>تعداد استفاده / سقف مجاز</th>
                <th>تاریخ اولین استفاده</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              ${usageRows || '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">هیچ موردی از استفاده ابزار ثبت نشده است.</td></tr>'}
            </tbody>
          </table>
        </div>
        
        <!-- Tab Content: Settings -->
        <div id="tab-settings" class="tab-content">
          <div style="background: rgba(10, 10, 16, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #60a5fa; font-size: 1.25rem; margin-top: 0; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">تنظیمات هسته سیستم</h2>
            <form method="POST" action="/admin/settings/save" style="display: flex; flex-direction: column; gap: 1.2rem;">
              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">شناسه درگاه زرین‌پال (Merchant ID):</label>
                <input type="text" name="merchantId" class="field" style="font-family:monospace; margin-bottom:0;" value="${settings.merchantId}" placeholder="00000000-0000-0000-0000-000000000000" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">شناسه مرچنت زرین‌پال جهت تراکنش‌ها. مقدار پیش‌فرض ۳۶ کاراکتر صفر به معنی حالت Sandbox/تست است.</small>
              </div>
              
              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">توکن پنل پیامکی (SMS.ir API Key):</label>
                <input type="text" name="smsApiKey" class="field" style="font-family:monospace; margin-bottom:0;" value="${settings.smsApiKey}" placeholder="your-sms-ir-api-key" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">کلید وب‌سرویس پنل SMS.ir جهت ارسال کدهای ورود پیامکی OTP کلاینت.</small>
              </div>
              
              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">کد قالب پیامک (SMS Template ID):</label>
                <input type="number" name="smsTemplateId" class="field" style="margin-bottom:0;" value="${settings.smsTemplateId}" placeholder="100000" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">کد قالب تایید هویت متنی SMS.ir حاوی پارامتر [Code].</small>
              </div>
              
              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">کلمه عبور پنل مدیریت (Admin Password):</label>
                <input type="text" name="adminPassword" class="field" style="font-family:monospace; margin-bottom:0;" value="${settings.adminPassword}" placeholder="admin123" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">رمز عبور ورود به پنل مدیریت. (نشست با توکن تصادفی امن مدیریت می‌شود، نه با رمز.)</small>
              </div>
              
              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">شماره موبایل مدیریت (Admin Phone):</label>
                <input type="text" name="adminPhone" class="field" style="font-family:monospace; margin-bottom:0;" value="${settings.adminPhone || '09123456789'}" placeholder="09123456789" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">شماره همراه مدیر جهت دریافت پیامک‌های فراموشی رمز عبور.</small>
              </div>
              
              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">ایمیل مدیریت (Admin Email):</label>
                <input type="email" name="adminEmail" class="field" style="font-family:monospace; margin-bottom:0;" value="${settings.adminEmail || 'admin@tokensaver.ir'}" placeholder="admin@tokensaver.ir" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">آدرس ایمیل مدیر جهت دریافت کدهای فراموشی رمز عبور.</small>
              </div>
              
              <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin:1rem 0;">

              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">آدرس دامنه سرور (Server URL):</label>
                <input type="url" name="serverUrl" class="field" style="font-family:monospace; margin-bottom:0;" value="${settings.serverUrl || 'http://localhost:8080'}" placeholder="http://localhost:8080" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">آدرس پایه این سرور (استفاده جهت ساخت لینک بازگشت زرین‌پال).</small>
              </div>

              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">هزینه اشتراک ماهانه پرو (تومان):</label>
                <input type="number" name="proAmount" class="field" style="margin-bottom:0;" value="${settings.proAmount || 199000}" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">مبلغ اشتراک ماهانه که قفل همه ابزارهای پرو را باز می‌کند.</small>
              </div>

              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">مدت اشتراک (روز):</label>
                <input type="number" name="proPlanDays" class="field" style="margin-bottom:0;" value="${settings.proPlanDays || 30}" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">مدت اعتبار هر بار خرید اشتراک. پیش‌فرض ۳۰ روز (ماهانه).</small>
              </div>

              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">توضیحات تراکنش اشتراک پرو:</label>
                <input type="text" name="proDescription" class="field" style="margin-bottom:0;" value="${settings.proDescription || 'اشتراک ماهانه پرو TokenSaver'}" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">متن نمایشی تراکنش در صفحه پرداخت زرین‌پال.</small>
              </div>

              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">سقف مجاز استفاده پیش‌فرض ابزارها:</label>
                <input type="number" name="defaultUsageLimit" class="field" style="margin-bottom:0;" value="${settings.defaultUsageLimit !== undefined ? settings.defaultUsageLimit : 10}" required>
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">سقف دفعات مجاز استفاده برای ابزارهایی که مقدار اختصاصی برای آن‌ها تعیین نشده است.</small>
              </div>

              <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin:1rem 0;">

              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">شناسه کلاینت گوگل (Google Client ID):</label>
                <input type="text" name="googleClientId" class="field" style="font-family:monospace; margin-bottom:0;" value="${settings.googleClientId || ''}" placeholder="YOUR_GOOGLE_CLIENT_ID">
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">برای فعال‌سازی ورود با اکانت گوگل (Google Auth).</small>
              </div>

              <div>
                <label style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:0.4rem; font-weight: bold;">رمز کلاینت گوگل (Google Client Secret):</label>
                <input type="text" name="googleClientSecret" class="field" style="font-family:monospace; margin-bottom:0;" value="${settings.googleClientSecret || ''}" placeholder="YOUR_GOOGLE_CLIENT_SECRET">
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: block;">استفاده برای تاییدیه امنیتی OAuth در سمت سرور.</small>
              </div>

              <div style="display: flex; align-items: center; gap: 0.8rem; margin-top: 0.5rem;">
                <input type="checkbox" name="zarinpalSandbox" id="zarinpalSandbox" ${settings.zarinpalSandbox ? 'checked' : ''} style="width:18px; height:18px;">
                <label for="zarinpalSandbox" style="font-size:0.85rem; color:#fff; cursor:pointer;">فعال‌سازی محیط تست زرین‌پال (Sandbox Mode)</label>
              </div>
              <small style="color: #f59e0b; font-size: 0.75rem; display: block;">در صورت فعال بودن، تمامی تراکنش‌ها به شبیه‌ساز تست زرین‌پال هدایت می‌شوند.</small>
              
              <button type="submit" class="btn" style="padding: 0.75rem; font-weight: bold; font-size: 0.95rem; background: linear-gradient(120deg, #3b82f6, #8b5cf6); margin-top: 1rem;">ذخیره تنظیمات سیستم ✓</button>
            </form>
          </div>
        </div>
      </div>
      
      <script>
        const ALL_TOOLS = ${JSON.stringify(db.tools).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};

        function switchTab(tabId, btn) {
          document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
          document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
          
          document.getElementById(tabId).classList.add('active');
          btn.classList.add('active');
        }

        function startEditTool(id) {
          const tool = ALL_TOOLS.find(t => t.id === id);
          if (!tool) return;
          
          document.getElementById('form-title').innerText = 'ویرایش روش کاهش مصرف';
          document.getElementById('tool-form').action = '/admin/tools/edit';
          document.getElementById('form-submit-btn').innerText = 'ذخیره تغییرات ✓';
          document.getElementById('form-cancel-btn').style.display = 'block';
          
          const idInput = document.getElementById('form-id');
          idInput.value = tool.id;
          idInput.readOnly = true;
          idInput.style.opacity = '0.6';
          
          document.getElementById('form-name').value = tool.name || '';
          document.getElementById('form-category').value = tool.category || 'compression';
          document.getElementById('form-tagline').value = tool.tagline || '';
          document.getElementById('form-price').value = tool.price || 50000;
          document.getElementById('form-uiUrl').value = tool.uiUrl || '';
          document.getElementById('form-usageLimit').value = tool.usageLimit !== undefined ? tool.usageLimit : 10;
          document.getElementById('form-repo').value = tool.repo || '';
          
          document.getElementById('form-recommended').checked = !!tool.recommended;
          document.getElementById('form-locked').checked = !!tool.locked;
          
          document.getElementById('form-description').value = tool.description || '';
          document.getElementById('form-howItWorks').value = tool.howItWorks || '';
          
          document.getElementById('form-claims').value = tool.claims ? tool.claims.join('\\n') : '';
          document.getElementById('form-notes').value = tool.notes ? tool.notes.join('\\n') : '';
          
          document.getElementById('form-afterInstall').value = tool.afterInstall || '';
          
          document.getElementById('form-installMac').value = (tool.install && tool.install.mac && tool.install.mac.cmd) || '';
          document.getElementById('form-installWin').value = (tool.install && tool.install.win && tool.install.win.cmd) || '';
          document.getElementById('form-installLinux').value = (tool.install && tool.install.linux && tool.install.linux.cmd) || '';
        }

        function cancelEditTool() {
          document.getElementById('form-title').innerText = 'افزودن روش کاهش مصرف جدید';
          document.getElementById('tool-form').action = '/admin/tools/add';
          document.getElementById('form-submit-btn').innerText = 'افزودن ابزار جدید ✓';
          document.getElementById('form-cancel-btn').style.display = 'none';
          
          const idInput = document.getElementById('form-id');
          idInput.value = '';
          idInput.readOnly = false;
          idInput.style.opacity = '1';
          
          document.getElementById('tool-form').reset();
        }

        function toggleRecipientInput(show) {
          const inputDiv = document.getElementById('specific-user-input');
          const inputField = inputDiv.querySelector('input');
          if (show) {
            inputDiv.style.display = 'block';
            inputField.required = true;
            inputField.focus();
          } else {
            inputDiv.style.display = 'none';
            inputField.required = false;
            inputField.value = '';
          }
        }

        // On page load, auto restore active tab from query param
        window.addEventListener('DOMContentLoaded', () => {
          const urlParams = new URLSearchParams(window.location.search);
          const tab = urlParams.get('tab');
          if (tab) {
            const btn = document.querySelector('[onclick*="' + tab + '"]');
            if (btn) {
              switchTab(tab, btn);
            }
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Stop existing listener if port is bound, and listen on PORT
app.listen(PORT, () => {
  loadDb(); // Migrate/initialize database on startup
  console.log(`TokenSaver Server running on http://localhost:${PORT}`);
  console.log(`Zarinpal Mode: ${IS_SANDBOX ? 'SANDBOX' : 'PRODUCTION'}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
