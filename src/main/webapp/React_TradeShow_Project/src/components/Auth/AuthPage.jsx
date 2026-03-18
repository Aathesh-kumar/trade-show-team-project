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
import { API_BASE, buildUrl, parseApiResponse, unwrapData } from '../../services/api';
const pulseLogo = '/Logo.svg';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', acceptedTerms: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [zohoLoading, setZohoLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState('email');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const passwordStrength = getPasswordStrength(signupForm.password);
  const forgotPasswordStrength = getPasswordStrength(forgotNewPassword);
  const apiOrigin = (() => {
    try {
      return new URL(API_BASE).origin;
    } catch {
      return '';
    }
  })();

  const isLoginMode = mode === 'login';
  const isSignupMode = mode === 'signup';
  const isForgotMode = mode === 'forgot';
  const currentEmail = isLoginMode ? loginForm.email : signupForm.email;
  const currentPassword = isLoginMode ? loginForm.password : signupForm.password;

  const resetForgotFlow = ({ keepEmail = false } = {}) => {
    if (!keepEmail) {
      setForgotEmail('');
    }
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotStep('email');
    setShowForgotNewPassword(false);
    setShowForgotConfirmPassword(false);
    setForgotMessage('');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setLoginForm({ email: '', password: '' });
    setSignupForm({ fullName: '', email: '', password: '', confirmPassword: '', acceptedTerms: false });
    setShowPassword(false);
    setShowConfirmPassword(false);
    resetForgotFlow();
  };

  const submit = async () => {
    setError('');
    if (!currentEmail.trim() || !currentPassword) {
      setError('Email and password are required.');
      return;
    }
    if (isSignupMode) {
      if (!signupForm.fullName.trim()) {
        setError('Full name is required.');
        return;
      }
      if (!isPasswordPolicyValid(signupForm.password)) {
        setError('Password must be 8+ chars with uppercase, lowercase, and special character.');
        return;
      }
      if (signupForm.password !== signupForm.confirmPassword) {
        setError('Password and confirm password do not match.');
        return;
      }
      if (!signupForm.acceptedTerms) {
        setError('Please agree to Terms and Privacy Policy.');
        return;
      }
    }
    setLoading(true);
    try {
      const endpoint = isLoginMode ? '/user-auth/login' : '/user-auth/signup';
      const payload = isLoginMode
        ? { email: loginForm.email, password: loginForm.password }
        : { fullName: signupForm.fullName, email: signupForm.email, password: signupForm.password };
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

  const continueWithZoho = async () => {
    const clientId = import.meta.env.VITE_ZOHO_LOGIN_CLIENT_ID;
    const configuredRedirectUri = import.meta.env.VITE_ZOHO_LOGIN_REDIRECT_URI;
    const zohoBase = (import.meta.env.VITE_ZOHO_LOGIN_BASE_URL || 'https://accounts.zoho.in').replace(/\/$/, '');
    const redirectUri = configuredRedirectUri || `${window.location.origin}/trade-show-team-project/oauth-callback.html`;
    if (!clientId) {
      setError('Zoho login is not configured. Missing VITE_ZOHO_LOGIN_CLIENT_ID.');
      return;
    }

    const scope = 'openid profile email,ZohoMCP.tool.execute';
    const state = `pulse_login_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const authUrl = `${zohoBase}/oauth/v2/auth?scope=${encodeURIComponent(scope)}&client_id=${encodeURIComponent(clientId)}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    setError('');
    setZohoLoading(true);

    const popup = window.open(authUrl, 'pulse_zoho_login', 'width=820,height=760,resizable=yes,scrollbars=yes');
    if (!popup) {
      setZohoLoading(false);
      setError('Popup blocked. Allow popups and try again.');
      return;
    }

    const finish = () => setZohoLoading(false);
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      finish();
      setError('Zoho login timed out. Please retry.');
    }, 120000);

    const onMessage = async (event) => {
      const allowedOrigins = new Set([window.location.origin, apiOrigin].filter(Boolean));
      if (!allowedOrigins.has(event.origin)) {
        return;
      }
      const payload = event.data || {};
      if (payload.type !== 'pulse_oauth_callback') {
        return;
      }
      const code = String(payload.code || '').trim();
      const responseState = String(payload.state || '').trim();
      if (!code || responseState !== state) {
        return;
      }
      clearTimeout(timeoutId);
      window.removeEventListener('message', onMessage);
      try {
        const response = await fetch(buildUrl('/user-auth/zoho'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirectUri,
            zohoBaseUrl: zohoBase
          })
        });
        const body = await parseApiResponse(response);
        const data = unwrapData(body);
        if (!data?.token) {
          throw new Error('Zoho login failed: token missing.');
        }
        localStorage.setItem('mcp_jwt', data.token);
        onAuthenticated?.(data.user);
      } catch (e) {
        setError(e.message || 'Zoho authentication failed');
      } finally {
        finish();
      }
    };

    window.addEventListener('message', onMessage);
  };

  const sendForgotOtp = async () => {
    if (!forgotEmail.trim()) {
      setForgotMessage('Please enter your account email address.');
      return;
    }
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const response = await fetch(buildUrl('/user-auth/forgot-password/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const body = await parseApiResponse(response);
      const data = unwrapData(body);
      setForgotMessage(data?.message || 'If this email is registered, a verification code has been sent.');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotStep('otp');
    } catch (e) {
      setForgotMessage(e.message || 'Unable to send verification code at this time.');
    } finally {
      setForgotLoading(false);
    }
  };

  const continueForgotWithOtp = () => {
    if (!forgotOtp.trim() || forgotOtp.trim().length < 6) {
      setForgotMessage('Enter the 6-digit verification code.');
      return;
    }
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotMessage('');
    setForgotStep('password');
  };

  const resetWithForgotOtp = async () => {
    if (!forgotEmail.trim() || !forgotOtp.trim() || !forgotNewPassword || !forgotConfirmPassword) {
      setForgotMessage('Please complete all password recovery fields.');
      return;
    }
    if (!isPasswordPolicyValid(forgotNewPassword)) {
      setForgotMessage('Password must be 8+ chars with uppercase, lowercase, and special character.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotMessage('New password and confirm password do not match.');
      return;
    }
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const response = await fetch(buildUrl('/user-auth/forgot-password/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otpCode: forgotOtp.trim(),
          newPassword: forgotNewPassword
        })
      });
      const body = await parseApiResponse(response);
      const data = unwrapData(body);
      setForgotMessage(data?.message || 'Password reset successful.');
      setLoginForm((prev) => ({ ...prev, email: forgotEmail.trim(), password: '' }));
      resetForgotFlow();
      setMode('login');
    } catch (e) {
      setForgotMessage(e.message || 'Unable to reset password.');
    } finally {
      setForgotLoading(false);
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
          <p>Pulse of your server, 24x7</p>
        </>
      </div>

      <div className={`${AuthStyles.card} ${isForgotMode ? AuthStyles.forgotCard : ''}`}>
        <div className={AuthStyles.header}>
          <h2>
            {isLoginMode
              ? 'Continue where you left off'
              : isSignupMode
                ? 'Create Your Account'
                : forgotStep === 'email'
                  ? 'Forgot Password'
                  : forgotStep === 'otp'
                    ? 'Verify OTP'
                    : 'Reset Password'}
          </h2>
          <p>
            {isLoginMode
              ? 'Let\'s hear the pulse of your server'
              : isSignupMode
                ? 'Experience the next generation of cloud management.'
                : forgotStep === 'email'
                  ? 'Enter your account email to receive a one-time verification code.'
                  : forgotStep === 'otp'
                    ? 'Enter the verification code sent to your email.'
                    : 'Set a new password for your account.'}
          </p>
        </div>

        <form
          className={AuthStyles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (isForgotMode) {
              if (forgotStep === 'email') {
                sendForgotOtp();
                return;
              }
              if (forgotStep === 'otp') {
                continueForgotWithOtp();
                return;
              }
              if (forgotStep === 'password') {
                resetWithForgotOtp();
                return;
              }
              return;
            }
            submit();
          }}
        >
          {isSignupMode ? (
            <div className={AuthStyles.fieldBlock}>
              <label>FULL NAME</label>
              <div className={AuthStyles.fieldWrap}>
                <MdPerson className={AuthStyles.fieldIcon} />
                <input
                  className={AuthStyles.input}
                  placeholder="John Doe"
                  value={signupForm.fullName}
                  onChange={(e) => setSignupForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
            </div>
          ) : null}

          {!isForgotMode ? (
            <div className={AuthStyles.fieldBlock}>
            <label>EMAIL ADDRESS</label>
            <div className={AuthStyles.fieldWrap}>
              <MdMail className={AuthStyles.fieldIcon} />
              <input
                className={AuthStyles.input}
                placeholder="name@company.com"
                type="email"
                value={currentEmail}
                autoComplete={isLoginMode ? 'email' : 'off'}
                onChange={(e) => {
                  const nextEmail = e.target.value;
                  if (isLoginMode) {
                    setLoginForm((prev) => ({ ...prev, email: nextEmail }));
                  } else {
                    setSignupForm((prev) => ({ ...prev, email: nextEmail }));
                  }
                }}
              />
            </div>
          </div>
          ) : null}

          {isLoginMode ? (
            <div className={AuthStyles.fieldBlock}>
              <label>PASSWORD</label>
              <div className={AuthStyles.fieldWrap}>
                <MdLock className={AuthStyles.fieldIcon} />
                <input
                  className={AuthStyles.input}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
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
              <button
                type="button"
                className={AuthStyles.ghostLink}
                onClick={() => {
                  setMode('forgot');
                  resetForgotFlow();
                  if (!forgotEmail && loginForm.email) {
                    setForgotEmail(loginForm.email);
                  }
                }}
              >
                Forgot Password?
              </button>
            </div>
          ) : isSignupMode ? (
            <div className={AuthStyles.passwordGrid}>
              <div className={AuthStyles.fieldBlock}>
                <label>PASSWORD</label>
                <div className={AuthStyles.fieldWrap}>
                  <MdLock className={AuthStyles.fieldIcon} />
                  <input
                    className={AuthStyles.input}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={signupForm.password}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))}
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
                <label>CONFIRM PASSWORD</label>
                <div className={AuthStyles.fieldWrap}>
                  <MdSecurity className={AuthStyles.fieldIcon} />
                  <input
                    className={AuthStyles.input}
                    placeholder="••••••••"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
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
          ) : null}

          {isSignupMode ? (
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
              <p className={AuthStyles.passwordRuleHint}>
                Use 8+ characters with uppercase, lowercase, and one special character.
              </p>
              <label className={AuthStyles.termsRow}>
                <input
                  type="checkbox"
                  checked={signupForm.acceptedTerms}
                  onChange={(e) => setSignupForm((prev) => ({ ...prev, acceptedTerms: e.target.checked }))}
                />
                <span>I agree to the <button type="button" className={AuthStyles.inlineLink}>Terms and Conditions</button> and <button type="button" className={AuthStyles.inlineLink}>Privacy Policy</button>.</span>
              </label>
            </>
          ) : null}

          {error ? <div className={AuthStyles.error}>{error}</div> : null}

          {isForgotMode ? (
            <div className={AuthStyles.recoveryPanel}>
              <div className={AuthStyles.forgotHero}>
                <h3>Recover Your Account</h3>
                <p>Complete email verification and set a stronger password.</p>
              </div>
              <div className={AuthStyles.forgotSteps}>
                <button
                  type="button"
                  className={`${AuthStyles.forgotStepBtn} ${forgotStep === 'email' ? AuthStyles.forgotStepBtnActive : ''}`}
                  onClick={() => {
                    setForgotOtp('');
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                    setForgotStep('email');
                    setForgotMessage('');
                  }}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={`${AuthStyles.forgotStepBtn} ${forgotStep === 'otp' ? AuthStyles.forgotStepBtnActive : ''}`}
                  onClick={() => {
                    if (!forgotEmail.trim()) {
                      setForgotMessage('Enter email first to continue.');
                      return;
                    }
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                    setForgotStep('otp');
                    setForgotMessage('');
                  }}
                >
                  OTP
                </button>
                <button
                  type="button"
                  className={`${AuthStyles.forgotStepBtn} ${forgotStep === 'password' ? AuthStyles.forgotStepBtnActive : ''}`}
                  onClick={() => {
                    if (!forgotOtp.trim()) {
                      setForgotMessage('Enter OTP first to continue.');
                      return;
                    }
                    setForgotStep('password');
                    setForgotMessage('');
                  }}
                >
                  New Password
                </button>
              </div>
              {forgotStep === 'email' ? (
                <div className={AuthStyles.recoveryGrid}>
                  <div className={AuthStyles.fieldWrap}>
                    <MdMail className={AuthStyles.fieldIcon} />
                    <input
                      className={AuthStyles.input}
                      type="email"
                      placeholder="Account email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                  <button type="button" className={AuthStyles.btnSecondary} onClick={sendForgotOtp} disabled={forgotLoading}>
                    {forgotLoading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </div>
              ) : forgotStep === 'otp' ? (
                <div className={AuthStyles.recoveryGrid}>
                  <div className={AuthStyles.fieldWrap}>
                    <MdSecurity className={AuthStyles.fieldIcon} />
                    <input
                      className={AuthStyles.input}
                      type="text"
                      maxLength={6}
                      placeholder="TOTP Code"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                    />
                  </div>
                  <button type="button" className={AuthStyles.btnSecondary} onClick={continueForgotWithOtp} disabled={forgotLoading}>
                    Continue
                  </button>
                  <button type="button" className={AuthStyles.btnSecondary} onClick={sendForgotOtp} disabled={forgotLoading}>
                    Resend Code
                  </button>
                </div>
              ) : (
                <div className={AuthStyles.recoveryGrid}>
                  <div className={AuthStyles.fieldWrap}>
                    <MdLock className={AuthStyles.fieldIcon} />
                    <input
                      className={AuthStyles.input}
                      type={showForgotNewPassword ? 'text' : 'password'}
                      placeholder="New password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className={AuthStyles.eyeBtn}
                      onClick={() => setShowForgotNewPassword((prev) => !prev)}
                      aria-label={showForgotNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showForgotNewPassword ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                  <div className={AuthStyles.strengthRow}>
                    {[0, 1, 2, 3].map((barIndex) => (
                      <span
                        key={barIndex}
                        className={`${AuthStyles.strengthBar} ${barIndex < forgotPasswordStrength.level ? AuthStyles.strengthBarActive : ''}`}
                        style={barIndex < forgotPasswordStrength.level ? { background: forgotPasswordStrength.color } : undefined}
                      ></span>
                    ))}
                    <span className={AuthStyles.strengthText} style={{ color: forgotPasswordStrength.color }}>
                      {forgotPasswordStrength.label}
                    </span>
                  </div>
                  <p className={AuthStyles.passwordRuleHint}>
                    Must include at least 8 characters, uppercase, lowercase, and one special character.
                  </p>
                  <div className={AuthStyles.fieldWrap}>
                    <MdSecurity className={AuthStyles.fieldIcon} />
                    <input
                      className={AuthStyles.input}
                      type={showForgotConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className={AuthStyles.eyeBtn}
                      onClick={() => setShowForgotConfirmPassword((prev) => !prev)}
                      aria-label={showForgotConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showForgotConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                  <button type="submit" className={AuthStyles.btnReset} disabled={forgotLoading}>
                    {forgotLoading ? 'Please wait...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    className={AuthStyles.btnSecondary}
                    onClick={() => {
                      setForgotNewPassword('');
                      setForgotConfirmPassword('');
                      setForgotStep('otp');
                    }}
                    disabled={forgotLoading}
                  >
                    Back to OTP Step
                  </button>
                </div>
              )}
              {forgotMessage ? <div className={AuthStyles.info}>{forgotMessage}</div> : null}
            </div>
          ) : null}

          {!isForgotMode ? (
            <button type="submit" className={AuthStyles.btn} disabled={loading}>
              {loading ? 'Please wait...' : isLoginMode ? 'Sign In' : <>Create Account <MdArrowForward /></>}
            </button>
          ) : null}
          {isLoginMode ? (
            <>
              <div className={AuthStyles.divider}><span>OR</span></div>
              <button
                type="button"
                className={AuthStyles.zohoBtn}
                disabled={zohoLoading || loading}
                onClick={continueWithZoho}
              >
                <img
                  src="https://static.zohocdn.com/devconsole/images/Zoho.6a322ea5abc600a709e2014b607b631c.svg"
                  alt="Zoho"
                  className={AuthStyles.zohoLogo}
                />
                {zohoLoading ? 'Connecting Zoho...' : 'Continue with Zoho'}
              </button>
            </>
          ) : null}
        </form>

        <p className={AuthStyles.switchRow}>
          {isForgotMode ? 'Remember your password?' : isLoginMode ? 'Don\'t have an account?' : 'Already have an account?'}
          <button
            type="button"
            className={AuthStyles.switchLink}
            onClick={() => switchMode(isForgotMode ? 'login' : isLoginMode ? 'signup' : 'login')}
          >
            {isForgotMode ? 'Back to Sign In' : isLoginMode ? 'Sign Up' : 'Sign In'}
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

function isPasswordPolicyValid(password) {
  const input = String(password || '');
  if (input.length < 8) {
    return false;
  }
  const hasLower = /[a-z]/.test(input);
  const hasUpper = /[A-Z]/.test(input);
  const hasSpecial = /[^A-Za-z0-9]/.test(input);
  return hasLower && hasUpper && hasSpecial;
}
