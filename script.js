document.addEventListener('DOMContentLoaded', () => {
    // 1. Sticky Header
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 1a. Download: detect OS and highlight the matching button + copy mac fix
    (function () {
        const ua = navigator.userAgent || '';
        const platform = navigator.platform || '';
        const isMac = /Mac/i.test(platform) || /Mac OS X/i.test(ua);
        const isWin = /Win/i.test(platform) || /Windows/i.test(ua);
        const winBtn = document.getElementById('dl-win');
        const macBtn = document.getElementById('dl-mac');
        const primary = (el) => { if (el) { el.classList.add('btn-primary', 'glow-btn'); el.classList.remove('btn-secondary'); } };
        if (isMac) primary(macBtn);
        else if (isWin) primary(winBtn);
        else { primary(winBtn); } // default emphasis

        const cmd = document.getElementById('mac-fix-cmd');
        const hint = document.getElementById('copy-hint');
        if (cmd) {
            cmd.addEventListener('click', () => {
                navigator.clipboard.writeText(cmd.textContent.trim()).then(() => {
                    if (hint) { hint.textContent = 'کپی شد ✓'; setTimeout(() => { hint.textContent = 'برای کپی کلیک کن'; }, 2000); }
                });
            });
        }
    })();

    // 1b. Scroll progress bar
    const progressBar = document.getElementById('scroll-progress');
    const updateProgress = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        if (progressBar) progressBar.style.width = pct + '%';
    };
    window.addEventListener('scroll', updateProgress);
    updateProgress();

    // 1c. Cursor-following spotlight on glass cards
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
            card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
        });
    });

    // 2. Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const nav = document.getElementById('nav');
    const navLinks = document.querySelectorAll('.nav-list a');

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        nav.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            nav.classList.remove('active');
        });
    });

    // 3. Smooth Scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for sticky header
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Scroll Animations (Intersection Observer)
    const fadeElements = document.querySelectorAll('.fade-in-up');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // observer.unobserve(entry.target); // Optional: uncomment to animate only once
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => {
        fadeObserver.observe(el);
    });

    // 5. Number Counter Animation (Impact section) — supports decimals
    const animateCount = (stat) => {
        const target = parseFloat(stat.getAttribute('data-target'));
        const decimals = parseInt(stat.getAttribute('data-decimals') || '0', 10);
        const duration = 1600;
        const start = performance.now();
        const easeOut = t => 1 - Math.pow(1 - t, 3);

        const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const value = target * easeOut(p);
            stat.textContent = value.toFixed(decimals);
            if (p < 1) requestAnimationFrame(tick);
            else stat.textContent = target.toFixed(decimals);
        };
        requestAnimationFrame(tick);
    };

    const statsObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number').forEach(el => statsObserver.observe(el));

    // 5b. Terminal: play line-reveal + count token numbers when in view
    const countTo = (el) => {
        const target = parseFloat(el.getAttribute('data-target'));
        const useComma = el.getAttribute('data-comma') === '1';
        const duration = 1400;
        const start = performance.now();
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const fmt = n => useComma ? Math.round(n).toLocaleString('en-US') : String(Math.round(n));
        const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            el.textContent = fmt(target * easeOut(p));
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = fmt(target);
        };
        requestAnimationFrame(tick);
    };

    const terminal = document.querySelector('.terminal-mockup');
    if (terminal) {
        const termObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    terminal.classList.add('playing');
                    setTimeout(() => {
                        terminal.querySelectorAll('.term-count').forEach(countTo);
                    }, 500);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        termObserver.observe(terminal);
    }

    // 5c. Before/after comparison chart — animate bar widths on reveal
    const chart = document.getElementById('compare-chart');
    if (chart) {
        chart.querySelectorAll('.chart-bar').forEach(bar => {
            bar.style.setProperty('--w', (bar.getAttribute('data-pct') || 0) + '%');
        });
        const chartObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        chartObserver.observe(chart);
    }

    // 6. FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-btn');
        btn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(faq => {
                faq.classList.remove('active');
                faq.querySelector('.faq-content').style.maxHeight = null;
            });

            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
                const content = item.querySelector('.faq-content');
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

});
