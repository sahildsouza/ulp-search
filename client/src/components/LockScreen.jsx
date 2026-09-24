import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, Lock, Eye, EyeOff, ArrowRight, Loader2, KeyRound, X, Check } from 'lucide-react';
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
  const [isFocused, setIsFocused] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-[100dvh] overflow-y-auto px-4 py-8 sm:py-12 bg-black/90 backdrop-blur-2xl select-none">
      {/* Background ambient lighting and cyber grid */}
      <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-60" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-cyan-500/15 rounded-full blur-[120px] sm:blur-[160px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/10 rounded-full blur-[100px] sm:blur-[140px]" />
      </div>

      {/* Main Glassmorphic Card */}
      <div
        className={`relative w-full max-w-md cyber-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 transition-all duration-300 my-auto ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Top Rim Light Accent */}
        <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

        {/* Header Icon & Brand Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.25)] mb-4">
            {/* Ambient pulse halo */}
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/20 blur-md animate-pulse-gentle pointer-events-none" />

            {lockoutSeconds > 0 ? (
              <ShieldAlert className="relative w-8 h-8 text-rose-400 animate-pulse" />
            ) : (
              <ShieldCheck className="relative w-8 h-8 text-cyan-400" />
            )}

            {/* Live Indicator Dot */}
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span
                className={`absolute inset-0 rounded-full ${
                  lockoutSeconds > 0 ? 'bg-rose-400' : 'bg-cyan-400'
                } opacity-75 animate-ping`}
              />
              <span
                className={`relative rounded-full h-4 w-4 ${
                  lockoutSeconds > 0 ? 'bg-rose-500' : 'bg-cyan-400'
                } ring-2 ring-[#080c14] flex items-center justify-center`}
              >
                <span className="w-1 h-1 rounded-full bg-white" />
              </span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-2xl font-bold font-mono-code text-white tracking-wide flex items-center justify-center gap-2">
            ULP<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">.STREAM</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Secured
            </span>
          </h1>

          <p className="text-xs text-zinc-400 font-mono-code mt-2 max-w-[280px] sm:max-w-none leading-relaxed">
            Enter private access code to inspect data streams
          </p>
        </div>

        {/* Lockout Warning */}
        {lockoutSeconds > 0 && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono-code flex items-center gap-3 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <div>
              <p className="font-bold text-rose-200">Security Lockout Active</p>
              <p className="text-[11px] text-rose-400/90 mt-0.5">
                Too many failed attempts. Try again in {formatLockout(lockoutSeconds)}.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && lockoutSeconds <= 0 && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono-code flex items-center justify-between shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-slide-in">
            <span className="truncate pr-2">{errorMsg}</span>
            {remainingAttempts !== null && remainingAttempts < 5 && (
              <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 flex-shrink-0">
                {remainingAttempts} left
              </span>
            )}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div
              className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-200 ${
                isFocused ? 'text-cyan-400' : 'text-zinc-500'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </div>

            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter Access Code..."
              disabled={isLoading || lockoutSeconds > 0}
              className="w-full pl-10 pr-20 py-3.5 rounded-xl bg-black/60 border border-white/[0.12] text-white placeholder-zinc-500 font-mono-code text-sm sm:text-base tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 shadow-inner transition-all duration-200 disabled:opacity-50"
              autoComplete="current-password"
            />

            {/* Quick Action Buttons on right of input */}
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              {code && !isLoading && (
                <button
                  type="button"
                  onClick={() => {
                    setCode('');
                    inputRef.current?.focus();
                  }}
                  tabIndex={-1}
                  title="Clear text"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Hide code' : 'Show code'}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me cyber switch / checkbox */}
          <div className="flex items-center justify-between text-xs font-mono-code text-zinc-400 pt-1 pb-1">
            <label className="flex items-center gap-3 cursor-pointer select-none group min-h-[36px]">
              {/* Custom cyber switch */}
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 p-0.5 border ${
                  rememberMe
                    ? 'bg-cyan-500/25 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                    : 'bg-zinc-800/80 border-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-transform duration-200 flex items-center justify-center ${
                    rememberMe
                      ? 'translate-x-4 bg-cyan-400 text-black shadow-sm'
                      : 'translate-x-0 bg-zinc-500 text-transparent'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </div>

              <span className="text-zinc-300 group-hover:text-cyan-300 transition-colors text-[11px] sm:text-xs">
                Remember this device <span className="text-zinc-500">(30 days)</span>
              </span>
            </label>
          </div>

          {/* Submit Button with Cyber Shimmer */}
          <button
            type="submit"
            disabled={!code.trim() || isLoading || lockoutSeconds > 0}
            className="group relative overflow-hidden w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:via-teal-300 hover:to-blue-400 text-black font-bold font-mono-code text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {/* Shimmer light bar */}
            {!isLoading && (
              <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-cyber-shimmer pointer-events-none" />
            )}

            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>VERIFYING CREDENTIALS...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-black" />
                <span>UNLOCK CONSOLE</span>
                <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badges */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-code text-zinc-400">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            SHA-256 Timing-Safe
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
            <span className="text-cyan-400">🛡️</span>
            Brute-Force Guard
          </span>
        </div>
      </div>
    </div>
  );
}

