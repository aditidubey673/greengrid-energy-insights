import type { ComponentType, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50", variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90", variant === "secondary" && "border border-border bg-secondary text-secondary-foreground hover:bg-accent", variant === "ghost" && "text-muted-foreground hover:bg-accent hover:text-foreground", className)} {...props}>{children}</button>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-border bg-card/80 shadow-panel backdrop-blur-xl", className)}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
    <div className="min-w-0"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p><h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action && <div className="shrink-0">{action}</div>}
  </header>;
}

export function MetricCard({ label, value, detail, trend, icon: Icon, tone = "green" }: { label: string; value: string; detail: string; trend?: number; icon: ComponentType<{ className?: string }>; tone?: "green" | "blue" | "amber" | "rose" }) {
  const tones = { green: "bg-primary/12 text-primary", blue: "bg-info/12 text-info", amber: "bg-warning/12 text-warning", rose: "bg-danger/12 text-danger" };
  return <Card className="group p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
    <div className="flex items-start justify-between"><div className={cn("grid h-10 w-10 place-items-center rounded-lg", tones[tone])}><Icon className="h-5 w-5" /></div>{trend !== undefined && <span className={cn("flex items-center gap-1 text-xs font-semibold", trend >= 0 ? "text-primary" : "text-danger")}>{trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(trend)}%</span>}</div>
    <p className="mt-5 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-foreground">{value}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p>
  </Card>;
}

export function ChartHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-5 py-4"><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-foreground">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div>{children}</div>;
}

export function StatusDot({ status = "online" }: { status?: "online" | "warning" | "offline" }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", status === "online" && "bg-primary shadow-status", status === "warning" && "bg-warning", status === "offline" && "bg-danger")} />;
}

export function Segmented({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="flex rounded-lg border border-border bg-secondary p-1">{options.map((option) => <button key={option} onClick={() => onChange(option)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors", value === option ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>{option}</button>)}</div>;
}

export const inputClass = "h-11 w-full rounded-lg border border-input bg-secondary px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
export const labelClass = "mb-2 block text-xs font-semibold text-muted-foreground";

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
