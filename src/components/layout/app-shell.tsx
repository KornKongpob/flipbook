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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto thin-scrollbar">
        <div className="px-3 pt-4">
          <Link
            href="/catalogs/new"
            onClick={onLinkClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand/20 transition hover:bg-brand-strong active:scale-[0.99]"
          >
            <PlusCircle className="size-4" />
            New Catalog
          </Link>
        </div>

        <nav className="mt-4 flex flex-col gap-1.5 px-3">
          <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-strong">
            Workspace
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
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                  active
                    ? "bg-brand-soft/90 text-brand shadow-sm"
                    : "text-muted-strong hover:bg-white/80 hover:text-foreground",
                )}
              >
                <span className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-white shadow-sm" : "bg-gray-100 group-hover:bg-white group-hover:shadow-sm",
                )}>
                  <Icon className={cn("size-4 transition-colors", active ? "text-brand" : "text-muted-strong group-hover:text-foreground")} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mt-auto mb-3 rounded-2xl border border-brand/20 bg-brand-soft/50 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-brand/10 blur-xl"></div>
          <div className="flex items-center gap-2 relative z-10">
            <Zap className="size-4 text-brand" />
            <span className="text-sm font-bold text-brand-strong">Pro Tip</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-strong relative z-10">
            Start with a spreadsheet, review low-confidence matches, then finish the design inside the editor.
          </p>
        </div>
      </div>

      <div className="border-t border-line/50 bg-gray-50/50 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-white text-brand shadow-sm border border-line">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{userLabel}</p>
          </div>
        </div>
        <form action={signOutAction} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-strong transition-colors hover:bg-white hover:text-danger hover:shadow-sm"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
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
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-line bg-white/70 backdrop-blur-xl transition-transform duration-200 ease-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex h-14 items-center justify-between px-4 border-b border-line/50">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500 shadow-sm">
              <BookOpen className="size-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Catalog Studio</p>
              <p className="text-[11px] text-muted-strong">Promo workflow v2</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded-md text-muted hover:bg-white/50 hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <SidebarContent pathname={pathname} userLabel={userLabel} initials={initials} onLinkClick={() => setMobileOpen(false)} />
      </div>

      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden h-screen w-72 shrink-0 self-start flex-col overflow-hidden border-r border-line/60 bg-white/60 backdrop-blur-xl lg:sticky lg:top-0 lg:flex">
        <div className="flex h-16 items-center gap-3 px-5 border-b border-line/50">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500 shadow-md shadow-brand/20">
            <BookOpen className="size-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Catalog Studio</p>
            <p className="text-xs text-muted-strong">Promo workflow v2</p>
          </div>
        </div>

        <SidebarContent pathname={pathname} userLabel={userLabel} initials={initials} />
      </aside>

      {/* ─── Main ─── */}
      <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-5 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
