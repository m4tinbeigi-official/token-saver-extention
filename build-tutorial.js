const fs = require('fs');
const { marked } = require('marked');

// Read the markdown file
let mdContent = fs.readFileSync('deep-research-report.md', 'utf-8');

// Strip out citations like citeturn...
mdContent = mdContent.replace(/cite.*?/g, '');

// Convert to HTML
const htmlContent = marked.parse(mdContent);

// Template for tutorial.html
const template = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>آموزش Token Saver - کاهش توکن‌ها رایگان</title>
    <meta name="description" content="آموزش جامع متن‌باز برای کاهش توکن و هزینه در کار با مدل‌های ابری.">
    <meta name="theme-color" content="#050508">

    <!-- Favicon (inline SVG) -->
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%233b82f6'/%3E%3Cstop offset='1' stop-color='%2310b981'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='8' fill='%23050508'/%3E%3Cpath d='M16 5l8 4v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V9l8-4z' fill='none' stroke='url(%23g)' stroke-width='2'/%3E%3Ctext x='16' y='21' font-size='11' font-family='monospace' font-weight='bold' fill='url(%23g)' text-anchor='middle'%3ET%3C/text%3E%3C/svg%3E">

    <!-- Persian webfont -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="styles.css">
    
    <!-- Mermaid script for rendering diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
      if (window.mermaid) {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { fontFamily: 'Vazirmatn' } });
      }
    </script>
</head>
<body>
    <div class="scroll-progress" id="scroll-progress"></div>
    <header class="header" id="header" style="background: rgba(5,5,8,0.9); backdrop-filter: blur(12px);">
        <div class="container header-container">
            <div class="logo">
                <a href="index.html">Token Saver</a>
            </div>
            <nav class="nav" id="nav">
                <ul class="nav-list">
                    <li><a href="index.html#problem">مشکل</a></li>
                    <li><a href="index.html#solution">راهکار</a></li>
                    <li><a href="index.html#services">خدمات</a></li>
                    <li><a href="index.html#pricing">قیمت</a></li>
                    <li><a href="tutorial.html" class="active">آموزش رایگان</a></li>
                </ul>
            </nav>
            <div class="header-actions">
                <a href="index.html#contact" class="btn btn-primary">درخواست Token Audit</a>
                <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="منو">
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                </button>
            </div>
        </div>
    </header>

    <main>
        <section class="section tutorial-hero">
            <div class="hero-bg-grid"></div>
            <div class="hero-radial-glow"></div>
            <div class="container text-center fade-in-up">
                <h1 class="hero-title">آموزش <span>جامع و رایگان</span></h1>
                <p class="hero-subtitle mb-8">خودتان معماری بهینه را پیاده‌سازی کنید. نیازی به پرداخت هزینه نیست اگر دانش فنی دارید.</p>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="glass-card prose">
                    ${htmlContent}
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container footer-container">
            <div class="footer-brand">
                <div class="logo">Token Saver</div>
                <p>زیرساخت سبک‌تر برای AI Coding Agents؛ توکن کمتر، context تمیزتر، هزینه قابل‌کنترل‌تر.</p>
            </div>
            <div class="footer-links">
                <a href="https://t.me/m4tinbeigipv" target="_blank" rel="noopener" class="footer-link">ارتباط در تلگرام</a>
            </div>
        </div>
        <div class="footer-bottom text-center">
            <p>&copy; 2026 Token Saver. تمامی حقوق محفوظ است.</p>
        </div>
    </footer>

    <script src="script.js"></script>
    <script>
      // Convert mermaid code blocks to mermaid divs, then render them
      document.addEventListener('DOMContentLoaded', () => {
        const blocks = document.querySelectorAll('pre code.language-mermaid');
        blocks.forEach(block => {
          const pre = block.parentElement;
          const mermaidDiv = document.createElement('div');
          mermaidDiv.className = 'mermaid';
          mermaidDiv.textContent = block.textContent;
          pre.replaceWith(mermaidDiv);
        });
        if (window.mermaid && document.querySelector('.mermaid')) {
          try { mermaid.run({ querySelector: '.mermaid' }); } catch (e) { console.warn('mermaid render skipped:', e); }
        }
      });
    </script>
</body>
</html>`;

fs.writeFileSync('tutorial.html', template);
console.log('tutorial.html generated successfully.');
