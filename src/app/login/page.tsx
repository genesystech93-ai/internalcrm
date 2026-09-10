"use client";

import React, { useActionState, useState, useEffect } from "react";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-200">
      {/* Light / Dark Mode Toggle Button */}
      <div className="absolute top-5 right-5 z-30">
        <ThemeToggle />
      </div>

      {/* Left Panel — Executive Midnight Slate Canvas */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[#0F172A] p-12 flex-col justify-between overflow-hidden border-r border-slate-800">
        {/* Subtle architectural grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

        {/* Brand Logo Showcase */}
        <div className="relative z-10">
          <div className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <div className="inline-flex items-center gap-3 p-3 pr-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
              <Logo size="lg" showText={true} href={null} variant="on-dark" imageBadge={true} />
            </div>
          </div>
        </div>

        {/* Center Presentation Pitch */}
        <div className="relative z-10 space-y-6 my-auto py-10">
          <div className={`transition-all duration-500 delay-150 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#FB923C] mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Enterprise Floor Operations</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              High-Velocity<br />Sales Floor Operations
            </h2>
            <p className="mt-2 text-sm text-slate-400 font-medium max-w-md leading-relaxed">
              Designed for high-performance sales teams, automated commissions, strict attendance compliance, and executive lead auditing.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3 pt-2">
            {[
              {
                icon: Zap,
                text: "1-Click Lead Approve, Reject & Reversal Decisions",
                badgeColor: "text-orange-400 bg-orange-500/10 border-orange-500/20",
              },
              {
                icon: BarChart3,
                text: "High-Density Virtualized Pipeline & Real-time Metrics",
                badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
              },
              {
                icon: Clock,
                text: "Automated Shift Attendance, Breaks & SLA Tracking",
                badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              },
            ].map(({ icon: FeatureIcon, text, badgeColor }) => (
              <div
                key={text}
                className="flex items-center gap-3 text-sm text-slate-300"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${badgeColor}`}>
                  <FeatureIcon className="w-4 h-4" />
                </div>
                <span className="font-medium text-xs sm:text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Secure 256-bit Encrypted Enterprise Session</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Corporate Authentication Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        <div className={`w-full max-w-md relative z-10 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {/* Mobile-only Logo */}
          <div className="flex flex-col items-center mb-8 text-center lg:hidden">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm inline-flex items-center mb-3">
              <Logo size="lg" showText={true} href={null} imageBadge={true} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Sales Floor Operations & CRM Platform
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#EA580C] dark:text-[#FB923C] mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Floor Portal Active &bull; Shift Session</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Sign In to Your Workspace
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Enter your corporate credentials to access the operational floor
            </p>
          </div>

          {/* Corporate Card */}
          <div className="p-7 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {state?.error && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Username
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Assigned by Administrator
                  </span>
                </div>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username (e.g. admin)"
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Corporate Primary Orange Action Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 py-2.5 px-4 font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer bg-[#F97316] hover:bg-[#EA580C] text-white border border-[#EA580C] shadow-xs transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Authenticating Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Mobile Footer */}
          <p className="mt-6 text-center text-[11px] text-slate-400 font-medium lg:hidden">
            &copy; {new Date().getFullYear()} CRM Platform. Secure Enterprise Access.
          </p>
        </div>
      </div>
    </div>
  );
}
