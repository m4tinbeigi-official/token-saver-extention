import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function BlogPost({ lang }) {
  const isFa = lang === 'fa';
  const [contentHtml, setContentHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';
    document.title = isFa 
      ? "راهنمای تخصصی عامل‌های نرم‌افزاری - Token Saver" 
      : "Specialized Guide to Software Agents - Token Saver";
    
    // Fetch and parse markdown file
    fetch('/agent-research-report.md')
      .then(res => {
        if (!res.ok) throw new Error(isFa ? 'خطا در دریافت فایل مقاله' : 'Could not retrieve article file');
        return res.text();
      })
      .then(text => {
        // Strip out citation tags if any
        const cleanedText = text.replace(/cite.*?/g, '');
        setContentHtml(marked.parse(cleanedText));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // Scroll listener for reading progress and scroll-to-top button
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setReadingProgress(progress);
      }
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFa]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ background: '#050508', color: '#e2e8f0', minHeight: '100vh', fontFamily: isFa ? "'Vazirmatn', sans-serif" : 'inherit' }}>
      {/* Reading Progress Bar */}
      <div 
        className="reading-progress" 
        style={{ 
          width: `${readingProgress}%`,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '3px',
          background: 'linear-gradient(to right, #3b82f6, #a78bfa, #10b981)',
          zIndex: 9999,
          transition: 'width 0.1s linear'
        }}
      />

      <Header lang={lang} />

      {/* Scroll to Top */}
      <button 
        className={`scroll-top ${showScrollTop ? 'visible' : ''}`} 
        onClick={scrollToTop} 
        aria-label="Scroll to top"
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: isFa ? '2rem' : 'auto',
          right: isFa ? 'auto' : '2rem',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: showScrollTop ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 100,
          outline: 'none'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 15L12 9L6 15" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="blog-wrapper">
        <div className="blog-container" style={{ direction: isFa ? 'rtl' : 'ltr', textAlign: isFa ? 'right' : 'left' }}>
          {/* Back Button */}
          <Link to={isFa ? '/blog-fa' : '/blog'} className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={isFa ? { transform: 'scaleX(-1)' } : {}}>
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{isFa ? 'بازگشت به وبلاگ' : 'Back to Blog'}</span>
          </Link>

          {/* Reading Meta */}
          <div className="reading-meta">
            <span className="reading-badge">{isFa ? '📖 گزارش پژوهشی' : '📖 Research Report'}</span>
            <span className="reading-badge">{isFa ? '🕐 مطالعه ۱۵ دقیقه‌ای' : '🕐 15 Min Read'}</span>
            <span className="reading-badge">{isFa ? '🤖 عامل‌های هوشمند' : '🤖 AI Agents'}</span>
            <span className="reading-badge">{isFa ? '🛡️ بهینه‌سازی توکن' : '🛡️ Token Saver'}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
              {isFa ? 'در حال بارگذاری محتوای مقاله...' : 'Loading article content...'}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <h2 style={{ color: '#ef4444' }}>{isFa ? 'خطا در بارگذاری مقاله' : 'Error Loading Article'}</h2>
              <p style={{ color: '#94a3b8', marginTop: '1rem' }}>{error}</p>
            </div>
          ) : (
            <div 
              className="prose" 
              dangerouslySetInnerHTML={{ __html: contentHtml }} 
              style={{ width: '100%' }}
            />
          )}
        </div>
      </div>

      <Footer lang={lang} />
    </div>
  );
}
