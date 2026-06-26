import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Blog({ lang }) {
  const isFa = lang === 'fa';

  useEffect(() => {
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';
    document.title = isFa ? "وبلاگ مهندسی Token Saver" : "Token Saver - Engineering Blog";
  }, [isFa]);

  return (
    <div style={{ background: '#050508', color: '#e2e8f0', minHeight: '100vh', fontFamily: isFa ? "'Vazirmatn', sans-serif" : 'inherit' }}>
      <Header lang={lang} />
      
      <div className="blog-index-wrapper">
        <div className="blog-header">
          <h1>{isFa ? 'وبلاگ مهندسی Token Saver' : 'Engineering Blog'}</h1>
          <p>
            {isFa 
              ? 'تحلیل‌های فنی، معماری عمیق و راهنماهای بهینه‌سازی مصرف توکن برای عامل‌های هوش مصنوعی' 
              : 'Insights, architecture deep-dives, and tutorials on AI Coding Agents'}
          </p>
        </div>

        {/* Featured Post Card */}
        <Link to="/blog/agent-research-report" className="featured-post">
          <div className="featured-image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="featured-content" style={{ direction: isFa ? 'rtl' : 'ltr', textAlign: isFa ? 'right' : 'left' }}>
            <div className="post-meta">
              {isFa ? 'گزارش پژوهشی • مطالعه ۱۵ دقیقه‌ای' : 'Research Report • 15 Min Read'}
            </div>
            <h2>
              {isFa 
                ? 'راهنمای تخصصی عامل‌های نرم‌افزاری (AI Agents) و بهینه‌سازی مصرف کانتکست' 
                : 'Specialized Guide to Software Agents (AI Agents) and Context Optimization'}
            </h2>
            <p className="excerpt">
              {isFa 
                ? 'در عصر مدل‌های زبانی بزرگ، "Agentها" از دستیاران ساده به موجودیت‌های نیمه‌مستقل تبدیل شده‌اند که قادر به انجام وظایف پیچیده فنی هستند. در این گزارش عمیق به بررسی معماری‌هایی مثل ReAct، لایه‌های حافظه و گراف کدبیس پرداخته می‌شود.'
                : 'In the era of LLMs, software agents have evolved into semi-autonomous entities capable of complex engineering. This deep-dive report explores ReAct architectures, memory layers, and codebase indexing.'}
            </p>
            <div className="read-more">
              <span>{isFa ? 'مطالعه کامل گزارش پژوهشی' : 'Read the Full Report'}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={isFa ? { transform: 'scaleX(-1)' } : {}}>
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </Link>
      </div>

      <Footer lang={lang} />
    </div>
  );
}
