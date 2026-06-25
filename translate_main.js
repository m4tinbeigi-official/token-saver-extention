const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// HTML language attrs
html = html.replace('lang="fa"', 'lang="en"').replace('dir="rtl"', 'dir="ltr"');
html = html.replace('زیرساخت سبک‌تر برای AI Coding Agents', 'Lighter Infrastructure for AI Coding Agents');
html = html.replace(/توکن کمتر، context تمیزتر، هزینه قابل‌کنترل‌تر/g, 'Fewer tokens, cleaner context, controllable costs');

// Navbar
html = html.replace('دانلود رایگان', 'Free Download');
html = html.replace('>مشکل<', '>Problem<');
html = html.replace('>راهکار<', '>Solution<');
html = html.replace('>خدمات<', '>Services<');
html = html.replace('>ابزارها<', '>Tools<');
html = html.replace('>قیمت<', '>Pricing<');
html = html.replace('آموزش رایگان', 'Blog');
html = html.replace('tutorial.html', 'blog.html');
html = html.replace('درخواست Token Audit', 'Request Token Audit');

// Add Language Switcher to EN
html = html.replace('<li><a href="blog.html">Blog</a></li>', '<li><a href="blog.html">Blog</a></li>\n                    <li style="margin-left: 1.5rem; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 1.5rem;"><a href="fa.html" style="font-family: monospace; font-size: 0.9rem;">فا</a></li>');

// Hero Section
html = html.replace('قبل از خرید مدل گران‌تر، مصرف توکن را <span>بهینه کنید</span>', 'Optimize token usage <span>before upgrading</span> your model');
html = html.replace('Token Saver workflow ابزارهایی مثل Claude Code، Cursor، Windsurf، Codex CLI و Gemini CLI را بررسی و بهینه می‌کند تا لاگ‌های پرنویز، خواندن تکراری فایل‌ها، context overload و هزینه‌های پنهان کاهش پیدا کند.', 'Token Saver optimizes workflows for Claude Code, Cursor, Windsurf, Codex, and Gemini by reducing noisy logs, duplicate file reads, context overload, and hidden costs.');
html = html.replace('دانلود رایگان نرم‌افزار', 'Download Software Free');
html = html.replace('روش کار را ببینید', 'See How It Works');
html = html.replace('نتایج بسته به پروژه و در بعضی workflowهای پرنویز متفاوت است. هدف ما کاهش context غیرضروری است، نه حذف اطلاعات مهم. نتیجه واقعی بعد از Audit مشخص می‌شود.', 'Results vary based on the project. Our goal is to reduce unnecessary context without removing important information. Real impact is determined after an Audit.');

// Problem section
html = html.replace('مشکل کجاست؟', 'What is the problem?');
html = html.replace('مدل‌های AI برنامه‌نویس روزبه‌روز باهوش‌تر می‌شوند، اما هم‌زمان در تله‌ی <strong>«توهم کانتکست»</strong> و <strong>«مصرف تصاعدی توکن»</strong> می‌افتند. وقتی به Agent می‌گویید', 'AI coding models are getting smarter, but simultaneously falling into the trap of <strong>Context Illusion</strong> and <strong>Exponential Token Usage</strong>. When you tell the Agent to:');
html = html.replace('پروژه را تست و خطایابی کن', 'Test and debug the project');
html = html.replace('بجای خواندن لاگ‌های مفید، هزاران توکن از Warnings و خروجی‌های بی‌ارزش را می‌خوانند که هم هزینه را بالا می‌برد و هم تمرکز مدل را به هم می‌زند.', 'Instead of reading useful logs, it consumes thousands of tokens on warnings and useless outputs, driving up costs and breaking focus.');

// Metrics
html = html.replace('هزینه پنهان', 'Hidden Cost');
html = html.replace('دلار ماهانه هدررفت در فایل‌های غیرضروری', 'Dollars wasted monthly on unnecessary files');
html = html.replace('افت کیفیت', 'Quality Drop');
html = html.replace('کاهش دقت در پنجره‌های کانتکست بلند', 'Accuracy drop in long context windows');
html = html.replace('زمان پاسخ', 'Response Time');
html = html.replace('ثانیه تأخیر برای خواندن لاگ‌های خام', 'Seconds delay for reading raw logs');

// Writing back
fs.writeFileSync('index.html', html);
console.log('Main landing page translated to English.');
