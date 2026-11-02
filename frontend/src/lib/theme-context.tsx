"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  // Apply theme class to <html> element
  const applyTheme = (targetTheme: Theme) => {
    let effective: "dark" | "light" = "dark";

    if (typeof window !== "undefined") {
      if (targetTheme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        effective = prefersDark ? "dark" : "light";
      } else {
        effective = targetTheme;
      }

      setResolvedTheme(effective);

      const root = document.documentElement;
      if (effective === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
        root.style.colorScheme = "light";
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    try {
      const stored = (localStorage.getItem("writnexa-theme") as Theme) || "dark";
      setThemeState(stored);
      applyTheme(stored);
    } catch {
      applyTheme("dark");
    }

    // Media query listener for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      try {
        const currentStored = (localStorage.getItem("writnexa-theme") as Theme) || "dark";
        if (currentStored === "system") {
          applyTheme("system");
        }
      } catch {}
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("writnexa-theme", newTheme);
    } catch {}
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

