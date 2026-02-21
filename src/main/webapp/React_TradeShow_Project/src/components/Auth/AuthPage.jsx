import { useState } from 'react';
import {
  MdVisibility,
  MdVisibilityOff,
  MdMail,
  MdPerson,
  MdLock,
  MdSecurity,
  MdArrowForward
} from 'react-icons/md';
import AuthStyles from '../../styles/Auth.module.css';
import { buildUrl, parseApiResponse, unwrapData } from '../../services/api';
import pulseLogo from '../../assets/pulse24x7-logo.png';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordStrength = getPasswordStrength(password);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
  };

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Full name is required.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password and confirm password do not match.');
        return;
      }
      if (!acceptedTerms) {
        setError('Please agree to Terms and Privacy Policy.');
        return;
      }
    }
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
      <div className={AuthStyles.topBrand}>
        <>
          <div className={AuthStyles.logoBadge}>
            <img src={pulseLogo} alt="Pulse24x7 logo" className={AuthStyles.brandLogo} />
          </div>
          <h1>Pulse24x7</h1>
          <p>Secure access to your agentic infrastructure.</p>
        </>
      </div>

      <div className={AuthStyles.card}>
        <div className={AuthStyles.header}>
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Your Account'}</h2>
          <p>{mode === 'login' ? 'Sign in to continue with Pulse24x7 platform.' : 'Experience the next generation of cloud management.'}</p>
        </div>

        <form
          className={AuthStyles.form}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {mode === 'signup' ? (
            <div className={AuthStyles.fieldBlock}>
              <label>FULL NAME</label>
              <div className={AuthStyles.fieldWrap}>
                <MdPerson className={AuthStyles.fieldIcon} />
                <input
                  className={AuthStyles.input}
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className={AuthStyles.fieldBlock}>
            <label>EMAIL ADDRESS</label>
            <div className={AuthStyles.fieldWrap}>
              <MdMail className={AuthStyles.fieldIcon} />
              <input
                className={AuthStyles.input}
                placeholder="name@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {mode === 'login' ? (
            <div className={AuthStyles.fieldBlock}>
              <div className={AuthStyles.labelRow}>
                <label>PASSWORD</label>
                <button type="button" className={AuthStyles.ghostLink}>Forgot Password?</button>
              </div>
              <div className={AuthStyles.fieldWrap}>
                <MdLock className={AuthStyles.fieldIcon} />
                <input
                  className={AuthStyles.input}
                  placeholder="••••••••"
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
            </div>
          ) : (
            <div className={AuthStyles.passwordGrid}>
              <div className={AuthStyles.fieldBlock}>
                <label>PASSWORD</label>
                <div className={AuthStyles.fieldWrap}>
                  <MdLock className={AuthStyles.fieldIcon} />
                  <input
                    className={AuthStyles.input}
                    placeholder="••••••••"
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
              </div>

              <div className={AuthStyles.fieldBlock}>
                <label>CONFIRM</label>
                <div className={AuthStyles.fieldWrap}>
                  <MdSecurity className={AuthStyles.fieldIcon} />
                  <input
                    className={AuthStyles.input}
                    placeholder="••••••••"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className={AuthStyles.eyeBtn}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'signup' ? (
            <>
              <div className={AuthStyles.strengthRow}>
                {[0, 1, 2, 3].map((barIndex) => (
                  <span
                    key={barIndex}
                    className={`${AuthStyles.strengthBar} ${barIndex < passwordStrength.level ? AuthStyles.strengthBarActive : ''}`}
                    style={barIndex < passwordStrength.level ? { background: passwordStrength.color } : undefined}
                  ></span>
                ))}
                <span className={AuthStyles.strengthText} style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
              <label className={AuthStyles.termsRow}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>I agree to the <button type="button" className={AuthStyles.inlineLink}>Terms and Conditions</button> and <button type="button" className={AuthStyles.inlineLink}>Privacy Policy</button>.</span>
              </label>
            </>
          ) : null}

          {error ? <div className={AuthStyles.error}>{error}</div> : null}

          <button type="submit" className={AuthStyles.btn} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : <>Create Account <MdArrowForward /></>}
          </button>
        </form>

        <p className={AuthStyles.switchRow}>
          {mode === 'login' ? 'Don\'t have an account?' : 'Already have an account?'}
          <button type="button" className={AuthStyles.switchLink} onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>

      <div className={AuthStyles.footerBadges}>
        <span><MdSecurity /> API FIRST</span>
        <span><MdSecurity /> ENCRYPTED</span>
        <span><MdSecurity /> GLOBAL EDGE</span>
      </div>
    </div>
  );
}

function getPasswordStrength(password) {
  const input = String(password || '');
  if (!input) {
    return { level: 0, label: 'EMPTY', color: '#7388b0' };
  }

  let score = 0;
  if (input.length >= 8) score += 1;
  if (input.length >= 12) score += 1;
  if (/[A-Z]/.test(input) && /[a-z]/.test(input)) score += 1;
  if (/\d/.test(input)) score += 1;
  if (/[^A-Za-z0-9]/.test(input)) score += 1;

  if (score <= 1) {
    return { level: 1, label: 'WEAK', color: '#f97316' };
  }
  if (score <= 3) {
    return { level: 2, label: 'MEDIUM', color: '#f59e0b' };
  }
  if (score === 4) {
    return { level: 3, label: 'STRONG', color: '#3b82f6' };
  }
  return { level: 4, label: 'SECURE', color: '#22c55e' };
}
