"use client";

import React, { useState } from "react";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string | null;
}

export function Logo({
  className = "",
  showText = true,
  size = "md",
  href = "/",
}: LogoProps) {
  const [hasLogoImg, setHasLogoImg] = useState(true);

  const sizeClasses = {
    sm: { box: "w-7 h-7 text-xs", text: "text-base", img: "h-5" },
    md: { box: "w-9 h-9 text-sm", text: "text-lg", img: "h-7" },
    lg: { box: "w-12 h-12 text-base", text: "text-2xl", img: "h-9" },
  };

  const currentSize = sizeClasses[size];

  const content = (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Official user-supplied logo image slot with graceful fallback */}
      {hasLogoImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt="Genesoft Infotech"
          className={`${currentSize.img} object-contain`}
          onError={() => setHasLogoImg(false)}
        />
      ) : (
        <div
          className={`${currentSize.box} rounded-xl bg-gradient-to-br from-[#FB923C] to-[#F97316] text-white flex items-center justify-center font-extrabold shadow-md shadow-orange-500/20 border border-white/40`}
          title="Genesoft Infotech"
        >
          G
        </div>
      )}

      {showText && (
        <span className={`font-extrabold tracking-tight text-[#0F172A] dark:text-white ${currentSize.text}`}>
          Genesoft <span className="text-[#F97316]">Infotech</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center hover:opacity-90 transition-opacity cursor-pointer focus:outline-none"
        title="Genesoft Infotech — Return to Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
