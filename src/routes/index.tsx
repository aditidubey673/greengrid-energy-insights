import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/greengrid/shell";
import { chartColors, energySeries } from "@/components/greengrid/data";
import { useEnergySettings } from "@/components/greengrid/settings-store";
import { Card, ChartHeader, ChartLegend, DataSourceNote, PageHeader, Segmented, Trend } from "@/components/greengrid/ui";
import { ChartTooltip, EventLog, formatKwh, formatNumber, KpiStrip, SupplyMix, type EventItem, type Kpi } from "@/components/greengrid/dashboard-panels";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Campus Energy Overview | GreenGrid" }, { name: "description", content: "Monitor campus demand, renewable contribution and grid dependency." }, { property: "og:title", content: "Campus Energy Overview | GreenGrid" }, { property: "og:description", content: "Monitor campus demand, renewable contribution and grid dependency." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Dashboard,
});

const dashboardViews = {
  daily: {
    metrics: { consumption: "2,000 kWh", renewable: "744 kWh", renewableShare: 37, emissions: "1,030 kg", bill: "₹16,120" },
    periodLabel: "Today",
    averageLabel: "avg/hour",
    averageDivisor: 24,
    previousLabel: "vs yesterday",
    previousRenewableShare: 34.6,
    previousConsumption: 2100,
    trendTitle: "Hourly demand vs renewable supply",
    comparisonTitle: "Consumption by hour",
    comparisonSubtitle: "Today compared with yesterday",
    comparison: [{ name: "00:00", current: 180, previous: 205 }, { name: "04:00", current: 150, previous: 168 }, { name: "08:00", current: 310, previous: 288 }, { name: "12:00", current: 425, previous: 452 }, { name: "16:00", current: 390, previous: 416 }, { name: "20:00", current: 330, previous: 348 }, { name: "24:00", current: 215, previous: 226 }],
  },
  weekly: {
    metrics: { consumption: "15,190 kWh", renewable: "6,025 kWh", renewableShare: 40, emissions: "7,514 kg", bill: "₹1,22,410" },
    periodLabel: "This week",
    averageLabel: "avg/day",
    averageDivisor: 7,
    previousLabel: "vs last week",
    previousRenewableShare: 37.8,
    previousConsumption: 15910,
    trendTitle: "Daily demand vs renewable supply",
    comparisonTitle: "Consumption by day",
    comparisonSubtitle: "This week compared with last week",
    comparison: [{ name: "Mon", current: 2210, previous: 2340 }, { name: "Tue", current: 2390, previous: 2480 }, { name: "Wed", current: 2180, previous: 2290 }, { name: "Thu", current: 2520, previous: 2610 }, { name: "Fri", current: 2360, previous: 2490 }, { name: "Sat", current: 1880, previous: 1960 }, { name: "Sun", current: 1650, previous: 1740 }],
  },
  monthly: {
    metrics: { consumption: "7,248 kWh", renewable: "3,842 kWh", renewableShare: 53, emissions: "1,824 kg", bill: "₹58,420" },
    periodLabel: "June",
    averageLabel: "avg/day",
    averageDivisor: 30,
    previousLabel: "vs June last year",
    previousRenewableShare: 48.8,
    previousConsumption: 7640,
    trendTitle: "Monthly demand vs renewable supply",
    comparisonTitle: "Consumption by month",
    comparisonSubtitle: "This year compared with last year",
    comparison: [{ name: "Jan", current: 6840, previous: 7210 }, { name: "Feb", current: 6210, previous: 6940 }, { name: "Mar", current: 7180, previous: 7480 }, { name: "Apr", current: 6920, previous: 7360 }, { name: "May", current: 7520, previous: 7810 }, { name: "Jun", current: 7248, previous: 7640 }],
  },
};

type Period = keyof typeof dashboardViews;

const sourceSplit = [
  { name: "Solar", share: 0.55, color: "var(--source-solar)" },
  { name: "Wind", share: 0.25, color: "var(--source-wind)" },
  { name: "Hydro", share: 0.2, color: "var(--source-hydro)" },
];

const sampleEvents: EventItem[] = [
  { title: "Peak demand threshold reached", detail: "Main Office · 1,124 kW against 1,100 kW limit", time: "14:32", status: "warning" },
  { title: "Solar array 02 back online", detail: "Rooftop, Block C · inverter fault cleared", time: "13:56", status: "online" },
  { title: "Monthly energy report generated", detail: "Sent to facilities team", time: "12:40", status: "online" },
  { title: "Grid frequency stabilised", detail: "50.02 Hz · within tolerance", time: "10:44", status: "online" },
];

const axisProps = { stroke: chartColors.muted, fontSize: 11, tickLine: false, axisLine: false } as const;
const kwhTick = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : String(value));

