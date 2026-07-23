import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Lock, Globe, Fingerprint } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthProvider';
import logo from '../../../assets/images/coat.png';
import uhamiajiLogo from '../../../assets/images/uhamiaji.png';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/internal/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-icrcs-navy flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/[0.03]" />
        <div className="absolute top-1/2 -left-16 w-48 h-48 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-20 right-20 w-56 h-56 rounded-full bg-white/[0.03]" />

        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-icrcs-gold" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-5 mb-16">
            <div className="h-20 w-20 rounded-2xl bg-icrcs-gold flex items-center justify-center shadow-lg overflow-hidden">
              <img src={logo} alt="CRCS Logo" className="h-16 w-16 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">CRCS</h1>
              <p className="text-sm text-white/60 uppercase tracking-[0.2em] font-medium">Government Portal</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-10">
            <p className="text-white/90 text-2xl font-light mb-2">Welcome to the</p>
            <h2 className="text-3xl xl:text-4xl font-bold text-icrcs-gold leading-tight mb-6">
              Central Registration<br />and Citizenship System
            </h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-md">
              A secure and modern platform built for the management of immigration status
              determination, biometric enrollment, case processing, and citizenship records.
            </p>
          </div>

          {/* Feature badges */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Lock className="h-4 w-4 text-icrcs-gold" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Secure Access</p>
                <p className="text-white/50 text-[0.625rem]">Role-based control</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Globe className="h-4 w-4 text-icrcs-gold" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Case Management</p>
                <p className="text-white/50 text-[0.625rem]">End-to-end processing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Fingerprint className="h-4 w-4 text-icrcs-gold" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Biometric Data</p>
                <p className="text-white/50 text-[0.625rem]">Digital enrollment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white/40 text-[0.6875rem]">
          &copy; 2026 Central Registration and Citizenship System. All rights reserved. Version 1.0.0
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-icrcs-cream p-6 lg:p-10">
        <div className="w-full max-w-[420px] animate-slide-up">
          {/* Mobile header (visible only on small screens) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-xl bg-icrcs-navy flex items-center justify-center overflow-hidden">
              <img src={logo} alt="CRCS Logo" className="h-11 w-11 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-icrcs-navy">CRCS</h1>
              <p className="text-sm text-muted uppercase tracking-wider">Government Portal</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl shadow-black/[0.04] p-8">
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
                <img src={uhamiajiLogo} alt="Uhamiaji Logo" className="h-16 w-16 object-contain" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-icrcs-navy">Officer Login</h2>
              <p className="text-sm text-muted mt-1">Sign in to your officer account</p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center font-medium animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Officer ID / Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all placeholder:text-gray-400"
                  placeholder="officer@immigration.go.tz"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all placeholder:text-gray-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-icrcs-navy text-white font-semibold hover:bg-icrcs-navy-light transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <LogIn className="h-4 w-4" />
                <span>{loading ? 'Signing in…' : 'Sign In'}</span>
              </button>
            </form>

            <div className="mt-5 text-center">
              <button className="text-xs text-icrcs-gold hover:text-icrcs-gold-light font-medium transition-colors">
                Forgot your password?
              </button>
            </div>

            <div className="mt-5 pt-5 border-t border-gray-100 text-center text-[0.6875rem] text-gray-400">
              <p>Authorized personnel only. All access is logged and audited.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
