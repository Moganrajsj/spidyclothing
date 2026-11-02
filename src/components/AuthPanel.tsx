import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

type AuthPanelProps = {
  next?: string;
  title?: string;
  note?: string;
  initialError?: string;
};

function GoogleMark() {
  return <svg viewBox="0 0 48 48" width="17" height="17" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;
}

export function AuthPanel({ next = '', title = 'Sign in or create an account', note, initialError = '' }: AuthPanelProps) {
  const { login, register, googleSignIn } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [google, setGoogle] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/providers')
      .then((response) => response.json())
      .then((data: { google?: boolean }) => { if (active) setGoogle(Boolean(data.google)); })
      .catch(() => { if (active) setGoogle(false); });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    setBusy(true);
    setError('');
    try {
      if (tab === 'signup') {
        await register({ name: String(values.get('name') || ''), email: String(values.get('email') || ''), password: String(values.get('password') || '') });
      } else {
        await login({ email: String(values.get('email') || ''), password: String(values.get('password') || '') });
      }
      if (next) navigate(next, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const googleDisabled = google !== true;

  return <div className="auth-panel">
    <div className="auth-panel-head">
      <p className="eyebrow">SPIDY ACCOUNT</p>
      <h1>{title}</h1>
      {note && <p className="auth-note">{note}</p>}
    </div>
    <button
      type="button"
      className="google-button"
      disabled={googleDisabled}
      onClick={() => googleSignIn(next || '/account')}
      title={google === false ? 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local to enable Google sign-in.' : undefined}
    >
      <GoogleMark/>
      {google === false ? 'GOOGLE SIGN-IN NOT CONFIGURED' : 'CONTINUE WITH GOOGLE'}
    </button>
    <div className="auth-divider"><span>OR USE EMAIL</span></div>
    <div className="account-tabs">
      <button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError(''); }}>LOG IN</button>
      <button type="button" className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); setError(''); }}>SIGN UP</button>
    </div>
    <form onSubmit={submit}>
      {tab === 'signup' && <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={120} placeholder="Your name"/></label>}
      <label>Email address<input name="email" autoComplete="email" required type="email" placeholder="you@example.com"/></label>
      <label>Password<input name="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} required type="password" minLength={8} maxLength={128} placeholder="At least 8 characters"/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button disabled={busy} className="button button-primary full-width">{busy ? 'PLEASE WAIT…' : tab === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</button>
    </form>
    <p className="ui-only-note">Passwords are stored securely and never saved in your browser. Google sign-in shares only your name, email, and profile photo.</p>
  </div>;
}
