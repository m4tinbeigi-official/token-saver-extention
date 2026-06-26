import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer({ lang }) {
  const isFa = lang === 'fa';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '2rem 0', background: '#050508', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
      <div className="container">
        <p style={{ margin: 0 }}>
          {isFa ? (
            <>
              © {currentYear} تمامی حقوق محفوظ است. طراحی شده توسط <Link to="/fa" style={{ color: '#3b82f6', textDecoration: 'none' }}>Token Saver</Link>.
            </>
          ) : (
            <>
              © {currentYear} All rights reserved. Powered by <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Token Saver</Link>.
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
