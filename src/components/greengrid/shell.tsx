import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Calculator, ChevronLeft, CircleGauge, CreditCard, Leaf, Menu, Settings, SunMedium, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

const nav = [
  { label: "Dashboard", to: "/", icon: CircleGauge },
  { label: "Energy Monitoring", to: "/energy-monitoring", icon: Activity },
  { label: "Smart Grid", to: "/smart-grid", icon: Zap },
  { label: "Solar Calculator", to: "/solar-calculator", icon: Calculator },
  { label: "Utility Billing", to: "/utility-billing", icon: CreditCard },
  { label: "Sustainability", to: "/sustainability", icon: Leaf },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const operations = nav.slice(0, 6);
  const admin = nav.slice(6);

  const renderLink = ({ label, to, icon: Icon }: (typeof nav)[number]) => {
    const active = to === "/" ? path === "/" : path.startsWith(to);
    return <Link
      key={to}
      to={to}
      onClick={() => setMobileOpen(false)}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors",
        active ? "bg-card font-semibold text-foreground" : "font-medium text-sidebar-foreground/75 hover:bg-card/60 hover:text-foreground",
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden="true" />}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>;
  };

  return <div className="min-h-screen bg-background text-foreground">
    {mobileOpen && (
      <button
        aria-label="Close navigation"
        className="fixed inset-0 z-40 bg-overlay"
        onClick={() => setMobileOpen(false)}
      />
    )}
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}
      aria-label="Primary"
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <SunMedium className="h-4 w-4" />
          </div>
          {!collapsed && <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">GreenGrid</p>
            <p className="truncate text-xs text-muted-foreground">Campus Energy Management</p>
          </div>}
        </Link>
        <button aria-label="Close navigation" className="rounded-md p-1 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Operations</p>}
        <div className="space-y-0.5">{operations.map(renderLink)}</div>
        {!collapsed && <p className="mb-2 mt-6 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Administration</p>}
        <div className="space-y-0.5">{admin.map(renderLink)}</div>
      </nav>
      {!collapsed && <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-xs font-medium text-foreground">Demo environment</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Sample campus meter data</p>
      </div>}
      <button onClick={() => setCollapsed(!collapsed)} className="hidden h-10 items-center justify-center border-t border-sidebar-border text-muted-foreground transition-colors hover:text-foreground lg:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} /></button>
    </aside>

    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">GreenGrid</span>
            <span className="hidden text-muted-foreground sm:inline" aria-hidden="true">/</span>
            <span className="hidden text-muted-foreground sm:inline">Main Campus, Bengaluru</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs font-semibold">Aditi Dubey</p>
            <p className="text-xs text-muted-foreground">Energy Manager</p>
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border">
            AD
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:px-8 lg:py-7">{children}</main>
    </div>
  </div>;
}
