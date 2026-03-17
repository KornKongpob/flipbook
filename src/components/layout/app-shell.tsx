"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, FolderOpen, LayoutDashboard, Menu, PlusCircle, Settings, X, LogOut, User } from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & recent jobs" },
  { href: "/catalogs/new", label: "New Catalog", icon: PlusCircle, description: "Start from Excel sheet" },
  { href: "/library", label: "Asset Library", icon: FolderOpen, description: "Images & mappings" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Diagnostics & config" },
];

interface AppShellProps {
  children: ReactNode;
  userLabel: string;
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: (typeof navigation)[number];
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
        active
          ? "bg-brand text-white shadow-[0_8px_24px_rgba(235,69,41,0.28)]"
          : "text-muted-strong hover:bg-white/80 hover:text-foreground hover:shadow-sm",
      )}
    >
      <span className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
        active ? "bg-white/20" : "bg-white/60 group-hover:bg-brand-soft",
      )}>
        <Icon className={cn("size-4", active ? "text-white" : "text-muted-strong group-hover:text-brand")} />
      </span>
      <span className="min-w-0">
        <span className="block leading-snug">{item.label}</span>
        {!active && (
          <span className="block text-[11px] font-normal text-muted opacity-0 transition-opacity group-hover:opacity-100">
            {item.description}
          </span>
        )}
      </span>
    </Link>
  );
}

export function AppShell({ children, userLabel }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = userLabel
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-background/90 px-4 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-brand">
            <BookOpen className="size-3.5 text-white" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            Catalog Studio
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex size-9 items-center justify-center rounded-xl border border-line bg-white/80 text-muted-strong transition hover:bg-white hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col glass-panel border-r border-line px-5 py-6 transition-transform duration-300 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-brand shadow-[0_4px_12px_rgba(235,69,41,0.3)]">
              <BookOpen className="size-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Promo Studio</p>
              <p className="font-display text-sm font-semibold text-foreground">Catalog Workflow</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex size-8 items-center justify-center rounded-xl border border-line bg-white/80 text-muted transition hover:bg-white hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1.5">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <NavLink
                key={item.href}
                item={item}
                active={active}
                onClick={() => setMobileOpen(false)}
              />
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-line pt-5">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/70 p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-bold text-brand">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Signed in</p>
              <p className="truncate text-sm font-medium text-foreground">{userLabel}</p>
            </div>
          </div>
          <form action={signOutAction}>
            <Button variant="secondary" className="w-full gap-2">
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </form>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="noise-grid hidden w-64 shrink-0 rounded-[28px] border border-line bg-card/90 px-4 py-5 shadow-[0_8px_32px_rgba(90,42,14,0.08)] backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-line pb-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand shadow-[0_4px_14px_rgba(235,69,41,0.32)]">
            <BookOpen className="size-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Promo Studio</p>
            <h1 className="font-display text-sm font-bold tracking-tight text-foreground">Catalog Workflow</h1>
          </div>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1.5">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <NavLink key={item.href} item={item} active={active} />;
          })}
        </nav>

        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/70 p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-bold text-brand">
              <User className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Signed in</p>
              <p className="truncate text-sm font-medium text-foreground">{userLabel}</p>
            </div>
          </div>
          <form action={signOutAction}>
            <Button variant="secondary" className="w-full gap-2 text-xs">
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content — push down on mobile for fixed header */}
      <main className="flex min-w-0 flex-1 flex-col gap-6 pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
