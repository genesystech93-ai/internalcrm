"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCircle2, Upload, Calendar, Clock, AlertCircle, User } from "lucide-react";

interface NotificationItem {
  id: string;
  type: "lead_submitted" | "lead_approved" | "leave_request" | "shift_login" | "late_mark" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// Generate realistic floor notifications based on current time
function generateFloorNotifications(): NotificationItem[] {
  const now = new Date();
  const items: NotificationItem[] = [];
  const names = ["Rahul", "Priya", "Arjun", "Sneha", "Vikram", "Ananya"];
  const campaigns = ["Medicare", "Solar", "Insurance", "HomeGuard"];

  // Generate 5-8 realistic notifications
  const count = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const minutesAgo = i * 7 + Math.floor(Math.random() * 5);
    const notifTime = new Date(now.getTime() - minutesAgo * 60000);
    const timeStr = notifTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const name = names[i % names.length];
    const campaign = campaigns[i % campaigns.length];

    const templates: NotificationItem[] = [
      {
        id: `n-${i}`,
        type: "lead_submitted",
        title: "New Lead Submitted",
        message: `${name} submitted lead "John D." (${campaign})`,
        time: timeStr,
        read: i > 2,
      },
      {
        id: `n-${i}`,
        type: "lead_approved",
        title: "Lead Approved",
        message: `Lead "Jane Smith" approved — ₹15 commission credited to ${name}`,
        time: timeStr,
        read: i > 2,
      },
      {
        id: `n-${i}`,
        type: "leave_request",
        title: "Leave Request",
        message: `${name} requested casual leave for tomorrow`,
        time: timeStr,
        read: i > 2,
      },
      {
        id: `n-${i}`,
        type: "shift_login",
        title: "Shift Login",
        message: `${name} logged into ${campaign} shift`,
        time: timeStr,
        read: i > 2,
      },
      {
        id: `n-${i}`,
        type: "late_mark",
        title: "Late Arrival",
        message: `${name} clocked in ${8 + i} min late to ${campaign}`,
        time: timeStr,
        read: i > 2,
      },
    ];

    items.push(templates[i % templates.length]);
  }

  return items;
}

const typeIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  lead_submitted: { icon: Upload, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  lead_approved: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  leave_request: { icon: Calendar, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  shift_login: { icon: Clock, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
  late_mark: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  system: { icon: Bell, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10" },
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(generateFloorNotifications());
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative liquid-glass-button-secondary w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? "text-[#F97316] animate-bounce" : "text-[#64748B]"}`} style={unreadCount > 0 ? { animationDuration: "2s" } : {}} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-lg shadow-red-500/30 animate-in zoom-in-50 duration-300">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 border border-slate-200 dark:border-slate-800 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#F97316]" />
              <span className="text-sm font-bold text-[#0F172A] dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-[#F97316] hover:text-[#EA580C] cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-[#94A3B8]" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.map((notif, idx) => {
              const config = typeIcons[notif.type] || typeIcons.system;
              const IconComp = config.icon;
              return (
                <div
                  key={notif.id + idx}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                    notif.read
                      ? "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      : "bg-orange-500/[0.03] dark:bg-orange-500/5 hover:bg-orange-500/[0.06]"
                  } animate-in fade-in slide-in-from-right-2 duration-300`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  onClick={() => {
                    setNotifications((prev) =>
                      prev.map((n, i) => (i === idx ? { ...n, read: true } : n))
                    );
                  }}
                >
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <IconComp className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold ${notif.read ? "text-[#475569] dark:text-[#94A3B8]" : "text-[#0F172A] dark:text-white"}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#F97316] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">{notif.message}</p>
                    <p className="text-[10px] text-[#94A3B8] dark:text-[#64748B] font-mono mt-1">{notif.time}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <p className="text-[10px] text-center text-[#94A3B8] font-medium">
              Floor activity from this shift session
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
