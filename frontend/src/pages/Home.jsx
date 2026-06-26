import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const LOCALES = {
  en: {
    free_badge: "Free and Open Source for all",
    hero_title: "Optimize Token Consumption for",
    hero_title_span: "AI Coding Agents",
    hero_subtitle: "Fewer tokens, cleaner context, controllable costs. Token Saver configures your workspace so you don't pay double for repeated codebase reads, huge CLI logs, and context bloating.",
    download_win: "Download for Windows (.exe)",
    download_mac: "Download for macOS (.dmg)",
    download_win_sub: "Executable installer",
    download_mac_sub: "For Intel & Apple Silicon",
    
    problem_title: "The Problem",
    problem_subtitle: "AI Agents are smart, but they waste millions of tokens on context rot.",
    problem_c1_t: "Huge Logs",
    problem_c1_d: "Build outputs and terminal logs are sent repeatedly, bloating the context window.",
    problem_c2_t: "Duplicate Files",
    problem_c2_d: "Identical files are read in every query, causing exponential token cost.",
    problem_c3_t: "Forgetting",
    problem_c3_d: "Agents forget previous decisions and session history, forcing you to re-explain.",
    problem_c4_t: "No Prompt Caching",
    problem_c4_d: "Vast files are read without leverage, ignoring provider caching mechanisms.",
    problem_c5_t: "Cost Opacity",
    problem_c5_d: "No clear visibility on which tools consume how many tokens, leading to budget shock.",
    
    solution_title: "The Solution",
    solution_subtitle: "A lightweight local layer that cleans and compresses context.",
    solution_c1_t: "Output Compression",
    solution_c1_d: "Filters noisy logs and minifies compiler errors before they reach the model.",
    solution_c2_t: "Codebase Graph",
    solution_c2_d: "Creates structure graph indexes so agents only query relevant code, not full crawls.",
    solution_c3_t: "Long-Term Memory",
    solution_c3_d: "Persists cross-session instructions and past bug fixes in local vector files.",
    
    pricing_title: "Pricing Plans",
    pricing_self: "Self-Service",
    pricing_pro: "Professional Setup",
    pricing_team: "Team License",
    pricing_self_price: "Free / Open-Source",
    pricing_pro_price: "199,000 Tomans / mo",
    pricing_team_price: "Custom Enterprise",
    pricing_self_desc: "Download the desktop client and install recommended tools locally.",
    pricing_pro_desc: "Unlocks advanced local proxy, automatic backup, and premium compression MCPs.",
    pricing_team_desc: "Tailored project constitution, local vector DB, and dedicated token audit.",
    
    cta_title: "Ready to Optimize your LLM Budget?",
    cta_desc: "We analyze your project context and CLI workflows to reduce token consumption by up to 60%.",
    cta_btn: "Request a Token Audit via Telegram",
    
    agents_title: "Support for the best",
    agents_title_span: "AI Coding Agents",
    agents_desc: "The Token Saver infrastructure works with all terminal or editor agents.",
    works_badge: "Works with all IDEs"
  },
  fa: {
    free_badge: "رایگان و متن‌باز برای همه",
    hero_title: "کاهش مصرف توکن ابزارهای",
    hero_title_span: "برنامه‌نویسی هوش مصنوعی",
    hero_subtitle: "توکن کمتر، زمینه تمیزتر، هزینه قابل‌کنترل‌تر. توکن‌سیور فضای پروژه شما را طوری پیکربندی می‌کند که برای فایل‌های تکراری، لاگ‌های حجیم ترمینال و کانتکست متورم هزینه دوبار نپردازید.",
    download_win: "دانلود نسخه ویندوز (.exe)",
    download_mac: "دانلود نسخه مکینتاش (.dmg)",
    download_win_sub: "نصب آسان و سریع",
    download_mac_sub: "سازگار با اینتل و اپل سیلیکون",
    
    problem_title: "مشکل",
    problem_subtitle: "عامل‌های هوش مصنوعی باهوش هستند، اما توکن‌های زیادی را روی نویز هدر می‌دهند.",
    problem_c1_t: "لاگ‌های حجیم",
    problem_c1_d: "خروجی‌های ترمینال و لاگ‌های تست‌ها مکرراً ارسال شده و کانتکست را پر می‌کنند.",
    problem_c2_t: "فایل‌های تکراری",
    problem_c2_d: "فایل‌های ثابت در هر کوئری دوباره خوانده می‌شوند و هزینه را تصاعدی می‌کنند.",
    problem_c3_t: "فراموشی حافظه",
    problem_c3_d: "عامل‌ها تصمیمات قبلی را فراموش می‌کنند و نیاز به یادآوری مجدد دارند.",
    problem_c4_t: "عدم استفاده از کش",
    problem_c4_d: "فایل‌های بزرگ بدون استفاده از کش پرامپت ارائه‌دهندگان خوانده می‌شوند.",
    problem_c5_t: "عدم شفافیت هزینه",
    problem_c5_d: "مشخص نیست کدام ابزار چه مقدار توکن مصرف می‌کند و بودجه از دست می‌رود.",
    
    solution_title: "راهکار",
    solution_subtitle: "یک لایه محلی سبک که کانتکست ارسالی را پاک‌سازی و فشرده می‌کند.",
    solution_c1_t: "فشرده‌سازی خروجی",
    solution_c1_d: "لاگ‌های تکراری را فیلتر کرده و خطاهای کامپایلر را قبل از ارسال کوتاه می‌کند.",
    solution_c2_t: "گراف ساختاری پروژه",
    solution_c2_d: "به جای فرستادن کل فایل‌ها، یک نقشه مفهومی از کدها می‌سازد.",
    solution_c3_t: "حافظه بلندمدت",
    solution_c3_d: "دستورالعمل‌های جلسات قبلی و راه‌حل باگ‌ها را در فایل برداری ذخیره می‌کند.",
    
    pricing_title: "طرح‌های اشتراک",
    pricing_self: "نسخه خود-سرویس",
    pricing_pro: "نسخه حرفه‌ای (Pro)",
    pricing_team: "نسخه سازمانی / تیمی",
    pricing_self_price: "رایگان / متن‌باز",
    pricing_pro_price: "۱۹۹,۰۰۰ تومان / ماه",
    pricing_team_price: "تماس بگیرید",
    pricing_self_desc: "دانلود نرم‌افزار دسکتاپ و نصب مستقیم ابزارهای متن‌باز روی پروژه‌ها.",
    pricing_pro_desc: "فعال‌سازی پروکسی مانیتورینگ محلی، بکاپ خودکار و ابزارهای فشرده‌ساز پیشرفته پرو.",
    pricing_team_desc: "تدوین قوانین اختصاصی پروژه، پایگاه داده برداری لوکال و ممیزی اختصاصی توکن.",
    
    cta_title: "آماده‌اید هزینه‌های هوش مصنوعی را کاهش دهید؟",
    cta_desc: "ما کانتکست پروژه و جریان‌های ترمینال شما را ممیزی می‌کنیم تا مصرف توکن تا ۶۰٪ کاهش یابد.",
    cta_btn: "درخواست ممیزی رایگان توکن در تلگرام",
    
    agents_title: "پشتیبانی از بهترین",
    agents_title_span: "عامل‌های برنامه‌نویسی",
    agents_desc: "زیرساخت Token Saver با تمامی ابزارهای ترمینال و ادیتورها هماهنگ است.",
    works_badge: "هماهنگ با تمامی IDEها"
  }
};

