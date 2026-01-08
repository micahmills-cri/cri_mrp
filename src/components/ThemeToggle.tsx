'use client'

import clsx from 'clsx'
import { useTheme } from '@/components/ThemeProvider'
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, isReady } = useTheme()

  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      className={clsx(
        'fixed bottom-4 right-4 z-50 inline-flex items-center justify-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:bottom-5 sm:right-5',
        'h-10 w-10 border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur',
        'hover:border-slate-300 hover:text-slate-900',
        'dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white',
        'focus-visible:ring-primary-500 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-900',
        className
      )}
      style={{
        insetInlineEnd: 'calc(1rem + env(safe-area-inset-right, 0px))',
        insetBlockEnd: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
      disabled={!isReady}
    >
      <span className="sr-only">{label}</span>
      {isDark ? (
        <SunIcon aria-hidden="true" className="h-5 w-5" />
      ) : (
        <MoonIcon aria-hidden="true" className="h-5 w-5" />
      )}
    </button>
  )
}
