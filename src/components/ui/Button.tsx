"use client";

import React from "react";
import { clsx } from "clsx";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      icon,
      iconPosition = "left",
      fullWidth = false,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={clsx(
          "inline-flex items-center border font-medium rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-[var(--ring-offset)]",
          {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
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
          fullWidth && "w-full",
          isDisabled && "cursor-not-allowed",
          className,
        )}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        )}
        {icon && iconPosition === "left" && !loading && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {icon && iconPosition === "right" && !loading && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

// Manufacturing-specific button variants for common operations
export const ActionButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="primary" ref={ref} {...props} />);

export const StartButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="success" ref={ref} {...props} />);

export const PauseButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="warning" ref={ref} {...props} />);

export const StopButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="danger" ref={ref} {...props} />);

export const SecondaryButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "variant">
>((props, ref) => <Button variant="secondary" ref={ref} {...props} />);

ActionButton.displayName = "ActionButton";
StartButton.displayName = "StartButton";
PauseButton.displayName = "PauseButton";
StopButton.displayName = "StopButton";
SecondaryButton.displayName = "SecondaryButton";
