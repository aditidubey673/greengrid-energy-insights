import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, Trend } from "./ui";

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const formatKwh = (value: number) => `${numberFormat.format(value)} kWh`;
export const formatNumber = (value: number) => numberFormat.format(value);

export type Kpi = {
  label: string;
  value: string;
  unit?: string;
  context: string;
  trend?: { value: number; unit?: string; label: string; positiveIsGood?: boolean };
  note?: string;
};

export function KpiStrip({ items }: { items: Kpi[] }) {
  return <Card className="overflow-hidden">
    <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item, index) => <div
        key={item.label}
        className={cn(
          "flex flex-col gap-1 border-border px-5 py-4",
          index % 2 === 1 && "border-l",
          index >= 2 && "border-t",
          "md:border-l-0 md:border-t-0",
          index % 3 !== 0 && "md:border-l",
          index >= 3 && "md:border-t",
          "xl:border-t-0",
          index !== 0 ? "xl:border-l" : "xl:border-l-0",
        )}
      >
        <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
        <dd className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{item.value}</span>
          {item.unit && <span className="text-sm font-medium text-muted-foreground">{item.unit}</span>}
        </dd>
        <dd className="text-xs text-muted-foreground">{item.context}</dd>
        <dd className="min-h-4">
          {item.trend
            ? <Trend value={item.trend.value} unit={item.trend.unit} label={item.trend.label} positiveIsGood={item.trend.positiveIsGood} />
            : item.note && <span className="text-xs text-muted-foreground/80">{item.note}</span>}
        </dd>
      </div>)}
    </dl>
  </Card>;
}

export type SupplySource = { name: string; kwh: number; color: string; renewable: boolean };

export function SupplyMix({ sources, totalKwh, periodLabel }: { sources: SupplySource[]; totalKwh: number; periodLabel: string }) {
  const renewableKwh = sources.filter((s) => s.renewable).reduce((sum, s) => sum + s.kwh, 0);
  const pct = (kwh: number) => (totalKwh ? (kwh / totalKwh) * 100 : 0);
  return <Card className="flex flex-col">
    <div className="border-b border-border px-5 py-4">
      <h2 className="text-sm font-semibold text-foreground">Supply mix</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Share of total demand by source · {periodLabel}</p>
    </div>
    <div className="flex flex-1 flex-col gap-5 px-5 py-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Renewable <span className="font-semibold tabular-nums text-foreground">{pct(renewableKwh).toFixed(0)}%</span></span>
          <span className="text-muted-foreground">Grid import <span className="font-semibold tabular-nums text-foreground">{(100 - pct(renewableKwh)).toFixed(0)}%</span></span>
        </div>
        <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-sm bg-secondary" role="img" aria-label={`Renewable sources supply ${pct(renewableKwh).toFixed(0)}% of demand`}>
          {sources.map((s) => <div key={s.name} style={{ width: `${pct(s.kwh)}%`, backgroundColor: s.color }} />)}
        </div>
      </div>

      <table className="w-full text-sm">
        <caption className="sr-only">Energy supplied by source</caption>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="pb-2 text-left font-medium">Source</th>
            <th scope="col" className="pb-2 text-right font-medium">Energy</th>
            <th scope="col" className="w-14 pb-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sources.map((s) => <SourceRow key={s.name} source={s} share={pct(s.kwh)} />)}
        </tbody>
        <tfoot>
          <tr className="border-t border-border text-xs">
            <th scope="row" className="pt-3 text-left font-medium text-muted-foreground">Total demand</th>
            <td className="pt-3 text-right font-semibold tabular-nums text-foreground">{formatKwh(totalKwh)}</td>
            <td className="pt-3 text-right tabular-nums text-muted-foreground">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </Card>;
}

function SourceRow({ source, share }: { source: SupplySource; share: number }) {
  return <tr>
    <th scope="row" className="py-2.5 text-left font-normal">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: source.color }} aria-hidden="true" />
        <span className="text-foreground">{source.name}</span>
      </div>
      <div className="ml-4 mt-1.5 h-1 rounded-full bg-secondary">
        <div className="h-1 rounded-full" style={{ width: `${share}%`, backgroundColor: source.color }} />
      </div>
    </th>
    <td className="py-2.5 text-right align-top tabular-nums text-foreground">{formatKwh(source.kwh)}</td>
    <td className="py-2.5 text-right align-top tabular-nums text-muted-foreground">{share.toFixed(1)}%</td>
  </tr>;
}

type TooltipEntry = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number; payload?: Record<string, unknown> };

export function ChartTooltip({ active, payload, label, unit = "kWh", footer }: { active?: boolean; payload?: TooltipEntry[]; label?: string | number; unit?: string; footer?: (payload: TooltipEntry[]) => ReactNode }) {
  if (!active || !payload?.length) return null;
  return <div className="min-w-44 rounded-md border border-border bg-popover px-3 py-2.5 text-xs shadow-md">
    <p className="mb-1.5 font-semibold text-foreground">{label}</p>
    <ul className="space-y-1">
      {payload.map((entry) => <li key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: entry.color }} aria-hidden="true" />
          {entry.name}
        </span>
        <span className="font-medium tabular-nums text-foreground">{formatNumber(Number(entry.value))} {unit}</span>
      </li>)}
    </ul>
    {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{footer(payload)}</div>}
  </div>;
}

export type EventItem = { title: string; detail: string; time: string; status: "online" | "warning" };

export function EventLog({ events }: { events: EventItem[] }) {
  return <Card>
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Event log</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Sample operational events</p>
      </div>
    </div>
    <ol className="divide-y divide-border">
      {events.map((event) => <li key={event.title} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3">
        <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full", event.status === "warning" ? "bg-warning" : "bg-primary")} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm text-foreground">{event.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
        </div>
        <time className="text-xs tabular-nums text-muted-foreground">{event.time}</time>
      </li>)}
    </ol>
  </Card>;
}
