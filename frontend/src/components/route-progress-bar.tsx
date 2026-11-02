"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop / complete animation when route changes
  useEffect(() => {
    if (visible) {
      // Snap to 100% then fade out
      setProgress(100);
      const timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [pathname, searchParams]);

  // Intercept click on internal links to start progress bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      // Skip external links, downloads, hash links, or new tabs
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        targetAttr === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's an internal link and points to a different route
      try {
        const currentUrl = new URL(window.location.href);
        const nextUrl = new URL(href, window.location.origin);

        if (
          nextUrl.origin === currentUrl.origin &&
          nextUrl.pathname + nextUrl.search !== currentUrl.pathname + currentUrl.search
        ) {
          // Start progress
          setVisible(true);
          setProgress(15);

          if (timerRef.current) clearInterval(timerRef.current);

          timerRef.current = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 85) {
                if (timerRef.current) clearInterval(timerRef.current);
                return prev;
              }
              const increment = Math.max(1, (85 - prev) * 0.15);
              return Math.min(85, prev + increment);
            });
          }, 120);
        }
      } catch {
        // Fallback for invalid URLs
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visible && progress === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 w-full h-[2.5px] z-[9999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full bg-gradient-to-r from-purple-500 via-sky-400 to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.8)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

