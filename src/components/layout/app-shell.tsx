"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, FolderOpen, LayoutDashboard, Menu, PlusCircle, Settings, X, LogOut } from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalogs/new", label: "New Catalog", icon: PlusCircle },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface AppShellProps {
  children: ReactNode;
  userLabel: string;
}

function SidebarNav({
  pathname,
  onLinkClick,
}: {
  pathname: string;
  onLinkClick?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {navigation.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand text-white"
                : "text-slate-400 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, userLabel }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = userLabel.split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-brand">
            <BookOpen className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Catalog Studio</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-strong transition hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-12 items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-brand">
              <BookOpen className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Catalog Studio</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 py-4 overflow-y-auto">
          <SidebarNav pathname={pathname} onLinkClick={() => setMobileOpen(false)} />
        </div>

        <div className="border-t border-white/10 p-4 space-y-2">
          <p className="truncate text-xs text-slate-400">{userLabel}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col bg-slate-900 lg:flex">
        <div className="flex h-14 items-center gap-2.5 px-4 border-b border-white/10">
          <div className="flex size-7 items-center justify-center rounded-lg bg-brand">
            <BookOpen className="size-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-none">Catalog Studio</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Promo workflow</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 py-4 overflow-y-auto">
          <SidebarNav pathname={pathname} />
        </div>

        <div className="border-t border-white/10 p-4 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {initials}
            </div>
            <p className="truncate text-xs text-slate-400">{userLabel}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col bg-background pt-12 lg:pt-0">
        <div className="flex flex-1 flex-col gap-5 p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
