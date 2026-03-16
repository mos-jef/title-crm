import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ADMIN_EMAIL = 'JeffreyAndersonPDX@Gmail.com';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password. Use "Forgot Password" below to reset.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with that email.');
      } else {
        setError(err.message || 'Login failed');
      }
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

  async function handleReset() {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Enter your email address above first.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(`Password reset email sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setError(err.message || 'Could not send reset email');
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
            Co-Lab
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 14 }}>
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create your account'}
            {mode === 'reset' && 'Reset your password'}
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

        {mode !== 'reset' && (
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
        )}

        {error && (
          <div style={{
            color: '#f87171', fontSize: 13,
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            color: '#86efac', fontSize: 13,
            background: 'rgba(134,239,172,0.1)',
            border: '1px solid rgba(134,239,172,0.3)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            {success}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset}
          disabled={loading}
          style={{ padding: '12px 0', fontSize: 15 }}
        >
          {loading ? 'Please wait...' :
            mode === 'login' ? 'Sign In' :
            mode === 'register' ? 'Create Account' :
            'Send Reset Email'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mode === 'login' && (
            <>
              <div>
                Don't have an account?{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }}
                  onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
                  Create one
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }}
                  onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}>
                  Forgot password?
                </span>
              </div>
            </>
          )}
          {mode === 'register' && (
            <div>
              Already have an account?{' '}
              <span style={{ color: 'var(--accent)', cursor: 'pointer' }}
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                Sign in
              </span>
            </div>
          )}
          {mode === 'reset' && (
            <div>
              <span style={{ color: 'var(--accent)', cursor: 'pointer' }}
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                ← Back to sign in
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}