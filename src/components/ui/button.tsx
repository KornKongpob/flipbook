import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-[0_10px_24px_rgba(235,69,41,0.22)] hover:bg-brand-strong",
  secondary:
    "bg-white text-foreground border border-line-strong hover:border-brand/30 hover:bg-brand-soft",
  ghost: "bg-transparent text-foreground hover:bg-white/70",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
) {
  return cn(
    "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    variantClasses[variant],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
