import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-strong hover:shadow-md active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2",
  secondary:
    "bg-white text-foreground border border-line hover:border-brand/30 hover:bg-brand-soft active:bg-brand-soft/80 focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2",
  ghost:
    "bg-transparent text-muted-strong hover:bg-gray-100 hover:text-foreground",
  danger:
    "bg-danger text-white hover:bg-red-600 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:ring-offset-2",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
) {
  return cn(
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-all duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50",
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
