"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Archive, FolderOpen, LayoutDashboard, Settings } from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalogs/new", label: "New Catalog", icon: Archive },
  { href: "/library", label: "Asset Library", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface AppShellProps {
  children: ReactNode;
  userLabel: string;
}

export function AppShell({ children, userLabel }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
      <aside className="glass-panel noise-grid hidden w-72 shrink-0 rounded-[32px] border border-line px-5 py-6 lg:flex lg:flex-col">
        <div className="space-y-2 border-b border-line pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
            Promo Catalog Studio
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Catalog workflow
          </h1>
          <p className="text-sm leading-6 text-muted">
            Import Excel sheets, review Makro image matches, and ship PDF catalogs without leaving the browser.
          </p>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-brand text-white shadow-[0_12px_28px_rgba(235,69,41,0.22)]"
                    : "text-muted-strong hover:bg-white/70 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-line pt-5">
          <div className="rounded-3xl border border-line bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Signed in
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{userLabel}</p>
          </div>
          <form action={signOutAction}>
            <Button variant="secondary" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-6">{children}</main>
    </div>
  );
}
