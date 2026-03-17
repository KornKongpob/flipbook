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
      <nav className="flex flex-1 flex-col gap-1 px-3 mt-2">
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Menu</p>
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-gray-400 hover:bg-white/[0.07] hover:text-gray-200",
              )}
            >
              <span className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                active ? "bg-brand text-white" : "bg-white/[0.06] text-gray-400 group-hover:text-gray-300",
              )}>
                <Icon className="size-3.5" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mt-auto mb-2 rounded-lg bg-gradient-to-r from-brand/20 to-purple-500/20 p-3">
        <div className="flex items-center gap-2 text-white">
          <Zap className="size-4 text-amber-400" />
          <span className="text-xs font-semibold">Pro Tip</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
          Upload Excel files to auto-match product images from Makro.
        </p>
      </div>

      <div className="border-t border-white/[0.08] p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-purple-500 text-[10px] font-bold text-white ring-2 ring-white/10">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-300">{userLabel}</p>
          </div>
        </div>
        <form action={signOutAction} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-300"
          >
            <LogOut className="size-3" />
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
      <header className="fixed inset-x-0 top-0 z-30 flex h-13 items-center justify-between border-b border-line bg-white/80 px-4 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500 shadow-sm">
            <BookOpen className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">Catalog Studio</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg border border-line bg-white text-muted-strong transition hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </button>
      </header>

      {/* ─── Mobile overlay ─── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ─── Mobile drawer ─── */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar transition-transform duration-250 ease-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex h-13 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500">
              <BookOpen className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Catalog Studio</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-gray-500 hover:text-white transition">
            <X className="size-4" />
          </button>
        </div>
        <SidebarContent pathname={pathname} userLabel={userLabel} initials={initials} onLinkClick={() => setMobileOpen(false)} />
      </div>

      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2.5 px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500 shadow-lg shadow-brand/20">
            <BookOpen className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Catalog Studio</p>
            <p className="text-[10px] text-gray-500">Promo workflow v2</p>
          </div>
        </div>

        <SidebarContent pathname={pathname} userLabel={userLabel} initials={initials} />
      </aside>

      {/* ─── Main ─── */}
      <main className="flex min-w-0 flex-1 flex-col bg-background pt-13 lg:pt-0">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-5 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
