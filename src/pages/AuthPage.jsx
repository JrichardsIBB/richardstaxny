import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FaGoogle, FaApple } from 'react-icons/fa';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export default function AuthPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.pathname === '/signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp, signInWithProvider } = useAuth();
  const navigate = useNavigate();

  const from = location.state?.from?.pathname || '/contact';

  function switchTab(tab) {
    setActiveTab(tab);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      toast.error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email, password);
      toast.success('Account created! Check your email to verify.');
    } catch (err) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAuth(provider) {
    try {
      await signInWithProvider(provider);
    } catch (err) {
      toast.error(err.message || `Failed to continue with ${provider}`);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg overflow-hidden">
        {/* Tabs */}
        <div className="flex" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'signin'}
            aria-controls="signin-panel"
            id="signin-tab"
            onClick={() => switchTab('signin')}
            className={`flex-1 py-4 text-center font-semibold text-sm transition-colors ${
              activeTab === 'signin'
                ? 'bg-white text-brand-blue-500 border-b-2 border-brand-blue-500'
                : 'bg-gray-50 text-gray-500 border-b border-gray-200 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'signup'}
            aria-controls="signup-panel"
            id="signup-tab"
            onClick={() => switchTab('signup')}
            className={`flex-1 py-4 text-center font-semibold text-sm transition-colors ${
              activeTab === 'signup'
                ? 'bg-white text-brand-blue-500 border-b-2 border-brand-blue-500'
                : 'bg-gray-50 text-gray-500 border-b border-gray-200 hover:text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="p-8">
          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuth('google')}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <FaGoogle className="text-lg text-red-500" />
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth('apple')}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-black px-4 py-2.5 font-medium text-white transition hover:bg-gray-900"
            >
              <FaApple className="text-lg" />
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-500">
                or {activeTab === 'signin' ? 'sign in' : 'sign up'} with email
              </span>
            </div>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <div role="tabpanel" id="signin-panel" aria-labelledby="signin-tab">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label htmlFor="signin-email" className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/30"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="signin-password" className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/30"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-brand-blue-500 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-blue-600 disabled:opacity-50"
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <div role="tabpanel" id="signup-panel" aria-labelledby="signup-tab">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div>
                  <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/30"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/30"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label htmlFor="signup-confirm" className="mb-1 block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/30"
                    placeholder="Re-enter password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-brand-blue-500 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-blue-600 disabled:opacity-50"
                >
                  {submitting ? 'Creating account...' : 'Sign Up'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
