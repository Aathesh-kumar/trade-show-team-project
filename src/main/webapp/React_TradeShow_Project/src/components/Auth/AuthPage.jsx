import { useState } from 'react';
import { MdVisibility, MdVisibilityOff, MdMail, MdPerson, MdLock } from 'react-icons/md';
import AuthStyles from '../../styles/Auth.module.css';
import { buildUrl, parseApiResponse, unwrapData } from '../../services/api';
import pulseLogo from '../../assets/pulse24x7-logo.png';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/user-auth/login' : '/user-auth/signup';
      const payload = mode === 'login'
        ? { email, password }
        : { fullName, email, password };
      const response = await fetch(buildUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await parseApiResponse(response);
      const data = unwrapData(body);
      if (!data?.token) {
        throw new Error('Auth token missing in response');
      }
      localStorage.setItem('mcp_jwt', data.token);
      onAuthenticated?.(data.user);
    } catch (e) {
      const isNetwork = e?.message?.includes('Failed to fetch') || e?.message?.includes('NetworkError');
      setError(isNetwork ? 'Backend is not reachable. Start Tomcat/backend service and try again.' : (e.message || 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={AuthStyles.authPage}>
      <div className={AuthStyles.bgOrbA}></div>
      <div className={AuthStyles.bgOrbB}></div>

      <div className={AuthStyles.authLayout}>
        <aside className={AuthStyles.brandPanel}>
          <div className={AuthStyles.brandHeader}>
            <img src={pulseLogo} alt="Pulse24x7 logo" className={AuthStyles.brandLogo} />
            <h2>Pulse24x7</h2>
          </div>
          <h1>Live Monitoring That Feels Instant</h1>
          <p>Securely manage Pulse24x7 servers, test tools, and replay requests with a single workspace.</p>
          <div className={AuthStyles.highlightRow}>
            <span>Unified Logs</span>
            <span>Dynamic Tool Testing</span>
            <span>Smart Server Control</span>
          </div>
          <svg className={AuthStyles.vectorGraph} viewBox="0 0 500 240" role="img" aria-label="Pulse timeline">
            <defs>
              <linearGradient id="lineA" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#36c2ff" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>
            <path d="M20 130 H100 L140 90 L180 160 L220 70 L260 170 L300 110 L340 145 L380 120 H470" fill="none" stroke="url(#lineA)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="220" cy="70" r="8" fill="#67e8f9" />
            <circle cx="300" cy="110" r="8" fill="#67e8f9" />
            <circle cx="380" cy="120" r="8" fill="#67e8f9" />
          </svg>
          <svg className={AuthStyles.vectorNodes} viewBox="0 0 560 160" role="img" aria-label="Connected services">
            <defs>
              <linearGradient id="nodesLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <path d="M30 80 H160 L220 40 L300 120 L390 50 L530 50" stroke="url(#nodesLine)" strokeWidth="4" fill="none" />
            <circle cx="30" cy="80" r="9" fill="#34d399" />
            <circle cx="160" cy="80" r="9" fill="#38bdf8" />
            <circle cx="220" cy="40" r="9" fill="#34d399" />
            <circle cx="300" cy="120" r="9" fill="#38bdf8" />
            <circle cx="390" cy="50" r="9" fill="#34d399" />
            <circle cx="530" cy="50" r="9" fill="#38bdf8" />
          </svg>
        </aside>

        <div className={AuthStyles.card}>
          <div className={AuthStyles.header}>
            <h1>{mode === 'login' ? 'Welcome Back' : 'Create Your Account'}</h1>
            <p>Sign in to continue with Pulse24x7 platform.</p>
          </div>
          <div className={AuthStyles.tabs}>
            <button
              type="button"
              className={`${AuthStyles.tab} ${mode === 'login' ? AuthStyles.tabActive : ''}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`${AuthStyles.tab} ${mode === 'signup' ? AuthStyles.tabActive : ''}`}
              onClick={() => setMode('signup')}
            >
              Signup
            </button>
          </div>
          <form
            className={AuthStyles.form}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {mode === 'signup' && (
              <div className={AuthStyles.fieldWrap}>
                <MdPerson className={AuthStyles.fieldIcon} />
                <input
                  className={AuthStyles.input}
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            <div className={AuthStyles.fieldWrap}>
              <MdMail className={AuthStyles.fieldIcon} />
              <input
                className={AuthStyles.input}
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={AuthStyles.fieldWrap}>
              <MdLock className={AuthStyles.fieldIcon} />
              <input
                className={AuthStyles.input}
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={AuthStyles.eyeBtn}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
            {error && <div className={AuthStyles.error}>{error}</div>}
            <button type="submit" className={AuthStyles.btn} disabled={loading}>
              {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
