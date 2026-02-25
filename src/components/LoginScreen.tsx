import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ADMIN_EMAIL = 'JeffreyAndersonPDX@Gmail.com';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  }

  async function handleRegister() {
    setError('');
    if (!displayName.trim()) {
      setError('Please enter your name for your account.');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      await setDoc(doc(db, 'users', cred.user.uid, 'profile', 'data'), {
        uid: cred.user.uid,
        email,
        displayName,
        isAdmin,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 48,
        width: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: 26 }}>
            Title CRM
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 14 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Your Name (e.g. "Jeff's Account")
            </label>
            <input
              className="field-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Pick Something"
              autoFocus
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Email</label>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus={mode === 'login'}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Password</label>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
          />
        </div>

        {error && (
          <div style={{
            color: '#f87171',
            fontSize: 13,
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          style={{ padding: '12px 0', fontSize: 15 }}
        >
          {loading
            ? 'Please wait...'
            : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <span
                style={{ color: 'var(--accent)', cursor: 'pointer' }}
                onClick={() => { setMode('register'); setError(''); }}
              >
                Create one
              </span>
            </>
          ) : (
            <>Already have an account?{' '}
              <span
                style={{ color: 'var(--accent)', cursor: 'pointer' }}
                onClick={() => { setMode('login'); setError(''); }}
              >
                Sign in
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}