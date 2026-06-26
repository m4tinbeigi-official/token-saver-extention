import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Tutorial({ lang }) {
  const isFa = lang === 'fa';
  const [contentHtml, setContentHtml] = useState('');
  const [tocList, setTocList] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';
    document.title = isFa 
      ? "آموزش جامع Token Saver - کاهش رایگان توکن" 
      : "Token Saver - Comprehensive Free Tutorial";

    // Fetch and parse tutorial markdown
    fetch('/deep-research-report.md')
      .then(res => {
        if (!res.ok) throw new Error(isFa ? 'خطا در دریافت فایل آموزش' : 'Could not retrieve tutorial file');
        return res.text();
      })
      .then(text => {
        // Clean citations
        const cleanedText = text.replace(/cite.*?/g, '');
        const rawHtml = marked.parse(cleanedText);
        
        // Dynamically parse headings h2/h3 and generate TOC
        let headingIndex = 0;
        const toc = [];
        
        // We parse headings and inject ids dynamically
        const processedHtml = rawHtml.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (match, level, innerText) => {
          headingIndex++;
          const id = `sec-${headingIndex}`;
          const cleanText = innerText.replace(/<[^>]+>/g, '').trim();
          toc.push({ id, text: cleanText, level: Number(level) });
          return `<h${level} id="${id}">${innerText}</h${level}>`;
        });
        
        // Wrap tables in scrollable divs
        const finalHtml = processedHtml.replace(/<table>([\s\S]*?)<\/table>/g, 
          '<div class="table-wrap"><table>$1</table></div>');

        setTocList(toc);
        setContentHtml(finalHtml);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [isFa]);

  // Handle active heading highlighting and scroll progress bar
  useEffect(() => {
    if (loading || tocList.length === 0) return;

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Setup intersection observer for table of contents active highlighting
    const headings = tocList.map(item => document.getElementById(item.id)).filter(Boolean);
    const observerOptions = {
      rootMargin: '-80px 0px -70% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    }, observerOptions);

    headings.forEach(h => observer.observe(h));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      headings.forEach(h => observer.unobserve(h));
    };
  }, [loading, tocList]);

  return (
    <div style={{ background: '#050508', color: '#e2e8f0', minHeight: '100vh', fontFamily: isFa ? "'Vazirmatn', sans-serif" : 'inherit' }}>
      {/* Top Scroll Progress Bar */}
      <div 
        className="scroll-progress" 
        style={{ 
          width: `${scrollProgress}%`,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '3px',
          background: 'linear-gradient(to right, #3b82f6, #a78bfa, #10b981)',
          zIndex: 9999,
          transition: 'width-0.1s-linear'
        }}
      />

      <Header lang={lang} />

      <main style={{ paddingBottom: '5rem' }}>
        {/* Tutorial Hero */}
        <section className="section tutorial-hero" style={{ padding: '8rem 2rem 4rem 2rem', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-bg-grid"></div>
          <div className="hero-radial-glow"></div>
          <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
            <h1 className="hero-title" style={{ fontSize: '2.8rem', fontWeight: 800 }}>
              {isFa ? <>آموزش <span style={{ color: '#8b5cf6' }}>جامع و رایگان</span></> : <>Comprehensive <span style={{ color: '#8b5cf6' }}>Free Tutorial</span></>}
            </h1>
            <p className="hero-subtitle" style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '1.1rem' }}>
              {isFa 
                ? 'خودتان معماری بهینه را پیاده‌سازی کنید. نیازی به پرداخت هزینه نیست اگر دانش فنی دارید.'
                : 'Implement the optimal token saving architecture yourself. Free for developers.'}
            </p>
          </div>
        </section>

        {/* Tutorial Body Layout */}
        <section className="section tutorial-body" style={{ padding: '2rem 2rem 0 2rem' }}>
          <div className="container-wide tutorial-layout" style={{ display: 'flex', gap: '2rem', maxWidth: '1400px', margin: '0 auto', flexDirection: isFa ? 'row-reverse' : 'row' }}>
            
            {/* TOC Sidebar */}
            <aside className="toc-sidebar" style={{ width: '280px', flexShrink: 0 }}>
              <div className="toc-inner" style={{ position: 'sticky', top: '90px', padding: '1.5rem', background: 'rgba(15,15,20,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', maxHeading: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                <div className="toc-title" style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', textAlign: isFa ? 'right' : 'left' }}>
                  {isFa ? 'فهرست مطالب' : 'Table of Contents'}
                </div>
                <ul className="toc-list" style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: isFa ? 'right' : 'left' }}>
                  {tocList.map(item => (
                    <li 
                      key={item.id} 
                      className={`toc-l${item.level}`} 
                      style={{ 
                        marginBottom: '0.6rem',
                        paddingInlineStart: item.level === 3 ? '1rem' : '0' 
                      }}
                    >
                      <a 
                        href={`#${item.id}`} 
                        className={activeId === item.id ? 'active' : ''}
                        style={{ 
                          color: activeId === item.id ? '#60a5fa' : '#64748b', 
                          fontWeight: activeId === item.id ? 'bold' : 'normal',
                          textDecoration: 'none',
                          fontSize: '0.9rem',
                          transition: 'color 0.2s ease',
                          display: 'block'
                        }}
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Prose Content Card */}
            <article className="glass-card prose" style={{ flexGrow: 1, padding: '3rem', background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', direction: isFa ? 'rtl' : 'ltr', textAlign: isFa ? 'right' : 'left' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                  {isFa ? 'در حال بارگذاری محتوای آموزش...' : 'Loading tutorial content...'}
                </div>
              ) : error ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <h2 style={{ color: '#ef4444' }}>{isFa ? 'خطا در بارگذاری محتوا' : 'Error Loading Content'}</h2>
                  <p style={{ color: '#94a3b8', marginTop: '1rem' }}>{error}</p>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
              )}
            </article>
            
          </div>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
