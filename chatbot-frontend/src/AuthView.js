import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function AuthView() {
  const [mode, setMode]         = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [loading, setLoading]   = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    setLoading(true);
    try {
      if (mode === 'reset') {
        if (!email.trim()) { setError('Enter your email address.'); setLoading(false); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setInfo('Password reset email sent! Check your inbox.');
        setMode('login');
      } else if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your full name.'); setLoading(false); return; }
        if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() } } });
        if (error) throw error;
        setInfo('Account created! Check your email to confirm, then log in.');
        setMode('login');
      } else {
        if (!email.trim() || !password.trim()) { setError('Please fill in both fields.'); setLoading(false); return; }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const titles    = { login: 'Sign in to your study portal', signup: 'Create your free account', reset: 'Reset your password' };
  const btnLabels = { login: 'Sign In', signup: 'Create Account', reset: 'Send Reset Email' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--surface-container-low)',
      fontFamily: 'var(--font-body, sans-serif)'
    }}>
      <div style={{
        background: 'var(--surface-container-lowest, white)',
        borderRadius: '24px', padding: '48px 40px', width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)', textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'var(--primary, #6750a4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '28px' }}>school</span>
        </div>
        <h1 style={{ fontWeight: 800, fontSize: '26px', marginBottom: '6px', color: 'var(--on-surface, #1c1b1f)' }}>Academix</h1>
        <p style={{ color: 'var(--on-surface-variant, #49454f)', fontSize: '14px', marginBottom: '32px' }}>
          {titles[mode]}
        </p>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
              autoComplete="name"
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            autoComplete="email"
          />
          {mode !== 'reset' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          )}

          {error && <p style={{ color: '#b00020', fontSize: '13px', margin: 0 }}>{error}</p>}
          {info  && <p style={{ color: '#1b5e20', fontSize: '13px', margin: 0 }}>{info}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--primary, #6750a4)', color: 'white',
              border: 'none', borderRadius: '12px', padding: '14px',
              fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: '4px'
            }}
          >
            {loading ? '…' : btnLabels[mode]}
          </button>
        </form>

        {mode === 'login' && (
          <p style={{ marginTop: '14px', fontSize: '13px' }}>
            <button
              onClick={() => { setMode('reset'); setError(''); setInfo(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant, #49454f)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Forgot password?
            </button>
          </p>
        )}

        <p style={{ marginTop: '20px', fontSize: '14px', color: 'var(--on-surface-variant, #49454f)' }}>
          {mode === 'reset'
            ? 'Remembered it? '
            : mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signup' ? 'login' : mode === 'reset' ? 'login' : 'signup'); setError(''); setInfo(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary, #6750a4)', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        <p style={{ marginTop: '24px', fontSize: '11px', color: 'var(--on-surface-variant, #49454f)', opacity: 0.6 }}>
          You can also use the chatbot as a guest — sign in for history & uploads.
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '13px 16px', borderRadius: '12px', fontSize: '14px',
  border: '1.5px solid rgba(0,0,0,0.12)', outline: 'none',
  background: 'var(--surface-container-high, #ece6f0)',
  color: 'var(--on-surface, #1c1b1f)', width: '100%', boxSizing: 'border-box'
};
