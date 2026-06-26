import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Header({ lang }) {
  const isFa = lang === 'fa';
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (e, targetId) => {
    const isHomePage = location.pathname === '/' || location.pathname === '/fa';
    if (isHomePage) {
      e.preventDefault();
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="header" id="header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
      <div className="container header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="logo">
          <Link to={isFa ? "/fa" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <span style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontFamily: 'monospace',
              background: 'linear-gradient(120deg, #3b82f6, #8b5cf6 55%, #10b981)',
              color: '#fff',
              fontSize: '1.1rem'
            }}>T</span>
            <span style={{
              background: 'linear-gradient(120deg, #3b82f6, #8b5cf6 55%, #10b981)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}>Token Saver</span>
          </Link>
        </div>
        
        <nav className="nav" id="nav">
          <ul className="nav-list" style={{ display: 'flex', listStyle: 'none', gap: '1.5rem', margin: 0, padding: 0 }}>
            {isFa ? (
              <>
                <li><a href="#download" onClick={(e) => handleNavClick(e, 'download')} className="text-green">دانلود رایگان</a></li>
                <li><a href="#problem" onClick={(e) => handleNavClick(e, 'problem')}>مشکل</a></li>
                <li><a href="#solution" onClick={(e) => handleNavClick(e, 'solution')}>راهکار</a></li>
                <li><a href="#services" onClick={(e) => handleNavClick(e, 'services')}>خدمات</a></li>
                <li><a href="#tools" onClick={(e) => handleNavClick(e, 'tools')}>ابزارها</a></li>
                <li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')}>قیمت</a></li>
                <li><Link href="/blog-fa" to="/blog-fa" className="text-blue">وبلاگ</Link></li>
                <li style={{ marginRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1rem' }}>
                  <Link href="/" to="/" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>EN</Link>
                </li>
              </>
            ) : (
              <>
                <li><a href="#download" onClick={(e) => handleNavClick(e, 'download')} className="text-green">Download</a></li>
                <li><a href="#problem" onClick={(e) => handleNavClick(e, 'problem')}>Problem</a></li>
                <li><a href="#solution" onClick={(e) => handleNavClick(e, 'solution')}>Solution</a></li>
                <li><a href="#services" onClick={(e) => handleNavClick(e, 'services')}>Services</a></li>
                <li><a href="#tools" onClick={(e) => handleNavClick(e, 'tools')}>Tools</a></li>
                <li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')}>Pricing</a></li>
                <li><Link href="/blog" to="/blog" className="text-blue">Blog</Link></li>
                <li style={{ marginLeft: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                  <Link href="/fa" to="/fa" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>FA</Link>
                </li>
              </>
            )}
            <li style={isFa ? { marginRight: '0.8rem' } : { marginLeft: '0.8rem' }}>
              <Link to="/login" className="header-login-btn">
                {isFa ? 'ورود / ثبت‌نام' : 'Login / Signup'}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
