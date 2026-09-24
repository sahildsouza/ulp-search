import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, Lock, Eye, EyeOff, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { setAuthToken } from '../utils/auth';

export function LockScreen({ onAuthenticated }) {
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const inputRef = useRef(null);

  // Focus input automatically on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch initial rate limit / lockout status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          if (data.locked && data.lockoutSeconds > 0) {
            setLockoutSeconds(data.lockoutSeconds);
            setErrorMsg(`Security lockout active. Try again in ${data.lockoutSeconds}s`);
          } else if (data.remainingAttempts < 5) {
            setRemainingAttempts(data.remainingAttempts);
          }
        }
      } catch {}
    };
    fetchStatus();
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!code.trim() || isLoading || lockoutSeconds > 0) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          rememberMe
        })
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        setAuthToken(data.token, rememberMe);
        onAuthenticated();
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        if (data.locked) {
          setLockoutSeconds(data.lockoutSeconds || 900);
          setErrorMsg(data.message || 'Maximum attempts exceeded. IP locked out.');
        } else {
          setErrorMsg(data.message || 'Incorrect access code.');
          if (typeof data.remainingAttempts === 'number') {
            setRemainingAttempts(data.remainingAttempts);
          }
        }
        setCode('');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLockout = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl px-4 select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className={`relative w-full max-w-md bg-[#090d16] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300 ${isShaking ? 'animate-shake' : ''}`}>
        
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.2)] mb-4">
            {lockoutSeconds > 0 ? (
              <ShieldAlert className="w-7 h-7 text-rose-400 animate-pulse" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
            )}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className={`absolute inset-0 rounded-full ${lockoutSeconds > 0 ? 'bg-rose-400' : 'bg-cyan-400'} opacity-75 animate-ping`} />
              <span className={`relative rounded-full h-3 w-3 ${lockoutSeconds > 0 ? 'bg-rose-500' : 'bg-cyan-500'}`} />
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold font-mono-code text-white tracking-wide flex items-center gap-2">
            ULP<span className="text-cyan-400">.STREAM</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Secured
            </span>
          </h1>

          <p className="text-xs text-zinc-400 font-mono-code mt-1.5">
            Enter private access code to inspect data streams
          </p>
        </div>

        {/* Lockout Warning */}
        {lockoutSeconds > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono-code flex items-center gap-2.5 animate-pulse">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <div>
              <p className="font-bold">Security Lockout Active</p>
              <p className="text-[11px] text-rose-400/80">
                Too many failed attempts. Try again in {formatLockout(lockoutSeconds)}.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && lockoutSeconds <= 0 && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono-code flex items-center justify-between">
            <span className="truncate">{errorMsg}</span>
            {remainingAttempts !== null && remainingAttempts < 5 && (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                {remainingAttempts} left
              </span>
            )}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <KeyRound className="w-4 h-4" />
            </div>

            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Access Code..."
              disabled={isLoading || lockoutSeconds > 0}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-black/60 border border-white/[0.1] text-white placeholder-zinc-500 font-mono-code text-sm sm:text-base tracking-wider focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all disabled:opacity-50"
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center justify-between text-xs font-mono-code text-zinc-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-black/60 border-zinc-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="group-hover:text-zinc-300 transition-colors">
                Remember this device (30 days)
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!code.trim() || isLoading || lockoutSeconds > 0}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold font-mono-code text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>VERIFYING...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>UNLOCK CONSOLE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badges */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono-code text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            SHA-256 Timing-Safe
          </span>
          <span>Brute-Force Protected</span>
        </div>
      </div>
    </div>
  );
}
