"use client";

import React, { useState, useEffect } from "react";
import { LayoutDashboard, Users, MessageSquare, User, Clock } from "lucide-react";

interface MobileNavItem {
  label: string;
  icon: React.ElementType;
  scrollTo?: string;
  action?: () => void;
  isActive?: boolean;
}

export function MobileBottomNav() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isVisible, setIsVisible] = useState(false);

  // Only show on mobile viewports
  useEffect(() => {
    const checkViewport = () => {
      setIsVisible(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  if (!isVisible) return null;

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Try to scroll to a section by finding common component landmarks
    const sectionMap: Record<string, string> = {
      dashboard: "body",
      shifts: "[data-section='shift-controls']",
      leads: "[data-section='lead-workspace']",
      chat: "[data-section='chat-widget']",
    };
    const selector = sectionMap[id];
    if (selector && selector !== "body") {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navItems: MobileNavItem[] = [
    { label: "Home", icon: LayoutDashboard, scrollTo: "dashboard" },
    { label: "Shift", icon: Clock, scrollTo: "shifts" },
    { label: "Leads", icon: Users, scrollTo: "leads" },
    { label: "Chat", icon: MessageSquare, scrollTo: "chat" },
    { label: "Profile", icon: User, scrollTo: "top" },
  ];

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Mobile navigation">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.scrollTo;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => item.scrollTo && scrollToSection(item.scrollTo)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[56px] ${
                  isActive
                    ? "text-[#F97316] bg-orange-500/10"
                    : "text-[#94A3B8] hover:text-[#64748B] dark:hover:text-[#CBD5E1]"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                <span className="text-[10px] font-bold">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-[#F97316] mt-0.5 animate-in zoom-in-50 duration-200" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
