import React from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card variant for different contexts */
  variant?: "default" | "elevated" | "outlined";
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg";
  /** Whether the card is interactive (clickable) */
  interactive?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "md",
      interactive = false,
      disabled = false,
      className,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        style={style}
        className={clsx(
          "rounded-lg transition-all duration-200 bg-[var(--surface)] text-[color:var(--foreground)]",
          {
            "border border-[var(--border)] shadow-card": variant === "default",
            "border border-[var(--border)] shadow-card": variant === "elevated",
            "border-2 border-[var(--border-strong)] shadow-none":
              variant === "outlined",
          },
          {
            "p-0": padding === "none",
            "p-3": padding === "sm",
            "p-4": padding === "md",
            "p-6": padding === "lg",
          },
          interactive &&
            !disabled && [
              "cursor-pointer hover:shadow-card-hover hover:border-[var(--border-strong)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]",
            ],
          disabled && "opacity-60 cursor-not-allowed",
          className,
        )}
        tabIndex={interactive && !disabled ? 0 : undefined}
        role={interactive ? "button" : undefined}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to include bottom border */
  divider?: boolean;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ divider = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "flex items-center justify-between text-[color:var(--foreground)]",
          {
            "pb-4 border-b border-[var(--border)]": divider,
            "pb-2": !divider,
          },
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardHeader.displayName = "CardHeader";

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Title size variant */
  size?: "sm" | "md" | "lg";
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ size = "md", className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={clsx(
          "font-semibold text-[color:var(--foreground)] leading-tight",
          {
            "text-sm": size === "sm",
            "text-base": size === "md",
            "text-lg": size === "lg",
          },
          className,
        )}
        {...props}
      >
        {children}
      </h3>
    );
  },
);

CardTitle.displayName = "CardTitle";

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx("text-[color:var(--muted-strong)]", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to include top border */
  divider?: boolean;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ divider = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "flex items-center justify-between text-[color:var(--muted-strong)]",
          {
            "pt-4 border-t border-[var(--border)]": divider,
            "pt-2": !divider,
          },
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardFooter.displayName = "CardFooter";
