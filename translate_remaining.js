const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const translations = {
  'تاثیرات <span>ملموس</span> در سیستم شما': '<span>Tangible</span> Impacts on Your System',
  'نتایج زیر بسته به پروژه و در workflowهای پرنویز متغیر است': 'The following results vary depending on the project and noisy workflows',
  'کاهش توکن خروجی در workflowهای پرنویز': 'Reduction in output tokens in noisy workflows',
  'کاهش خواندن تکراری فایل‌ها با code graph': 'Reduction in duplicate file reads with code graph',
  'جستجوی دقیق‌تر کد به جای پویش کور': 'More accurate code search instead of blind scanning',
  'کاهش هزینه‌های تکراری پردازش context': 'Reduction in recurring context processing costs',
  'مصرف توکن یک سشن تست (نمونه واقعی)': 'Token usage of a test session (real example)',
  'قبل': 'Before',
  'بعد': 'After',
  'خروجی npm test': 'npm test output',
  'context هر سشن': 'context per session',
  'خواندن تکراری فایل': 'duplicate file reading',
  '* اعداد، میانگین‌های مشاهده‌شده در workflowهای پرنویز هستند و بسته به پروژه متغیرند؛ نتیجه واقعی پس از Audit مشخص می‌شود.': '* Numbers are averages observed in noisy workflows and vary by project; real impact is determined after an Audit.',
  'مراحل <span>همکاری</span>': '<span>Collaboration</span> Steps',
  'بررسی وضعیت فعلی مصرف و گلوگاه‌ها': 'Review current usage and bottlenecks',
  'طراحی Stack': 'Stack Design',
  'انتخاب بهترین ابزارها متناسب با نیاز تیم': 'Select the best tools for your team needs',
  'راه‌اندازی': 'Implementation',
  'پیاده‌سازی و استقرار راهکارهای بهینه‌سازی': 'Implement and deploy optimization solutions',
  'پایش': 'Monitoring',
  'نظارت مستمر و بهبود فرآیندها در طول زمان': 'Continuous monitoring and process improvement over time',
  'دانش فنی دارید؟ <span>رایگان انجام دهید!</span>': 'Have technical knowledge? <span>Do it for Free!</span>',
  'شما ملزم به استفاده از خدمات پولی ما نیستید. اگر دانش فنی دارید، می‌توانید با استفاده از آموزش جامع ما، تمام این بهینه‌سازی‌ها را خودتان پیاده‌سازی کنید.': 'You are not obligated to use our paid services. If you have technical knowledge, you can implement all these optimizations yourself using our comprehensive guide.',
  'مشاهده آموزش جامع و رایگان': 'View Comprehensive Free Guide',
  'پلن‌های <span>سرمایه‌گذاری</span>': '<span>Investment</span> Plans',
  'اگر دانش فنی دارید، با تهیه ابزار خودتان راه بیندازید؛ در غیر این صورت ما کامل برایتان مستقر می‌کنیم.': 'If you have technical skills, download the tool and set it up yourself; otherwise, we will deploy it fully for you.',
  'نرم‌افزار سلف‌سرویس': 'Self-Service Software',
  'رایگان': 'Free',
  'برای همه — دانلود برای ویندوز و مک': 'For everyone — Download for Windows and Mac',
  'نصب خودکار ابزارهای کاهش توکن': 'Auto-install token reduction tools',
  'راهنمای گام‌به‌گام رایگان': 'Free step-by-step guide',
  'متن‌باز و local-first': 'Open-source and local-first',
  'دانلود رایگان': 'Free Download',
  'پیشنهاد ویژه': 'Special Offer',
  'راه‌اندازی حرفه‌ای': 'Professional Setup',
  'میلیون تومان': 'Million Tomans',
  'استقرار کامل توسط ما': 'Full deployment by us',
  'Audit کامل Workflow و گزارش نشت توکن': 'Full Workflow Audit and token leak report',
  'راه‌اندازی Output Compression': 'Output Compression Setup',
  'تنظیم Prompt Caching': 'Prompt Caching Configuration',
  'بهینه‌سازی IDEها': 'IDE Optimization',
  'درخواست راه‌اندازی': 'Request Setup',
  'راه‌اندازی تیمی': 'Team Setup',
  'استقرار سازمانی + پشتیبانی اختصاصی': 'Enterprise deployment + dedicated support',
  'تمام ویژگی‌های پلن حرفه‌ای': 'All professional plan features',
  'راه‌اندازی Agent Memory': 'Agent Memory Setup',
  'پیاده‌سازی Codebase Graph': 'Codebase Graph Implementation',
  'پشتیبانی و پایش اختصاصی': 'Dedicated support and monitoring',
  'سوالات <span>متداول</span>': '<span>Frequently</span> Asked Questions',
  'Token Saver دقیقا چه کار می‌کند؟': 'What exactly does Token Saver do?',
  'ما با استفاده از ابزارها و استراتژی‌های مدرن، میزان توکن مصرفی توسط AI agents شما را بهینه‌سازی می‌کنیم تا ضمن حفظ کیفیت کدهای تولیدی، هزینه‌های شما کاهش یابد.': 'Using modern tools and strategies, we optimize the token usage of your AI agents to reduce costs while maintaining code generation quality.',
  'چقدر کاهش هزینه خواهیم داشت؟': 'How much cost reduction will we see?',
  'نتیجه واقعی بعد از Audit مشخص می‌شود، اما بسته به نوع پروژه‌ها و Workflow فعلی تیم شما، می‌توانیم مصرف توکن‌های غیرضروری را در بعضی خروجی‌های پرنویز تا حد قابل‌توجهی کاهش دهیم.': 'Real results are determined after an Audit, but depending on your projects and current Workflow, we can significantly reduce unnecessary tokens in noisy outputs.',
  'آیا کیفیت خروجی هوش مصنوعی افت می‌کند؟': 'Will AI output quality degrade?',
  'خیر. هدف ما کاهش context غیرضروری است، نه حذف اطلاعات مهم. در واقع با حذف نویزها، ارائه ساختار گرافیکال کدبیس و ایجاد حافظه بلندمدت، دقت پاسخ‌دهی ایجنت‌ها افزایش می‌یابد زیرا context مرتبط‌تری دریافت می‌کنند.': 'No. Our goal is to reduce unnecessary context, not delete important info. By removing noise, graphing the codebase, and creating long-term memory, agent accuracy actually increases because they receive more relevant context.',
  'نحوه شروع همکاری چگونه است؟': 'How do we start cooperating?',
  'فرآیند از یک Audit یا بررسی اولیه شروع می‌شود تا گلوگاه‌های سازمان شما شناسایی شده و سپس معماری مناسب پیشنهاد گردد.': 'The process starts with an Audit or initial review to identify bottlenecks in your organization, and then the appropriate architecture is proposed.',
  'آماده بهینه‌سازی هزینه‌های AI خود هستید؟': 'Ready to optimize your AI costs?',
  'همین حالا در تلگرام به ما پیام بدهید تا درخواست Audit شما را ثبت کنیم.': 'Send us a message on Telegram right now to register your Audit request.',
  'درخواست Audit در تلگرام': 'Request Audit via Telegram',
  'زیرساخت سبک‌تر برای AI Coding Agents؛': 'Lighter infrastructure for AI Coding Agents;',
  'ارتباط در تلگرام': 'Contact on Telegram',
  'تمامی حقوق محفوظ است.': 'All rights reserved.'
};

for (const [fa, en] of Object.entries(translations)) {
  html = html.replace(new RegExp(fa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en);
}

// Convert numbers in index.html to English numerals
html = html.replace(/۱۵/g, '15')
           .replace(/۳۰/g, '30')
           .replace(/۱۸,۲۴۰/g, '18,240')
           .replace(/۴,۱۲۰/g, '4,120')
           .replace(/۱۰۰٪/g, '100%')
           .replace(/۴۲٪/g, '42%')
           .replace(/۴۲/g, '42')
           .replace(/۷/g, '7')
           .replace(/۱/g, '1')
           .replace(/۲/g, '2')
           .replace(/۳/g, '3')
           .replace(/۴/g, '4');

fs.writeFileSync('index.html', html);
console.log('Remaining Persian text translated.');
