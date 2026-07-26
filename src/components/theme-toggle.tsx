"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
}

export function ThemeToggle({ showLabel = true, className = "", variant = "outline" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant={variant} size={showLabel ? "default" : "icon"} className={`justify-between ${className}`} disabled>
        <span className="h-4 w-4 rounded-full bg-muted animate-pulse" />
        {showLabel && <span className="text-xs font-medium ml-2">Loading...</span>}
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  return (
    <Button
      variant={variant}
      size={showLabel ? "default" : "icon"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex items-center justify-center gap-2 transition-all duration-300 ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      <div className="relative flex items-center justify-center w-5 h-5">
        <Sun className={`h-4 w-4 transition-transform duration-300 ${isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100 text-amber-500"}`} />
        <Moon className={`absolute h-4 w-4 transition-transform duration-300 ${isDark ? "scale-100 rotate-0 opacity-100 text-indigo-400" : "scale-0 -rotate-90 opacity-0"}`} />
      </div>

      {showLabel && (
        <span className="text-xs font-medium tracking-wide">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </Button>
  );
}
