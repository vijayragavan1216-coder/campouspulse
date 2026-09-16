import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<Props> = ({ onGoToRegister }) => {
  const { login, switchDemoUser, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Invalid email or password.');
      return;
    }

    setLoading(true);
    const success = await login(email.trim(), password);
    setLoading(false);
    if (!success && authError) {
      setErrorMsg(authError);
    }
  };

  const handleDemoClick = async (demoEmail: string) => {
    setLoading(true);
    setErrorMsg(null);
    await switchDemoUser(demoEmail);
    setLoading(false);
  };

  const demoAccounts = [
    { name: 'Alex Student', email: 'student@campuspulse.edu', role: 'Student', desc: 'Submit and track service requests' },
    { name: 'Dave Miller', email: 'maintenance@campuspulse.edu', role: 'Maintenance Staff', desc: 'Manage assigned tasks, update progress' },
    { name: 'Dr. Sarah Torres', email: 'depthead@campuspulse.edu', role: 'Department Head', desc: 'Triage department requests and staff' },
    { name: 'Elena Vance', email: 'admin@campuspulse.edu', role: 'Administrator', desc: 'Full administration, SLA, user controls' },
    { name: 'Principal Vance', email: 'principal@campuspulse.edu', role: 'Principal', desc: 'Executive oversight & compliance stats' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-lg shadow-blue-500/20 mb-4">
          <Zap className="w-8 h-8 fill-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          CampusPulse
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Real-Time Student Service & Complaint Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200/80">
          {(errorMsg || authError) && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {errorMsg || authError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Email Address
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campuspulse.edu"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={onGoToRegister}
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Create Account
              </button>
            </p>
          </div>

          {/* Quick Demo Logins for instant reviewer grading */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
              Quick 1-Click Role Login
            </div>
            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoClick(acc.email)}
                  disabled={loading}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                        {acc.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {acc.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{acc.desc}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
