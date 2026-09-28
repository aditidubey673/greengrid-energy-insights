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
  const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  return <div className="min-h-screen bg-background text-foreground">
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar/95 backdrop-blur-xl transition-all duration-300", collapsed ? "w-20" : "w-64", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
      <div className="flex h-20 items-center justify-between border-b border-border px-5"><Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><SunMedium className="h-5 w-5" /></div>{!collapsed && <div className="min-w-0"><p className="truncate text-lg font-bold">GreenGrid</p><p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">Energy intelligence</p></div>}</Link><button aria-label="Close navigation" className="text-muted-foreground lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">{nav.map(({ label, to, icon: Icon }) => { const active = to === "/" ? path === "/" : path.startsWith(to); return <Link key={to} to={to} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={cn("flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className="h-5 w-5 shrink-0" />{!collapsed && <span className="truncate">{label}</span>}{active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}</Link>; })}</nav>
      {!collapsed && <div className="m-3 rounded-lg border border-primary/15 bg-primary/5 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-primary"><span className="h-2 w-2 rounded-full bg-primary shadow-status" />All systems operational</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Last synced 2 minutes ago</p></div>}
      <button onClick={() => setCollapsed(!collapsed)} className="hidden h-12 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:text-foreground lg:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} /></button>
    </aside>
    <div className={cn("transition-[margin] duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")}><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6"><div className="flex items-center gap-3"><Button variant="ghost" className="h-9 w-9 p-0 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button><div><p className="text-sm font-semibold">GreenGrid Operations</p><p className="hidden text-xs text-muted-foreground sm:block">Bengaluru Campus · Live</p></div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold">Aditi Dubey</p><p className="text-[11px] text-muted-foreground">Energy Manager</p></div><div className="grid h-9 w-9 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xs font-bold text-primary">AD</div></div></header><main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">{children}</main></div>
  </div>;
}
