import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SurfaceCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-card shadow-sm backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export function SurfaceCardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-b border-line/80 px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export function SurfaceCardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function SurfaceCardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-t border-line/80 px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}
