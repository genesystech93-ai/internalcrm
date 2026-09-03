"use client";

import React, { useActionState, useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Lock, User, ArrowRight, ShieldCheck, UserCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const fillCredentials = (userLogin: string, userPass: string) => {
    setUsername(userLogin);
    setPassword(userPass);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative">
      {/* Light / Dark Mode Toggle Button */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Floating Liquid Glass Card */}
        <div className="liquid-glass rounded-3xl p-8 sm:p-10 border border-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.08),inset_0_1px_2px_rgba(255,255,255,0.95)]">
          <div className="flex flex-col items-center mb-8 text-center">
            <Logo size="lg" showText={true} href={null} />
            <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8] font-medium">
              Sales Floor Operations & CRM Portal
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#EA580C] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse"></span>
              <span>Night Shift: 7:00 PM – 4:00 AM</span>
            </div>
          </div>

          {state?.error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-400 text-sm font-semibold flex items-center gap-2 backdrop-blur-md">
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
              className="liquid-glass-button-primary w-full mt-2 py-3 px-4 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isPending ? "Authenticating..." : "Log In to Session"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Test Credentials (Development Only — stripped from production builds) */}
          {process.env.NODE_ENV !== "production" && (
          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-center gap-1 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Dev-Only Test Accounts:</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillCredentials("admin", "Admin@123")}
                className="liquid-glass-button-secondary py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Admin (`admin`)</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("agent", "Agent@123")}
                className="liquid-glass-button-secondary py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Agent (`agent`)</span>
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
          &copy; {new Date().getFullYear()} Genesoft Infotech. Proprietary CRM Application.
        </p>
      </div>
    </div>
  );
}
