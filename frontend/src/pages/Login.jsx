import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const langParam = searchParams.get('lang');
  const isFa = langParam ? langParam === 'fa' : true; // Default to Farsi
  const redirectUrl = searchParams.get('redirect') || '/';

  // Tabs: 'user-otp', 'user-google', 'admin'
  const [activeTab, setActiveTab] = useState('user-otp');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // User OTP State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Admin Credentials State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Forgot Password State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Terminal Typing Animation State
  const [terminalLines, setTerminalLines] = useState([]);

  // Terminal animation steps
  const terminalLogSteps = [
    { type: 'cmd', text: 'tokensaver --monitor' },
    { type: 'info', text: '[sys] Initializing TokenSaver Local Monitoring Daemon v1.2.0' },
    { type: 'info', text: '[sys] Proxy server listening on http://127.0.0.1:8085' },
    { type: 'info', text: '[mcp] Tree-sitter initialized. Parsing workspace directory...' },
    { type: 'success', text: '[mcp] Completed. 842 symbols, functions, and models indexed.' },
    { type: 'info', text: '[cli] Agent request received: "Refactor Order Validation"' },
    { type: 'warning', text: '[proxy] Context block contains 14 identical file reads.' },
    { type: 'success', text: '[proxy] Compressing files: 48.2KB -> 4.1KB (91.5% saved)' },
    { type: 'success', text: '[sys] Local vector caching utilized. 14,200 tokens cached.' },
    { type: 'info', text: '[cli] Forwarding request to Claude-3.5-Sonnet...' },
    { type: 'success', text: '[sys] Saved $0.43 token budget for current prompt.' },
    { type: 'cmd', text: 'git status' }
  ];

  // OTP Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Terminal simulation logic
  useEffect(() => {
    let index = 0;
    const addNextLine = () => {
      if (index < terminalLogSteps.length) {
        setTerminalLines(prev => [...prev, terminalLogSteps[index]]);
        index++;
        setTimeout(addNextLine, index % 2 === 0 ? 1500 : 800);
      } else {
        // Loop back
        setTimeout(() => {
          setTerminalLines([]);
          index = 0;
          addNextLine();
        }, 4000);
      }
    };
    addNextLine();
  }, []);

  // Send OTP handler (Users)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber || !/^09\d{9}$/.test(phoneNumber)) {
      setErrorMsg(isFa ? 'شماره موبایل معتبر وارد کنید (مثال: 09123456789)' : 'Enter a valid mobile number (e.g. 09123456789)');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setOtpLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      setOtpLoading(false);

      if (data.ok) {
        setOtpSent(true);
        setCountdown(120); // 2 minutes countdown
        setSuccessMsg(isFa ? 'کد تایید با موفقیت ارسال شد.' : 'OTP verification code sent.');
      } else {
        setErrorMsg(data.error || (isFa ? 'خطا در ارسال کد تایید' : 'Failed to send OTP'));
      }
    } catch (err) {
      setOtpLoading(false);
      setErrorMsg(isFa ? 'خطا در اتصال به سرور' : 'Connection error');
    }
  };

  // Verify OTP handler (Users)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setErrorMsg(isFa ? 'کد تایید را وارد کنید' : 'Please enter verification code');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setOtpLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: otpCode })
      });
      const data = await res.json();
      setOtpLoading(false);

      if (data.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSuccessMsg(isFa ? 'ورود با موفقیت انجام شد!' : 'Login successful!');
        setTimeout(() => {
          navigate(redirectUrl);
        }, 1000);
      } else {
        setErrorMsg(data.error || (isFa ? 'کد تایید نادرست است' : 'Invalid OTP code'));
      }
    } catch (err) {
      setOtpLoading(false);
      setErrorMsg(isFa ? 'خطا در ارتباط با سرور' : 'Connection error');
    }
  };

  // Google Login handler
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || (isFa ? 'سرویس گوگل در حال حاضر در دسترس نیست' : 'Google Auth is unavailable'));
      }
    } catch (err) {
      setErrorMsg(isFa ? 'خطا در ارتباط با سرور' : 'Connection error');
    }
  };

  // Admin login handler
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setErrorMsg(isFa ? 'نام کاربری و رمز عبور را وارد کنید' : 'Please fill all fields');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setAdminLoading(true);

    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      const data = await res.json();
      setAdminLoading(false);

      if (data.ok) {
        setSuccessMsg(isFa ? 'خوش آمدید مدیر گرامی! در حال انتقال...' : 'Welcome admin! Redirecting...');
        setTimeout(() => {
          window.location.href = data.redirect || '/admin';
        }, 1000);
      } else {
        setErrorMsg(data.error || (isFa ? 'مشخصات ورود نادرست است' : 'Invalid credentials'));
      }
    } catch (err) {
      setAdminLoading(false);
      setErrorMsg(isFa ? 'خطا در اتصال به سرور' : 'Connection error');
    }
  };

  // Send admin forgot password OTP
  const handleAdminForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier) {
      setErrorMsg(isFa ? 'شماره موبایل یا ایمیل مدیریت را وارد کنید' : 'Enter admin email or phone number');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier })
      });
      const data = await res.json();
      setForgotLoading(false);

      if (data.ok) {
        setForgotOtpSent(true);
        setSuccessMsg(data.message || (isFa ? 'کد بازیابی ارسال شد.' : 'Recovery OTP sent.'));
      } else {
        setErrorMsg(data.error || (isFa ? 'مشخصات نادرست است' : 'Identifier not found'));
      }
    } catch (err) {
      setForgotLoading(false);
      setErrorMsg(isFa ? 'خطا در اتصال به سرور' : 'Connection error');
    }
  };

  // Reset admin password with OTP
  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotOtpCode || !newPassword) {
      setErrorMsg(isFa ? 'کد بازیابی و رمز جدید را وارد کنید' : 'Please fill all fields');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier: forgotIdentifier, 
          code: forgotOtpCode, 
          newPassword: newPassword 
        })
      });
      const data = await res.json();
      setForgotLoading(false);

      if (data.ok) {
        setSuccessMsg(isFa ? 'پسورد مدیریت با موفقیت تغییر یافت!' : 'Admin password reset successfully!');
        setIsForgotMode(false);
        setForgotOtpSent(false);
        setForgotIdentifier('');
        setForgotOtpCode('');
        setNewPassword('');
      } else {
        setErrorMsg(data.error || (isFa ? 'کد تایید نادرست یا منقضی شده است' : 'Invalid or expired OTP'));
      }
    } catch (err) {
      setForgotLoading(false);
      setErrorMsg(isFa ? 'خطا در ارتباط با سرور' : 'Connection error');
    }
  };

  return (
    <div style={{ background: '#050508', color: '#e2e8f0', minHeight: '100vh', fontFamily: isFa ? "'Vazirmatn', sans-serif" : 'inherit' }}>
      <Header lang={isFa ? 'fa' : 'en'} />
      
      <div className="login-page-container">
        <div className="login-bg-glow"></div>
        <div className="login-bg-glow-2"></div>

        {/* Left Side: Dynamic Interactive Form Card */}
        <div className="login-form-side">
          <div className="login-card" style={{ direction: isFa ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '2.5rem' }}>
              <span style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontFamily: 'monospace',
                background: 'linear-gradient(120deg, #3b82f6, #8b5cf6 55%, #10b981)',
                color: '#fff',
                fontSize: '1.2rem'
              }}>T</span>
              <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800, color: '#fff' }}>
                {isFa ? 'ورود به' : 'Access'} <span style={{ background: 'linear-gradient(120deg, #3b82f6, #8b5cf6 55%, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Token Saver</span>
              </h1>
            </div>

            {errorMsg && <div className="login-message error">{errorMsg}</div>}
            {successMsg && <div className="login-message success">{successMsg}</div>}

            {isForgotMode ? (
              /* Forgot Password Form */
              <div>
                <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                  {isFa ? 'بازیابی رمز عبور مدیریت' : 'Reset Admin Password'}
                </h3>
                
                {!forgotOtpSent ? (
                  <form onSubmit={handleAdminForgotSubmit}>
                    <div className="login-input-group">
                      <label className="login-input-label">{isFa ? 'شماره موبایل یا ایمیل مدیریت' : 'Admin Email or Phone'}</label>
                      <input 
                        type="text" 
                        className="login-input" 
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder={isFa ? 'مثال: admin@tokensaver.ir' : 'e.g. admin@tokensaver.ir'} 
                        required 
                        autoFocus
                      />
                    </div>
                    <button type="submit" className="login-btn-primary" disabled={forgotLoading}>
                      {forgotLoading ? (isFa ? 'در حال ارسال...' : 'Sending...') : (isFa ? 'ارسال کد بازیابی' : 'Send Recovery OTP')}
                    </button>
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                      <span className="login-forgot-link" onClick={() => { setIsForgotMode(false); setErrorMsg(''); setSuccessMsg(''); }}>
                        {isFa ? '← بازگشت به صفحه ورود' : '← Back to Login'}
                      </span>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleAdminResetPassword}>
                    <div className="login-input-group">
                      <label className="login-input-label">{isFa ? 'کد تایید ۶ رقمی' : '6-Digit Verification Code'}</label>
                      <input 
                        type="text" 
                        className="login-input" 
                        value={forgotOtpCode}
                        onChange={(e) => setForgotOtpCode(e.target.value)}
                        placeholder="123456" 
                        maxLength={6}
                        required 
                        autoFocus
                      />
                    </div>
                    <div className="login-input-group">
                      <label className="login-input-label">{isFa ? 'کلمه عبور جدید' : 'New Password'}</label>
                      <input 
                        type="password" 
                        className="login-input" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••" 
                        required 
                      />
                    </div>
                    <button type="submit" className="login-btn-primary" disabled={forgotLoading}>
                      {forgotLoading ? (isFa ? 'در حال تغییر...' : 'Resetting...') : (isFa ? 'تغییر کلمه عبور' : 'Reset Password')}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Main Login Tabs and Forms */
              <>
                <div className="login-tabs">
                  <button 
                    className={`login-tab-btn ${activeTab === 'user-otp' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('user-otp'); setErrorMsg(''); setSuccessMsg(''); }}
                  >
                    {isFa ? 'ورود سریع (پیامک)' : 'Fast Login (OTP)'}
                  </button>
                  <button 
                    className={`login-tab-btn ${activeTab === 'user-google' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('user-google'); setErrorMsg(''); setSuccessMsg(''); }}
                  >
                    {isFa ? 'گوگل' : 'Google'}
                  </button>
                  <button 
                    className={`login-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('admin'); setErrorMsg(''); setSuccessMsg(''); }}
                  >
                    {isFa ? 'پنل مدیریت' : 'Admin'}
                  </button>
                </div>

                {activeTab === 'user-otp' && (
                  /* USER SMS OTP LOGIN FORM */
                  <div>
                    {!otpSent ? (
                      <form onSubmit={handleSendOtp}>
                        <div className="login-input-group">
                          <label className="login-input-label">{isFa ? 'شماره موبایل' : 'Mobile Number'}</label>
                          <input 
                            type="tel" 
                            className="login-input" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="09123456789" 
                            required 
                          />
                        </div>
                        <button type="submit" className="login-btn-primary" disabled={otpLoading}>
                          {otpLoading ? (isFa ? 'در حال ارسال...' : 'Sending...') : (isFa ? 'دریافت کد تایید' : 'Send OTP Code')}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp}>
                        <div className="login-input-group">
                          <label className="login-input-label">{isFa ? 'کد تایید ۶ رقمی ارسال شده' : '6-Digit Verification Code'}</label>
                          <input 
                            type="text" 
                            className="login-input" 
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="123456" 
                            maxLength={6}
                            required 
                            autoFocus
                          />
                        </div>
                        <button type="submit" className="login-btn-primary" disabled={otpLoading}>
                          {otpLoading ? (isFa ? 'در حال تایید...' : 'Verifying...') : (isFa ? 'تایید و ورود' : 'Verify & Login')}
                        </button>
                        
                        <div style={{ marginTop: '1.2rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                          {countdown > 0 ? (
                            <span>{isFa ? `امکان ارسال مجدد تا ${countdown} ثانیه دیگر` : `Resend available in ${countdown}s`}</span>
                          ) : (
                            <span 
                              style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }} 
                              onClick={handleSendOtp}
                            >
                              {isFa ? 'ارسال مجدد کد تایید' : 'Resend OTP code'}
                            </span>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {activeTab === 'user-google' && (
                  /* USER GOOGLE OAUTH LOGIN TAB */
                  <div style={{ padding: '1.5rem 0', textAlignment: 'center' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                      {isFa 
                        ? 'در صورتی که در خارج از کشور سکونت دارید یا تمایل به استفاده از حساب گوگل دارید، می‌توانید از دکمه زیر اقدام کنید.' 
                        : 'If you reside abroad or prefer to log in directly with your Google account, click the button below.'}
                    </p>
                    <button className="login-btn-google" onClick={handleGoogleLogin}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span>{isFa ? 'ورود با حساب گوگل' : 'Sign in with Google'}</span>
                    </button>
                  </div>
                )}

                {activeTab === 'admin' && (
                  /* ADMIN USERNAME/PASSWORD LOGIN FORM */
                  <form onSubmit={handleAdminLogin}>
                    <div className="login-input-group">
                      <label className="login-input-label">{isFa ? 'نام کاربری / موبایل مدیریت' : 'Admin Username'}</label>
                      <input 
                        type="text" 
                        className="login-input" 
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder={isFa ? 'مثال: admin' : 'e.g. admin'} 
                        required 
                      />
                    </div>
                    <div className="login-input-group">
                      <label className="login-input-label">{isFa ? 'کلمه عبور' : 'Password'}</label>
                      <input 
                        type="password" 
                        className="login-input" 
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••" 
                        required 
                      />
                    </div>
                    <button type="submit" className="login-btn-primary" disabled={adminLoading}>
                      {adminLoading ? (isFa ? 'در حال ورود...' : 'Logging in...') : (isFa ? 'ورود به پنل مدیریت' : 'Access Admin Panel')}
                    </button>
                    
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                      <span className="login-forgot-link" onClick={() => { setIsForgotMode(true); setErrorMsg(''); setSuccessMsg(''); }}>
                        {isFa ? 'فراموشی رمز عبور مدیریت؟' : 'Forgot admin password?'}
                      </span>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Simulated Typed Terminal Window */}
        <div className="login-terminal-side">
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dots">
                <div className="terminal-dot red"></div>
                <div className="terminal-dot yellow"></div>
                <div className="terminal-dot green"></div>
              </div>
              <div className="terminal-title">bash - tokensaver --monitor</div>
            </div>
            <div className="terminal-body">
              {terminalLines.map((line, idx) => (
                <div key={idx} className={`terminal-line ${line.type}`}>
                  {line.type === 'cmd' ? (
                    <>
                      <span className="terminal-prompt">$</span>
                      <span className="terminal-command">{line.text}</span>
                    </>
                  ) : (
                    <span>{line.text}</span>
                  )}
                </div>
              ))}
              <span className="terminal-cursor"></span>
            </div>
          </div>
        </div>

      </div>

      <Footer lang={isFa ? 'fa' : 'en'} />
    </div>
  );
}
