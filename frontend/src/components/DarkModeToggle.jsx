import React, { useEffect, useState } from 'react';

const DarkModeToggle = () => {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('dark-mode');
    return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
    localStorage.setItem('dark-mode', enabled);
  }, [enabled]);

  const toggle = () => setEnabled(!enabled);

  return (
    <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
      {enabled ? '🌙' : '☀️'}
    </button>
  );
};

export default DarkModeToggle;
