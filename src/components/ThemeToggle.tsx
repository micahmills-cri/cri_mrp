"use client";

import clsx from "clsx";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, isReady } = useTheme();

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      className={clsx(
        "fixed bottom-4 right-4 z-50 inline-flex items-center justify-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:bottom-5 sm:right-5",
        "h-10 w-10 border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur",
        "hover:border-slate-300 hover:text-slate-900",
        "dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white",
        "focus-visible:ring-primary-500 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-900",
        className,
      )}
      style={{
        insetInlineEnd: "calc(1rem + env(safe-area-inset-right, 0px))",
        insetBlockEnd: "calc(1rem + env(safe-area-inset-bottom, 0px))",
      }}
      disabled={!isReady}
    >
      <span className="sr-only">{label}</span>
      {isDark ? (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 2a.75.75 0 01.75.75V4a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2zm4.95 2.05a.75.75 0 011.06 0l.848.848a.75.75 0 11-1.061 1.061l-.848-.848a.75.75 0 010-1.06zM4 10a6 6 0 1111.196 2.528.75.75 0 00.8 1.146A7.5 7.5 0 102.5 10a.75.75 0 001.5 0zM3.25 9.25H2a.75.75 0 000 1.5h1.25a.75.75 0 000-1.5zm13.5 0H18a.75.75 0 010 1.5h-1.25a.75.75 0 110-1.5zM5.172 4.818a.75.75 0 010 1.06l-.848.848A.75.75 0 013.263 5.665l.848-.848a.75.75 0 011.06 0zM10 16a.75.75 0 01.75.75V18a.75.75 0 01-1.5 0v-1.25A.75.75 0 0110 16zm5.657-2.657a.75.75 0 011.06 0l.848.848a.75.75 0 01-1.06 1.06l-.848-.848a.75.75 0 010-1.06z" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M17.293 13.293a8 8 0 01-10.586-10.586.75.75 0 00-1.173-.83A9.5 9.5 0 1017.5 15.466a.75.75 0 00-.207-1.173z" />
        </svg>
      )}
    </button>
  );
}