function Dashboard() {
  const [period, setPeriod] = useState<Period>("monthly");
  const selectPeriod = (value: string) => { if (value === "daily" || value === "weekly" || value === "monthly") setPeriod(value); };
  const series = energySeries[period];
  const view = dashboardViews[period];
  const es = useEnergySettings();

  const kwh = Number(view.metrics.consumption.replace(/[^0-9]/g, ""));
  const renewKwh = Number(view.metrics.renewable.replace(/[^0-9]/g, ""));
  const gridKwh = kwh - renewKwh;
  const gridShare = 100 - view.metrics.renewableShare;
  const emissions = gridKwh * es.emissionFactor;
  const cost = kwh * es.tariff;
  const previousKwh = view.previousConsumption;
  const consumptionChange = ((kwh - previousKwh) / previousKwh) * 100;
  const shareChange = view.metrics.renewableShare - view.previousRenewableShare;

  const kpis: Kpi[] = [
    { label: "Consumption", value: formatNumber(kwh), unit: "kWh", context: `${(kwh / view.averageDivisor).toFixed(1)} kWh ${view.averageLabel}`, trend: { value: consumptionChange, label: view.previousLabel, positiveIsGood: false } },
    { label: "Renewable generation", value: formatNumber(renewKwh), unit: "kWh", context: `${view.metrics.renewableShare}% of total demand`, trend: { value: shareChange, unit: " pts", label: view.previousLabel } },
    { label: "Renewable share", value: String(view.metrics.renewableShare), unit: "%", context: "Target 60% by year-end", note: `${60 - view.metrics.renewableShare} pts to target` },
    { label: "Grid dependency", value: String(gridShare), unit: "%", context: `${formatKwh(gridKwh)} imported`, trend: { value: -shareChange, unit: " pts", label: view.previousLabel, positiveIsGood: false } },
    { label: "Energy cost", value: `₹${formatNumber(cost)}`, context: "Estimated from configured tariff", note: `₹${es.tariff}/kWh` },
    { label: "Carbon emissions", value: formatNumber(emissions), unit: "kg CO2e", context: "Based on current grid factor", note: `${es.emissionFactor} kg CO2e/kWh on grid import` },
  ];

  const sources = [
    ...sourceSplit.map((s) => ({ name: s.name, kwh: Math.round(renewKwh * s.share), color: s.color, renewable: true })),
    { name: "Grid import", kwh: gridKwh, color: "var(--source-grid)", renewable: false },
  ];

  return <AppShell>
    <PageHeader
      eyebrow="Dashboard"
      title="Campus Energy Overview"
      description="Monitor campus demand, renewable contribution and grid dependency."
      action={<div className="flex flex-col items-start gap-2 sm:items-end">
        <Segmented value={period} onChange={selectPeriod} options={["daily", "weekly", "monthly"]} label="Reporting period" />
        <DataSourceNote>Demo data · {view.periodLabel} 2026</DataSourceNote>
      </div>}
    />

    <KpiStrip items={kpis} />

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
      <Card>
        <ChartHeader title={view.trendTitle} subtitle="How much of campus demand is met by on-site renewables">
          <ChartLegend items={[{ label: "Total demand", color: chartColors.primary }, { label: "Renewable supply", color: "var(--source-hydro)" }]} />
        </ChartHeader>
        <div className="h-80 px-2 pb-3 pt-5 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="name" {...axisProps} dy={8} />
              <YAxis {...axisProps} width={44} tickFormatter={kwhTick} label={{ value: "kWh", angle: -90, position: "insideLeft", fill: chartColors.muted, fontSize: 11, dx: 4 }} />
              <Tooltip
                cursor={{ stroke: chartColors.muted, strokeDasharray: "3 3" }}
                content={(props) => <ChartTooltip {...(props as object)} footer={(payload) => {
                  const row = payload[0]?.payload as { usage: number; renewable: number } | undefined;
                  return row ? `Renewable share ${((row.renewable / row.usage) * 100).toFixed(0)}%` : null;
                }} />}
              />
              <Area type="monotone" dataKey="usage" name="Total demand" stroke={chartColors.primary} strokeWidth={2} fill={chartColors.primary} fillOpacity={0.06} activeDot={{ r: 3.5 }} />
              <Area type="monotone" dataKey="renewable" name="Renewable supply" stroke="var(--source-hydro)" strokeWidth={2} fill="var(--source-hydro)" fillOpacity={0.25} activeDot={{ r: 3.5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SupplyMix sources={sources} totalKwh={kwh} periodLabel={view.periodLabel} />
    </div>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
      <Card>
        <ChartHeader title={view.comparisonTitle} subtitle={view.comparisonSubtitle}>
          <div className="flex flex-col items-end gap-1.5">
            <Trend value={consumptionChange} label={`${formatKwh(Math.abs(kwh - previousKwh))} ${consumptionChange < 0 ? "less" : "more"}`} positiveIsGood={false} />
            <ChartLegend items={[{ label: "Current", color: chartColors.primary }, { label: "Previous", color: "var(--source-grid)" }]} />
          </div>
        </ChartHeader>
        <div className="h-72 px-2 pb-3 pt-5 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={view.comparison} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="name" {...axisProps} dy={8} />
              <YAxis {...axisProps} width={44} tickFormatter={kwhTick} />
              <Tooltip cursor={{ fill: "var(--secondary)" }} content={(props) => <ChartTooltip {...(props as object)} footer={(payload) => {
                const row = payload[0]?.payload as { current: number; previous: number } | undefined;
                if (!row) return null;
                const change = ((row.current - row.previous) / row.previous) * 100;
                return `${change >= 0 ? "+" : ""}${change.toFixed(1)}% ${view.previousLabel}`;
              }} />} />
              <Bar dataKey="previous" name="Previous" fill="var(--source-grid)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="current" name="Current" fill={chartColors.primary} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <EventLog events={sampleEvents} />
    </div>
  </AppShell>;
}
