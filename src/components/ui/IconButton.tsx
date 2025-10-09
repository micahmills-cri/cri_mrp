"use client";

import React from "react";
import { clsx } from "clsx";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon: React.ReactNode;
  tooltip?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      loading = false,
      disabled,
      icon,
      tooltip,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const sizeClasses = {
      sm: "p-1.5",
      md: "p-2",
      lg: "p-3",
    };

    const iconSizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    return (
      <button
        className={clsx(
          "inline-flex items-center justify-center rounded-md border font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-[var(--ring-offset)]",
          sizeClasses[size],
          variant === "primary" && [
            "border-transparent",
            "text-[color:var(--color-primary-foreground)]",
            "bg-[var(--color-primary-600)]",
            !isDisabled && "hover:bg-[var(--color-primary-700)]",
            "disabled:bg-[var(--color-primary-600)] disabled:text-[color:var(--color-primary-foreground)] disabled:opacity-60",
          ],
          variant === "secondary" && [
            "border-[var(--button-secondary-border)]",
            "text-[color:var(--button-secondary-foreground)]",
            "bg-[var(--button-secondary-surface)]",
            !isDisabled && "hover:bg-[var(--button-secondary-hover-surface)]",
            "disabled:bg-[var(--button-secondary-surface)] disabled:text-[color:var(--button-secondary-foreground)] disabled:opacity-60 disabled:border-[var(--button-secondary-border)]",
          ],
          variant === "success" && [
            "border-transparent",
            "text-[color:var(--color-success-foreground)]",
            "bg-[var(--color-success-600)]",
            !isDisabled && "hover:bg-[var(--color-success-700)]",
            "disabled:bg-[var(--color-success-600)] disabled:text-[color:var(--color-success-foreground)] disabled:opacity-60",
          ],
          variant === "warning" && [
            "border-transparent",
            "text-[color:var(--color-warning-foreground)]",
            "bg-[var(--color-warning-600)]",
            !isDisabled && "hover:bg-[var(--color-warning-700)]",
            "disabled:bg-[var(--color-warning-600)] disabled:text-[color:var(--color-warning-foreground)] disabled:opacity-60",
          ],
          variant === "danger" && [
            "border-transparent",
            "text-[color:var(--color-danger-foreground)]",
            "bg-[var(--color-danger-600)]",
            !isDisabled && "hover:bg-[var(--color-danger-700)]",
            "disabled:bg-[var(--color-danger-600)] disabled:text-[color:var(--color-danger-foreground)] disabled:opacity-60",
          ],
          variant === "ghost" && [
            "border-transparent",
            "text-[color:var(--button-ghost-foreground)]",
            "bg-transparent",
            !isDisabled &&
              "hover:bg-[var(--button-ghost-hover)] hover:text-[color:var(--foreground)]",
            "disabled:opacity-60 disabled:text-[color:var(--button-ghost-foreground)]",
          ],
          isDisabled && "cursor-not-allowed",
          className,
        )}
        disabled={isDisabled}
        ref={ref}
        title={tooltip}
        {...props}
      >
        {loading ? (
          <svg
            className={clsx("animate-spin", iconSizeClasses[size])}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span className={iconSizeClasses[size]}>{icon}</span>
        )}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