const PARTNERS = [
  { id: 'claude', name: 'Claude Code', desc: 'Full CLI compatibility', descFa: 'سازگاری کامل با CLI' },
  { id: 'cursor', name: 'Cursor', desc: 'Composer optimization', descFa: 'بهینه‌سازی Composer' },
  { id: 'antigravity', name: 'Antigravity', desc: 'Sandboxed support', descFa: 'پشتیبانی از محیط ایزوله' },
  { id: 'aider', name: 'Aider', desc: 'Git context management', descFa: 'مدیریت Git Context' },
  { id: 'copilot', name: 'GitHub Copilot', desc: 'Works with VS Code', descFa: 'هماهنگ با VS Code' },
  { id: 'windsurf', name: 'Windsurf', desc: 'Cascades compression', descFa: 'فشرده‌سازی Cascades' },
  { id: 'cline', name: 'Cline / RooCode', desc: 'Tool cost control', descFa: 'کنترل هزینه ابزارها' },
  { id: 'gemini', name: 'Gemini / Codex CLI', desc: 'Terminal log optimization', descFa: 'بهینه‌سازی لاگ‌ها' }
];

export default function Home({ lang }) {
  const isFa = lang === 'fa';
  const t = LOCALES[lang];
  const [stats, setStats] = useState({ usersCount: 12450, projectsCount: 8120 });

  useEffect(() => {
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';
    document.title = isFa ? "Token Saver - کاهش هزینه ابزارهای هوش مصنوعی" : "Token Saver - AI Token Optimization";
    
    // Fetch live platform stats
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setStats({
            usersCount: data.usersCount,
            projectsCount: data.projectsCount
          });
        }
      })
      .catch(err => console.error('Error fetching stats:', err));
  }, [isFa]);

  return (
    <div style={{ background: '#050508', color: '#e2e8f0', minHeight: '100vh', fontFamily: isFa ? "'Vazirmatn', sans-serif" : 'inherit' }}>
      <Header lang={lang} />
      
      {/* Hero Section */}
      <section className="hero" id="hero" style={{ padding: '8rem 2rem 5rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div className="hero-bg-grid"></div>
        <div className="hero-radial-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <span className="badge badge-purple" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>{t.free_badge}</span>
          <h1 className="hero-title" style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', lineHeight: 1.3 }}>
            {t.hero_title} <span style={{ background: 'linear-gradient(to right, #60a5fa, #a78bfa, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.hero_title_span}</span>
          </h1>
          <p className="hero-subtitle" style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '800px', margin: '0 auto 3rem auto', lineHeight: 1.8 }}>
            {t.hero_subtitle}
          </p>
          
          <div className="hero-cta" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/m4tinbeigi-official/tokensaver/releases" className="btn btn-primary" style={{ padding: '1rem 2rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold' }}>
              {t.download_mac}
              <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.8, fontWeight: 'normal', marginTop: '0.2rem' }}>{t.download_mac_sub}</span>
            </a>
            <a href="https://github.com/m4tinbeigi-official/tokensaver/releases" className="btn btn-secondary" style={{ padding: '1rem 2rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold' }}>
              {t.download_win}
              <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.8, fontWeight: 'normal', marginTop: '0.2rem' }}>{t.download_win_sub}</span>
            </a>
          </div>

          {/* Live Stats Row */}
          <div className="live-stats-row">
            <div className="live-stat-card">
              <div className="live-stat-number">{stats.usersCount.toLocaleString()}</div>
              <div className="live-stat-label">{isFa ? 'کاربر فعال' : 'Active Users'}</div>
            </div>
            <div className="live-stat-card">
              <div className="live-stat-number">{stats.projectsCount.toLocaleString()}</div>
              <div className="live-stat-label">{isFa ? 'پروژه بهینه‌سازی‌شده' : 'Optimized Projects'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported AI Agents / Partners Section */}
      <section className="section" id="supported-agents" style={{ padding: '4rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-purple" style={{ marginBottom: '1rem', display: 'inline-block' }}>{t.works_badge}</span>
            <h2 className="section-title" style={{ fontSize: '2rem', color: '#fff', fontWeight: 800 }}>
              {t.agents_title} <span style={{ color: '#8b5cf6' }}>{t.agents_title_span}</span>
            </h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>{t.agents_desc}</p>
          </div>
          
          <div className="agents-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {PARTNERS.map(p => (
              <div key={p.id} className="agent-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(15,15,20,0.5)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '12px' }}>
                <img className={`agent-icon ${p.id}`} src={`/assets/partners/${p.id}.svg`} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'contain', padding: '6px', boxSizing: 'border-box' }} />
                <div className="agent-info">
                  <h3 style={{ fontSize: '1.05rem', color: '#fff', margin: 0, fontWeight: 700 }}>{p.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>{isFa ? p.descFa : p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="section" id="problem" style={{ padding: '5rem 2rem', background: '#050508' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2rem', color: '#fff', fontWeight: 800 }}>{t.problem_title}</h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>{t.problem_subtitle}</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div className="card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>{t.problem_c1_t}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>{t.problem_c1_d}</p>
            </div>
            <div className="card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>{t.problem_c2_t}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>{t.problem_c2_d}</p>
            </div>
            <div className="card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>{t.problem_c3_t}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>{t.problem_c3_d}</p>
            </div>
            <div className="card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>{t.problem_c4_t}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>{t.problem_c4_d}</p>
            </div>
            <div className="card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>{t.problem_c5_t}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>{t.problem_c5_d}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="section bg-darker" id="solution" style={{ padding: '5rem 2rem', background: 'rgba(10,10,15,0.5)', borderTop: '1px solid rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2rem', color: '#fff', fontWeight: 800 }}>{t.solution_title}</h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>{t.solution_subtitle}</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            <div className="card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
              <h3 style={{ color: '#10b981', fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 700 }}>{t.solution_c1_t}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>{t.solution_c1_d}</p>
            </div>
            <div className="card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
              <h3 style={{ color: '#3b82f6', fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 700 }}>{t.solution_c2_t}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>{t.solution_c2_d}</p>
            </div>
            <div className="card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
              <h3 style={{ color: '#a78bfa', fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 700 }}>{t.solution_c3_t}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>{t.solution_c3_d}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section" id="pricing" style={{ padding: '5rem 2rem' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2rem', color: '#fff', fontWeight: 800 }}>{t.pricing_title}</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div className="pricing-card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
              <h3 style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>{t.pricing_self}</h3>
              <div style={{ fontSize: '1.8rem', color: '#fff', fontWeight: 800, margin: '1rem 0' }}>{t.pricing_self_price}</div>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.7, flexGrow: 1 }}>{t.pricing_self_desc}</p>
              <a href="https://github.com/m4tinbeigi-official/tokensaver/releases" className="btn btn-ghost" style={{ marginTop: '2rem', width: '100%', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>{isFa ? 'دانلود نرم‌افزار' : 'Download Now'}</a>
            </div>
            
            <div className="pricing-card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.8)', border: '1px solid #8b5cf6', borderRadius: '16px', display: 'flex', flexDirection: 'column', minHeight: '380px', position: 'relative', boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)' }}>
              <span style={{ position: 'absolute', top: '1rem', left: '1rem', background: '#8b5cf6', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>{isFa ? 'پیشنهادی' : 'Recommended'}</span>
              <h3 style={{ color: '#a78bfa', fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>{t.pricing_pro}</h3>
              <div style={{ fontSize: '1.8rem', color: '#fff', fontWeight: 800, margin: '1rem 0' }}>{t.pricing_pro_price}</div>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.7, flexGrow: 1 }}>{t.pricing_pro_desc}</p>
              <Link to="/login" className="btn btn-primary" style={{ marginTop: '2rem', width: '100%', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', textDecoration: 'none', display: 'block' }}>{isFa ? 'خرید اشتراک Pro' : 'Get Pro'}</Link>
            </div>
            
            <div className="pricing-card" style={{ padding: '2.5rem', background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
              <h3 style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>{t.pricing_team}</h3>
              <div style={{ fontSize: '1.8rem', color: '#fff', fontWeight: 800, margin: '1rem 0' }}>{t.pricing_team_price}</div>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.7, flexGrow: 1 }}>{t.pricing_team_desc}</p>
              <a href="#contact" className="btn btn-secondary" style={{ marginTop: '2rem', width: '100%', padding: '0.8rem', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', textDecoration: 'none', display: 'block' }}>{isFa ? 'ارتباط با ما' : 'Contact Us'}</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Contact Section */}
      <section className="section cta-section" id="contact" style={{ padding: '6rem 2rem', background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%)', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.2rem', color: '#fff', fontWeight: 800, marginBottom: '1.5rem' }}>{t.cta_title}</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.15rem', marginBottom: '3rem', lineHeight: 1.7 }}>{t.cta_desc}</p>
          <a href="https://t.me/tokensaver_support" className="btn btn-primary" style={{ padding: '1.2rem 2.5rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(59,130,246,0.2)' }}>
            {t.cta_btn}
          </a>
        </div>
      </section>

      <Footer lang={lang} />
    </div>
  );
}
