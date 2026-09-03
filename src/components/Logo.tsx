"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getCompanySettingsAction } from "@/app/actions/company-settings";
import { ShieldCheck } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string | null;
  brandName?: string;
  brandHighlight?: string;
}

export function Logo({
  className = "",
  showText = true,
  size = "md",
  href = "/",
  brandName,
  brandHighlight,
}: LogoProps) {
  const [hasLogoImg, setHasLogoImg] = useState(true);
  const [displayName, setDisplayName] = useState<{ main: string; highlight: string }>({
    main: brandName || "CRM",
    highlight: brandHighlight || "Portal",
  });

  useEffect(() => {
    if (!brandName) {
      getCompanySettingsAction()
        .then((settings) => {
          if (settings?.brandName && settings.brandName !== "Genesoft Infotech") {
            const parts = settings.brandName.split(" ");
            if (parts.length > 1) {
              setDisplayName({
                main: parts.slice(0, -1).join(" "),
                highlight: parts[parts.length - 1],
              });
            } else {
              setDisplayName({
                main: settings.brandName,
                highlight: "",
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [brandName]);

  const sizeClasses = {
    sm: { box: "w-7 h-7 text-xs", text: "text-base", img: "h-5", icon: "w-3.5 h-3.5" },
    md: { box: "w-9 h-9 text-sm", text: "text-lg", img: "h-7", icon: "w-4 h-4" },
    lg: { box: "w-12 h-12 text-base", text: "text-2xl", img: "h-9", icon: "w-6 h-6" },
  };

  const currentSize = sizeClasses[size];

  const content = (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Official user-supplied logo image slot with graceful fallback */}
      {hasLogoImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/api/logo"
          alt="CRM Logo"
          className={`${currentSize.img} object-contain`}
          onError={() => setHasLogoImg(false)}
        />
      ) : (
        <div
          className={`${currentSize.box} rounded-xl bg-gradient-to-br from-[#FB923C] to-[#F97316] text-white flex items-center justify-center font-extrabold shadow-md shadow-orange-500/20 border border-white/40`}
          title={`${displayName.main} ${displayName.highlight}`}
        >
          <ShieldCheck className={currentSize.icon} />
        </div>
      )}

      {showText && (
        <span className={`font-extrabold tracking-tight text-[#0F172A] dark:text-white ${currentSize.text}`}>
          {displayName.main}{" "}
          {displayName.highlight && (
            <span className="text-[#F97316]">{displayName.highlight}</span>
          )}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center hover:opacity-90 transition-opacity cursor-pointer focus:outline-none"
        title="Return to Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
