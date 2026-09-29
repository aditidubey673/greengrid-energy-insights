import type { ComponentType, ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90", variant === "secondary" && "border border-border bg-card text-secondary-foreground hover:bg-secondary", variant === "ghost" && "text-muted-foreground hover:bg-secondary hover:text-foreground", className)} {...props}>{children}</button>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-border bg-card shadow-panel", className)}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{eyebrow}</p>}
      <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>;
}

export function Trend({ value, unit = "%", label, positiveIsGood = true }: { value: number; unit?: string | undefined; label?: string | undefined; positiveIsGood?: boolean | undefined }) {
  const good = value === 0 ? null : (value > 0) === positiveIsGood;
  const Arrow = value >= 0 ? ArrowUp : ArrowDown;
  return <span className="inline-flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
    <span className={cn("inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap font-semibold tabular-nums", good === true && "text-primary", good === false && "text-danger")}>
      <Arrow className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">{value >= 0 ? "Up" : "Down"}</span>
      {Math.abs(value).toFixed(1)}{unit}
    </span>
    {label}
  </span>;
}

export function MetricCard({ label, value, detail, trend, trendLabel, positiveIsGood, icon: Icon }: { label: string; value: string; detail: string; trend?: number; trendLabel?: string | undefined; positiveIsGood?: boolean | undefined; icon?: ComponentType<{ className?: string }>; tone?: "green" | "blue" | "amber" | "rose" }) {
  return <Card className="p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />}
    </div>
    <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-xs text-muted-foreground">{detail}</p>
      {trend !== undefined && <Trend value={trend} label={trendLabel} positiveIsGood={positiveIsGood} />}
    </div>
  </Card>;
}

export function ChartHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4"><div className="min-w-0"><h2 className="text-sm font-semibold text-foreground">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p></div>{children}</div>;
}

export function StatusDot({ status = "online" }: { status?: "online" | "warning" | "offline" }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", status === "online" && "bg-primary", status === "warning" && "bg-warning", status === "offline" && "bg-danger")} />;
}

export function DataSourceNote({ children = "Sample campus meter data" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
    {children}
  </span>;
}

export function Segmented({ value, onChange, options, label = "Period" }: { value: string; onChange: (value: string) => void; options: string[]; label?: string }) {
  return <div role="group" aria-label={label} className="inline-flex rounded-md border border-border bg-secondary p-0.5">{options.map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={cn("rounded-[5px] px-3 py-1 text-xs font-medium capitalize transition-colors", value === option ? "bg-card text-foreground shadow-panel" : "text-muted-foreground hover:text-foreground")}>{option}</button>)}</div>;
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">{items.map((item) => <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
    {item.dashed
      ? <span className="w-3 border-t-2 border-dashed" style={{ borderColor: item.color }} aria-hidden="true" />
      : <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: item.color }} aria-hidden="true" />}
    {item.label}
  </li>)}</ul>;
}

export const inputClass = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
export const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
