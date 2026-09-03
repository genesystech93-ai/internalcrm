"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// 1. useCountUp — Animated number counter hook
// ============================================================
export function useCountUp(end: number, duration: number = 1200): number {
  const [count, setCount] = useState(0);
  const prevEnd = useRef(0);

  useEffect(() => {
    if (end === prevEnd.current) return;
    prevEnd.current = end;

    const startVal = 0;
    const startTime = performance.now();

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = Math.round(startVal + (end - startVal) * easedProgress);
      setCount(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
}

// ============================================================
// 2. MiniSparkline — Tiny inline SVG sparkline chart
// ============================================================
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  className?: string;
}

export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color = "#F97316",
  fillOpacity = 0.15,
  className = "",
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  const gradId = `spark-grad-${color.replace("#", "")}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`inline-block ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity * 2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#${gradId})`}
        className="transition-all duration-500"
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-500"
      />
      {/* Endpoint dot */}
      {data.length > 0 && (
        <circle
          cx={parseFloat(points[points.length - 1].split(",")[0])}
          cy={parseFloat(points[points.length - 1].split(",")[1])}
          r="2"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

// ============================================================
// 3. AnimatedGreeting — Dynamic time-based greeting with live clock
// ============================================================
export function AnimatedGreeting({ name }: { name: string }) {
  const [timeStr, setTimeStr] = useState("");
  const [greeting, setGreeting] = useState("");
  const [emoji, setEmoji] = useState("");

  const updateTime = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const timeFormatted = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
    setTimeStr(timeFormatted);

    if (hours >= 4 && hours < 12) {
      setGreeting("Good Morning");
      setEmoji("☀️");
    } else if (hours >= 12 && hours < 17) {
      setGreeting("Good Afternoon");
      setEmoji("🌤️");
    } else if (hours >= 17 && hours < 21) {
      setGreeting("Good Evening");
      setEmoji("🌇");
    } else {
      setGreeting("Good Night");
      setEmoji("🌙");
    }
  }, []);

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [updateTime]);

  return (
    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-500">
      <div>
        <p className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
          <span className="text-base">{emoji}</span>
          <span>{greeting}, {name}</span>
        </p>
        <p className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] tabular-nums tracking-wide">
          {timeStr} IST
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 4. Skeleton shimmer for loading states
// ============================================================
export function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gradient-to-r from-slate-200/60 via-slate-100/40 to-slate-200/60 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-800/60 ${className}`}
    />
  );
}

export function KPICardSkeleton() {
  return (
    <div className="liquid-glass-card p-5 rounded-3xl space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-3 w-24" />
        <SkeletonPulse className="h-8 w-8 rounded-xl" />
      </div>
      <SkeletonPulse className="h-7 w-20" />
      <SkeletonPulse className="h-3 w-32" />
    </div>
  );
}

// ============================================================
// 5. Page transition wrapper
// ============================================================
export function PageTransition({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both ${className}`}>
      {children}
    </div>
  );
}
