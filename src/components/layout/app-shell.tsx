"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen, FolderOpen, LayoutDashboard, Menu, PlusCircle,
  Settings, X, LogOut, Zap,
} from "lucide-react";
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

function SidebarContent({
  pathname,
  userLabel,
  initials,
  onLinkClick,
}: {
  pathname: string;
  userLabel: string;
  initials: string;
  onLinkClick?: () => void;
}) {
  return (
    <>
      <nav className="flex flex-1 flex-col gap-1.5 px-3 mt-4">
        <p className="px-3 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
          Menu
        </p>
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                active
                  ? "bg-brand text-white shadow-md shadow-brand/30"
                  : "hover:bg-[rgba(255,255,255,0.1)]",
              )}
              style={active ? undefined : { color: "#e2e8f0" }}
            >
              <span className={cn(
                "flex size-7 items-center justify-center rounded-md",
                active ? "bg-white/25" : "bg-[rgba(255,255,255,0.08)]",
              )}>
                <Icon className="size-4" style={active ? { color: "#ffffff" } : { color: "#cbd5e1" }} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mt-auto mb-3 rounded-lg p-3.5" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.2))" }}>
        <div className="flex items-center gap-2">
          <Zap className="size-4" style={{ color: "#fbbf24" }} />
          <span className="text-sm font-bold" style={{ color: "#ffffff" }}>Pro Tip</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>
          Upload Excel files to auto-match product images from Makro.
        </p>
      </div>

      <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#ffffff", boxShadow: "0 0 0 2px rgba(255,255,255,0.15)" }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: "#e2e8f0" }}>{userLabel}</p>
          </div>
        </div>
        <form action={signOutAction} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-[rgba(255,255,255,0.08)]"
            style={{ color: "#94a3b8" }}
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

export function AppShell({ children, userLabel }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = userLabel.split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* ─── Mobile header ─── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500 shadow-sm">
            <BookOpen className="size-4 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">Catalog Studio</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg border border-line bg-white text-muted-strong transition hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* ─── Mobile overlay ─── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ─── Mobile drawer ─── */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 ease-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )} style={{ backgroundColor: "#111827" }}>
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500">
              <BookOpen className="size-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#ffffff" }}>Catalog Studio</p>
              <p className="text-[11px]" style={{ color: "#94a3b8" }}>Promo workflow v2</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded transition-colors hover:bg-[rgba(255,255,255,0.1)]" style={{ color: "#94a3b8" }}>
            <X className="size-5" />
          </button>
        </div>
        <SidebarContent pathname={pathname} userLabel={userLabel} initials={initials} onLinkClick={() => setMobileOpen(false)} />
      </div>

      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden w-64 shrink-0 flex-col lg:flex" style={{ backgroundColor: "#111827" }}>
        <div className="flex h-16 items-center gap-3 px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500 shadow-lg shadow-brand/25">
            <BookOpen className="size-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "#ffffff" }}>Catalog Studio</p>
            <p className="text-xs" style={{ color: "#94a3b8" }}>Promo workflow v2</p>
          </div>
        </div>

        <SidebarContent pathname={pathname} userLabel={userLabel} initials={initials} />
      </aside>

      {/* ─── Main ─── */}
      <main className="flex min-w-0 flex-1 flex-col bg-background pt-14 lg:pt-0">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-5 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
