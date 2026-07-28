import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginSession, requestPasswordReset } from '../api/auth';
import collegesoftLogo from '../../assets/collegesoft.png';

function getAuthErrorMessage(error) {
  if (error?.status === 401) return 'Incorrect email or password.';
  if (error?.status === 403) return error.message || 'This account is not active.';
  if (error?.status === 503) return error.message || 'Authentication service is not configured.';
  return error?.message || 'Authentication failed. Please try again.';
}

export default function AuthPage({ onAuthenticated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const email = form.email.trim();
    if (!email || !form.password) {
      toast.error('Email and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await loginSession({ email, password: form.password });
      onAuthenticated?.(user);
      toast.success('Signed in');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async () => {
    const email = form.email.trim();
    if (!email) {
      toast.error('Enter your email first.');
      return;
    }

    setResetting(true);
    try {
      await requestPasswordReset(email);
      toast.success('If that email exists, a reset link has been sent.');
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="backend-auth-shell min-h-screen flex items-center justify-center px-5 py-8 text-[#071e27]">
      <section className="backend-auth-card relative w-full max-w-[440px] rounded-[32px] border border-white/30 bg-white/30 p-7 sm:p-10 shadow-[0_30px_90px_rgba(7,30,39,0.16)] backdrop-blur-2xl">
        <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-[#81f3e5]/30 blur-2xl" />
        <div className="absolute -bottom-12 -right-10 h-32 w-32 rounded-full bg-[#94d1d1]/30 blur-2xl" />

        <div className="relative text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 rotate-3 items-center justify-center rounded-2xl bg-[#004d4d] text-[#84f5e8] shadow-[0_18px_36px_rgba(0,77,77,0.24)] transition-transform duration-300 hover:rotate-0">
            <GraduationCap size={34} strokeWidth={1.8} />
          </div>
          <img src={collegesoftLogo} alt="Collegesoft" className="mx-auto mb-3 max-h-10 w-auto object-contain" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#006a62]">Admin ERP</p>
        </div>

        <form onSubmit={submit} className="relative mt-10 space-y-6">
          <label className="block space-y-2">
            <span className="ml-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#3f4848]">Email</span>
            <span className="group relative block">
              <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7978] group-focus-within:text-[#006a62]" size={18} />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="h-12 w-full rounded-xl border border-white/30 bg-white/45 pl-11 pr-4 text-sm text-[#071e27] outline-none transition focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/25"
                placeholder="admin@collegesoft.edu"
              />
            </span>
          </label>

          <label className="block space-y-2">
            <span className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#3f4848]">Password</span>
              <button
                type="button"
                onClick={resetPassword}
                disabled={submitting || resetting}
                className="text-xs font-semibold text-[#006a62] transition hover:text-[#003434] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetting ? 'Sending...' : 'Forgot password?'}
              </button>
            </span>
            <span className="group relative block">
              <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7978] group-focus-within:text-[#006a62]" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={6}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className="h-12 w-full rounded-xl border border-white/30 bg-white/45 pl-11 pr-12 text-sm text-[#071e27] outline-none transition focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/25"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6f7978] transition hover:bg-white/45 hover:text-[#006a62]"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || resetting}
            className="backend-auth-submit flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#004d4d] text-sm font-bold text-white shadow-[0_18px_34px_rgba(0,77,77,0.22)] transition hover:bg-[#003434] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#8ba3a3] disabled:shadow-none"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <span>Sign In</span>}
            {!submitting && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="relative mt-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#81f3e5]/40 bg-[#81f3e5]/25 px-4 py-2 text-xs font-semibold text-[#006f66]">
            <ShieldCheck size={15} />
            <span>Secure role-based session</span>
          </div>
        </div>
      </section>
    </main>
  );
}
