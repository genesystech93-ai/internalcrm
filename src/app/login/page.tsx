"use client";

import React, { useActionState, useState, useEffect } from "react";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Lock, User, ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Light / Dark Mode Toggle Button */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Left Panel — Brand Gradient (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[#F97316] via-[#EA580C] to-[#C2410C] dark:from-[#0B0F19] dark:via-[#1a1425] dark:to-[#0B0F19] p-12 flex-col justify-between overflow-hidden">
        {/* Floating decorative orbs */}
        <div className="absolute top-[-120px] right-[-80px] w-[400px] h-[400px] rounded-full bg-white/10 dark:bg-orange-500/10 blur-[80px] animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute bottom-[-80px] left-[-60px] w-[350px] h-[350px] rounded-full bg-amber-300/15 dark:bg-orange-500/8 blur-[70px]" />
        <div className="absolute top-[40%] left-[30%] w-[250px] h-[250px] rounded-full bg-white/5 dark:bg-purple-500/8 blur-[60px] animate-pulse" style={{ animationDuration: "8s" }} />

        {/* Brand Content */}
        <div className="relative z-10">
          <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <Logo size="lg" showText={true} href={null} />
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div className={`transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-3xl font-extrabold text-white dark:text-white tracking-tight leading-tight">
              High-Velocity<br />Sales Floor CRM
            </h2>
            <p className="mt-3 text-sm text-white/70 dark:text-slate-400 font-medium max-w-sm leading-relaxed">
              Enterprise-grade operations platform built for night shift teams. Real-time leads, automated commissions, and floor analytics.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: Zap, text: "1-Click Lead Approve & Reject Decisions", delay: 300 },
              { icon: BarChart3, text: "Live Conversion Funnel & Leaderboards", delay: 400 },
              { icon: Shield, text: "IP Whitelisted & Role-Based Access", delay: 500 },
            ].map(({ icon: FeatureIcon, text, delay }) => (
              <div
                key={text}
                className={`flex items-center gap-3 text-sm text-white/80 dark:text-slate-300 transition-all duration-700 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                style={{ transitionDelay: `${delay}ms` }}
              >
                <div className="w-8 h-8 rounded-xl bg-white/15 dark:bg-orange-500/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <FeatureIcon className="w-4 h-4 text-white dark:text-orange-400" />
                </div>
                <span className="font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`relative z-10 transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <p className="text-xs text-white/50 dark:text-slate-500 font-medium">
            © {new Date().getFullYear()} Genesoft Infotech. Proprietary CRM Application.
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        <div className={`w-full max-w-md relative z-10 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {/* Mobile-only Logo */}
          <div className="flex flex-col items-center mb-8 text-center lg:hidden">
            <Logo size="lg" showText={true} href={null} />
            <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8] font-medium">
              Sales Floor Operations & CRM Portal
            </p>
          </div>

          {/* Desktop: Minimal header */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8] font-medium">
              Sign in to your floor operations session
            </p>
          </div>

          {/* Shift indicator */}
          <div className="flex justify-center lg:justify-start mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#EA580C] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse"></span>
              <span>Night Shift: 7:00 PM – 4:00 AM</span>
            </div>
          </div>

          {/* Floating Liquid Glass Card */}
          <div className="liquid-glass rounded-3xl p-8 sm:p-10 border border-white/80 dark:border-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.08),inset_0_1px_2px_rgba(255,255,255,0.95)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
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
                    Created by Admin
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
                className="liquid-glass-button-primary w-full mt-2 py-3 px-4 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 group relative overflow-hidden"
              >
                {isPending && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
                <span>{isPending ? "Authenticating..." : "Log In to Session"}</span>
                <ArrowRight className={`w-4 h-4 transition-transform ${isPending ? "animate-pulse" : "group-hover:translate-x-0.5"}`} />
              </button>
            </form>
          </div>

          {/* Footer info — Mobile only */}
          <p className="mt-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8] font-medium lg:hidden">
            &copy; {new Date().getFullYear()} Genesoft Infotech. Proprietary CRM Application.
          </p>
        </div>
      </div>
    </div>
  );
}
