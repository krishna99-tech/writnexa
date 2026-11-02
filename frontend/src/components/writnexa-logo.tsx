"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export interface WritnexaLogoProps {
  variant?: "full" | "icon" | "mark" | "badge";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  href?: string;
  showVersion?: boolean;
}

export function WritnexaLogo({
  variant = "full",
  size = "md",
  className = "",
  href,
  showVersion = false,
}: WritnexaLogoProps) {
  // Height configurations
  const heightMap = {
    xs: 20,
    sm: 26,
    md: 32,
    lg: 40,
    xl: 52,
  };

  const currentHeight = heightMap[size] || 32;

  // Icon only (1:1 aspect ratio)
  if (variant === "icon" || variant === "mark") {
    const iconContent = (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: currentHeight, height: currentHeight }}
      >
        <img
          src="/writnexa-icon.svg"
          alt="Writnexa Icon"
          className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(56,189,248,0.25)]"
        />
      </div>
    );

    if (href) {
      return (
        <Link href={href} className="inline-flex items-center transition-transform hover:scale-105">
          {iconContent}
        </Link>
      );
    }
    return iconContent;
  }

  // Badge variant (1:1 with dark squircle card container)
  if (variant === "badge") {
    const badgeContent = (
      <div
        className={`relative inline-flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/80 p-1.5 shadow-lg shadow-cyan-950/20 group-hover:border-cyan-500/80 transition-colors shrink-0 ${className}`}
        style={{ width: currentHeight + 8, height: currentHeight + 8 }}
      >
        <img
          src="/writnexa-icon.svg"
          alt="Writnexa Badge"
          className="w-full h-full object-contain"
        />
      </div>
    );

    if (href) {
      return <Link href={href}>{badgeContent}</Link>;
    }
    return badgeContent;
  }

  // Full Horizontal Brand Logo (Icon + Divider + Wordmark)
  const logoContent = (
    <div className={`inline-flex items-center gap-2 group shrink-0 ${className}`}>
      {/* 1. Official Gradient Tech Icon */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ height: currentHeight, width: Math.round(currentHeight * 1.5) }}
      >
        <img
          src="/writnexa-icon.svg"
          alt="Writnexa Mark"
          className="h-full w-auto object-contain filter drop-shadow-[0_2px_10px_rgba(56,189,248,0.2)] group-hover:scale-105 transition-transform duration-200"
        />
      </div>

      {/* 2. Vertical Divider */}
      <div className="h-4 w-[1.5px] bg-zinc-600/60 rounded-full" />

      {/* 3. Wordmark Typography */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-bold tracking-tight text-zinc-100 text-base sm:text-lg">
          Writne<span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">xa</span>
        </span>

        {showVersion && (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            v1.0
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

