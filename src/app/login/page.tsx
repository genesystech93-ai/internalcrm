"use client";

import React, { useActionState, useState, useEffect } from "react";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Lock, User, ArrowRight, Shield, Zap, BarChart3, Sparkles, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-50 dark:bg-[#07090E] transition-colors duration-300">
      {/* Light / Dark Mode Toggle Button */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Left Panel — Executive Deep Midnight & Frosted Glass Slate */}
      <div className="hidden lg:flex lg:w-[46%] relative bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] p-12 flex-col justify-between overflow-hidden border-r border-slate-800/50 shadow-2xl">
        {/* Subtle dot matrix architectural grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

        {/* Ambient Luminescent Orbs */}
        <div className="absolute top-[-100px] right-[-60px] w-[450px] h-[450px] rounded-full bg-blue-600/15 blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: "7s" }} />
        <div className="absolute bottom-[-80px] left-[-60px] w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[90px] pointer-events-none" />
        <div className="absolute top-[45%] left-[25%] w-[280px] h-[280px] rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: "9s" }} />

        {/* Brand Logo Showcase */}
        <div className="relative z-10">
          <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="inline-flex items-center gap-3 p-3 pr-6 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
              <Logo size="lg" showText={true} href={null} variant="on-dark" imageBadge={true} />
            </div>
          </div>
        </div>

        {/* Center Presentation Pitch */}
        <div className="relative z-10 space-y-8 my-auto py-12">
          <div className={`transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-xs font-semibold text-blue-300 mb-4 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Operations & Workforce Management</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              High-Velocity<br />Sales Floor Operations
            </h2>
            <p className="mt-3 text-sm text-slate-300 font-medium max-w-md leading-relaxed">
              Tailored for fast-paced inside sales floors, automated commissions, attendance enforcement, and administrative quality auditing.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3.5">
            {[
              {
                icon: Zap,
                text: "1-Click Lead Approve, Reject & Reversal Decisions",
                delay: 300,
                badgeColor: "text-amber-400 bg-amber-400/15 border-amber-400/25",
              },
              {
                icon: BarChart3,
                text: "60 FPS Virtualized Pipeline & Live Leaderboards",
                delay: 400,
                badgeColor: "text-blue-400 bg-blue-400/15 border-blue-400/25",
              },
              {
                icon: Shield,
                text: "Strict Global WAN IP Security & Exempt Admin Access",
                delay: 500,
                badgeColor: "text-emerald-400 bg-emerald-400/15 border-emerald-400/25",
              },
            ].map(({ icon: FeatureIcon, text, delay, badgeColor }) => (
              <div
                key={text}
                className={`flex items-center gap-3.5 text-sm text-slate-200 transition-all duration-700 ${
                  mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                }`}
                style={{ transitionDelay: `${delay}ms` }}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border ${badgeColor}`}>
                  <FeatureIcon className="w-4 h-4" />
                </div>
                <span className="font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className={`relative z-10 transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Secure 256-bit Encrypted Session &bull; Protected Access</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        <div className={`w-full max-w-md relative z-10 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {/* Mobile-only Logo */}
          <div className="flex flex-col items-center mb-8 text-center lg:hidden">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg inline-flex items-center mb-3">
              <Logo size="lg" showText={true} href={null} imageBadge={true} />
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
              Sales Floor Operations & CRM Portal
            </p>
          </div>

          {/* Desktop: Minimal header */}
          <div className="hidden lg:block mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Floor Portal Active &bull; Night Shift Session</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-[#64748B] dark:text-[#94A3B8] font-medium">
              Sign in to your floor operations session
            </p>
          </div>

          {/* Floating Liquid Glass Card */}
          <div className="liquid-glass rounded-3xl p-8 sm:p-10 border border-white/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.06),inset_0_1px_2px_rgba(255,255,255,0.95)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl">
            {state?.error && (
              <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-400 text-sm font-semibold flex items-center gap-2 backdrop-blur-md animate-in fade-in shake-x duration-300">
                <span className="text-base">⚠️</span>
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                    Username
                  </label>
                  <span className="text-[11px] text-[#94A3B8]">
                    Assigned by Admin
                  </span>
                </div>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    name="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or agent"
                    className="liquid-glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-sm placeholder-[#94A3B8] focus:outline-none"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="liquid-glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-sm placeholder-[#94A3B8] focus:outline-none"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-3 py-3.5 px-4 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {isPending && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Authenticating Session...</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Session</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer info — Mobile only */}
          <p className="mt-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8] font-medium lg:hidden">
            &copy; {new Date().getFullYear()} Enterprise CRM Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
