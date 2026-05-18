'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, Loader2, Zap, Activity, AlertTriangle } from 'lucide-react';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('analyst@driftguard.io');
  const [password, setPassword] = useState('demo123');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem('dg_token', data.token);
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push('/dashboard');
    } catch {
      toast.error('Invalid credentials. Try analyst@driftguard.io / demo123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col w-[480px] bg-surface-950 border-r border-border relative overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center glow-accent">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xl font-bold text-white">DriftGuard</span>
          </div>

          {/* Main copy */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white leading-tight mb-4">
              Data observability
              <br />
              <span className="text-gradient">built for analysts.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-10">
              Upload datasets, detect anomalies automatically, and trust your
              data pipelines with confidence scores and moving averages.
            </p>

            {/* Feature pills */}
            <div className="space-y-3">
              {[
                { icon: <Zap className="w-4 h-4 text-accent" />, text: 'Z-Score & moving average anomaly detection' },
                { icon: <Activity className="w-4 h-4 text-emerald-400" />, text: 'Real-time dataset health scores' },
                { icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, text: 'Alert center with severity filtering' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-surface-800 border border-border flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <span className="text-sm text-slate-400">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Demo creds */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-xs font-semibold text-accent/80 uppercase tracking-wider mb-2">Demo Credentials</p>
            <p className="text-sm font-mono text-slate-300">analyst@driftguard.io</p>
            <p className="text-sm font-mono text-slate-400">demo123</p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <Shield className="w-7 h-7 text-accent" />
            <span className="text-xl font-bold text-white">DriftGuard</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Sign in</h1>
            <p className="text-sm text-muted mt-1">Access your analytics workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="input-group">
              <label htmlFor="email" className="input-label">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.io"
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign in to DriftGuard'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted mt-6">
            Internal tool — contact your admin for access
          </p>
        </div>
      </div>
    </div>
  );
}
