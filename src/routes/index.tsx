import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  IndianRupee,
  Leaf,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/greengrid/shell";
import { chartColors, energySeries } from "@/components/greengrid/data";
import { useEnergySettings } from "@/components/greengrid/settings-store";
import {
  Button,
  Card,
  ChartHeader,
  MetricCard,
  PageHeader,
  Segmented,
  StatusDot,
} from "@/components/greengrid/ui";
import {
  fetchEnergySummary,
  fetchHealthStatus,
  type EnergySummary,
  type HealthCheckResponse,
} from "@/lib/energy-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Energy Dashboard | GreenGrid" },
      {
        name: "description",
        content: "Monitor energy consumption, renewable generation, cost, and carbon impact.",
      },
      { property: "og:title", content: "Energy Dashboard | GreenGrid" },
      { property: "og:description", content: "Live energy intelligence for smarter operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const dashboardViews = {
  daily: {
    metrics: {
      consumption: "2,000 kWh",
      renewable: "744 kWh",
      renewableShare: 37,
      emissions: "1,030 kg",
      bill: "₹16,120",
    },
    details: {
      consumption: "Today · 00:00–24:00",
      renewable: "37% of today's demand",
      emissions: "Today's CO₂ equivalent",
      bill: "Estimated energy cost today",
    },
    comparisonTitle: "Hourly comparison",
    comparisonSubtitle: "Today against yesterday",
    comparison: [
      { name: "00:00", current: 180, previous: 205 },
      { name: "04:00", current: 150, previous: 168 },
      { name: "08:00", current: 310, previous: 288 },
      { name: "12:00", current: 425, previous: 452 },
      { name: "16:00", current: 390, previous: 416 },
      { name: "20:00", current: 330, previous: 348 },
      { name: "24:00", current: 215, previous: 226 },
    ],
  },
  weekly: {
    metrics: {
      consumption: "15,190 kWh",
      renewable: "6,025 kWh",
      renewableShare: 40,
      emissions: "7,514 kg",
      bill: "₹1,22,410",
    },
    details: {
      consumption: "Monday through Sunday",
      renewable: "40% of this week's demand",
      emissions: "This week's CO₂ equivalent",
      bill: "Estimated cost this week",
    },
    comparisonTitle: "Daily comparison",
    comparisonSubtitle: "This week against last week",
    comparison: [
      { name: "Mon", current: 2210, previous: 2340 },
      { name: "Tue", current: 2390, previous: 2480 },
      { name: "Wed", current: 2180, previous: 2290 },
      { name: "Thu", current: 2520, previous: 2610 },
      { name: "Fri", current: 2360, previous: 2490 },
      { name: "Sat", current: 1880, previous: 1960 },
      { name: "Sun", current: 1650, previous: 1740 },
    ],
  },
  monthly: {
    metrics: {
      consumption: "7,248 kWh",
      renewable: "3,842 kWh",
      renewableShare: 53,
      emissions: "1,824 kg",
      bill: "₹58,420",
    },
    details: {
      consumption: "Current billing period",
      renewable: "53% of total demand",
      emissions: "Monthly CO₂ equivalent",
      bill: "Projected at month-end",
    },
    comparisonTitle: "Monthly comparison",
    comparisonSubtitle: "Current year against previous year",
    comparison: [
      { name: "Jan", current: 6840, previous: 7210 },
      { name: "Feb", current: 6210, previous: 6940 },
      { name: "Mar", current: 7180, previous: 7480 },
      { name: "Apr", current: 6920, previous: 7360 },
      { name: "May", current: 7520, previous: 7810 },
      { name: "Jun", current: 7248, previous: 7640 },
    ],
  },
};

function Dashboard() {
  const [period, setPeriod] = useState<keyof typeof dashboardViews>("monthly");
  const [dataSource, setDataSource] = useState<"live" | "demo">("live");
  const [liveSummary, setLiveSummary] = useState<EnergySummary | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const es = useEnergySettings();
  const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

  const selectPeriod = (value: string) => {
    if (value === "daily" || value === "weekly" || value === "monthly") {
      setPeriod(value);
    }
  };

  // Fetch backend data
  const loadBackendData = async () => {
    if (dataSource !== "live") return;
    setIsLoading(true);
    setApiError(null);
    try {
      const [health, summary] = await Promise.all([
        fetchHealthStatus(),
        fetchEnergySummary({ period, tariff: es.tariff }),
      ]);
      setHealthStatus(health);
      setLiveSummary(summary);
      setApiError(null);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Backend API is currently offline. Ensure Django server is running on http://127.0.0.1:8000";
      setApiError(errorMsg);
      setHealthStatus(null);
      setLiveSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, [period, dataSource, es.tariff]); // eslint-disable-line react-hooks/exhaustive-deps

  const view = dashboardViews[period];
  const series = energySeries[period];

  // Determine whether to use Live Backend or Fallback Demo
  const isUsingLive = dataSource === "live" && liveSummary !== null && !liveSummary.is_empty;

  const totalKwh = isUsingLive
    ? liveSummary.total_consumption_kwh
    : Number(view.metrics.consumption.replace(/[^0-9]/g, ""));

  const renewKwh = isUsingLive
    ? liveSummary.renewable_generation_kwh
    : Number(view.metrics.renewable.replace(/[^0-9]/g, ""));

  const renewableShare = isUsingLive
    ? liveSummary.renewable_percentage
    : view.metrics.renewableShare;
  const gridShare = isUsingLive ? liveSummary.grid_percentage : 100 - renewableShare;

  const consumptionDisplay = `${nf.format(totalKwh)} kWh`;
  const renewableDisplay = `${nf.format(renewKwh)} kWh`;
  const emissionsDisplay = isUsingLive
    ? `${nf.format(liveSummary.estimated_emissions_kg)} kg`
    : `${nf.format((totalKwh - renewKwh) * es.emissionFactor)} kg`;
  const costDisplay = isUsingLive
    ? `₹${nf.format(liveSummary.estimated_cost)}`
    : `₹${nf.format(totalKwh * es.tariff)}`;

  const pie = [
    { name: "Renewable", value: Math.max(0, renewableShare) },
    { name: "Grid", value: Math.max(0, gridShare) },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="ENERGY INTELLIGENCE PLATFORM"
        title="Facility Energy Overview"
        description="Monitor energy consumption, renewable generation, operational costs and sustainability performance across your facilities."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* Data Source Selector */}
            <div className="flex items-center rounded-lg border border-border bg-secondary p-1">
              <button
                onClick={() => setDataSource("live")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  dataSource === "live"
                    ? "bg-accent text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Server className="h-3.5 w-3.5" />
                Live API
                {healthStatus?.status === "healthy" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
              <button
                onClick={() => setDataSource("demo")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  dataSource === "demo"
                    ? "bg-accent text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                Demo Data
              </button>
            </div>

            <div className="hidden sm:block">
              <Segmented
                value={period}
                onChange={selectPeriod}
                options={["daily", "weekly", "monthly"]}
              />
            </div>
          </div>
        }
      />

      <div className="sm:hidden">
        <Segmented
          value={period}
          onChange={selectPeriod}
          options={["daily", "weekly", "monthly"]}
        />
      </div>

      {/* Backend Status / Error / Empty States */}
      {dataSource === "live" && apiError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/8 p-4 text-xs">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Backend Disconnected:</strong> Django API server is offline or unreachable at{" "}
              <code>http://127.0.0.1:8000</code>. Displaying demonstration data.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-7 text-xs"
              onClick={loadBackendData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              Retry Connection
            </Button>
            <Button variant="ghost" className="h-7 text-xs" onClick={() => setDataSource("demo")}>
              Switch to Demo Mode
            </Button>
          </div>
        </div>
      )}

      {dataSource === "live" && healthStatus?.status === "healthy" && liveSummary?.is_empty && (
        <div className="rounded-lg border border-info/30 bg-info/8 p-5 text-center">
          <Database className="mx-auto h-8 w-8 text-info" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">
            Connected to MySQL Database ({healthStatus.database_name})
          </h3>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
            No energy readings have been submitted to the database yet. Post readings via{" "}
            <code>POST /api/energy-readings/</code> or run the Django command:
          </p>
          <code className="mt-2 inline-block rounded bg-secondary px-3 py-1 font-mono text-xs text-primary">
            python manage.py load_demo_energy_data
          </code>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" className="h-8 text-xs" onClick={loadBackendData}>
              <RefreshCw className="h-3.5 w-3.5" /> Check for New Readings
            </Button>
            <Button variant="ghost" className="h-8 text-xs" onClick={() => setDataSource("demo")}>
              View Sample Demo Mode
            </Button>
          </div>
        </div>
      )}

      {dataSource === "live" && isUsingLive && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Connected to Django API · MySQL Database:{" "}
              <strong>{healthStatus?.database_name || "greengrid_db"}</strong> (
              {liveSummary.readings_count} readings aggregated)
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Last synced: {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 [&>div]:min-h-[190px] [&>div]:p-6">
        <MetricCard
          label="Total consumption"
          value={consumptionDisplay}
          detail={
            isUsingLive
              ? `${period.toUpperCase()} load · ${liveSummary?.grid_consumption_kwh.toFixed(0)} kWh from grid`
              : view.details.consumption
          }
          trend={-8.2}
          icon={Zap}
        />
        <MetricCard
          label="Renewable generation"
          value={renewableDisplay}
          detail={
            isUsingLive ? `${renewableShare.toFixed(1)}% of total demand` : view.details.renewable
          }
          trend={12.4}
          icon={Leaf}
          tone="blue"
        />
        <MetricCard
          label="Carbon emissions"
          value={emissionsDisplay}
          detail={
            isUsingLive
              ? `Source-specific emissions`
              : `Est. at ${es.emissionFactor} kg CO₂/kWh grid factor`
          }
          trend={-14.7}
          icon={Activity}
          tone="amber"
        />
        <MetricCard
          label={`${period.charAt(0).toUpperCase()}${period.slice(1)} energy cost`}
          value={costDisplay}
          detail={`Est. at ₹${es.tariff}/kWh tariff`}
          trend={-6.1}
          icon={IndianRupee}
          tone="rose"
        />
      </div>

      {/* Renewable Generation Sources Section */}
      <div className="mt-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Renewable Generation Sources</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isUsingLive
              ? "Actual generation by source type aggregated from connected meter readings"
              : "Estimated contribution from solar, wind and hydro energy"}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              name: "Solar Energy",
              value: isUsingLive
                ? Math.round(
                    liveSummary.breakdown_by_source.find((s) => s.source_type === "solar")?.kwh ||
                      renewKwh * 0.55,
                  )
                : Math.round(renewKwh * 0.55),
              share: isUsingLive
                ? Math.round(
                    liveSummary.breakdown_by_source.find((s) => s.source_type === "solar")?.share ||
                      55,
                  )
                : 55,
              image: "/images/solar.jpg",
              description: "Electricity generated from solar panels",
            },
            {
              name: "Wind Energy",
              value: isUsingLive
                ? Math.round(
                    liveSummary.breakdown_by_source.find((s) => s.source_type === "wind")?.kwh ||
                      renewKwh * 0.25,
                  )
                : Math.round(renewKwh * 0.25),
              share: isUsingLive
                ? Math.round(
                    liveSummary.breakdown_by_source.find((s) => s.source_type === "wind")?.share ||
                      25,
                  )
                : 25,
              image: "/images/wind.jpg",
              description: "Electricity generated by wind turbines",
            },
            {
              name: "Hydro Energy",
              value: isUsingLive
                ? Math.round(
                    liveSummary.breakdown_by_source.find((s) => s.source_type === "hydro")?.kwh ||
                      renewKwh * 0.2,
                  )
                : Math.round(renewKwh * 0.2),
              share: isUsingLive
                ? Math.round(
                    liveSummary.breakdown_by_source.find((s) => s.source_type === "hydro")?.share ||
                      20,
                  )
                : 20,
              image: "/images/hydro.jpg",
              description: "Electricity generated through hydropower",
            },
          ].map((source) => (
            <Card key={source.name}>
              <div className="overflow-hidden rounded-t-xl">
                <img src={source.image} alt={source.name} className="h-44 w-full object-cover" />
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{source.name}</h3>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {source.share}%
                  </span>
                </div>

                <p className="mt-3 text-2xl font-bold text-foreground">
                  {nf.format(source.value)} kWh
                </p>

                <p className="mt-2 text-sm text-muted-foreground">{source.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Energy Consumption Trend & Energy Mix Charts */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <Card>
          <ChartHeader title="Energy consumption" subtitle="Usage and renewable contribution" />
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={chartColors.muted}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke={chartColors.muted} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: chartColors.surface,
                    border: `1px solid ${chartColors.grid}`,
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="usage"
                  stroke={chartColors.primary}
                  strokeWidth={2.5}
                  fill="url(#usageFill)"
                />
                <Area
                  type="monotone"
                  dataKey="renewable"
                  stroke={chartColors.info}
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <ChartHeader title="Energy mix" subtitle={`Renewable vs non-renewable · ${period}`} />
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} innerRadius={72} outerRadius={94} dataKey="value" stroke="none">
                  <Cell fill={chartColors.primary} />
                  <Cell fill={chartColors.info} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: chartColors.surface,
                    border: `1px solid ${chartColors.grid}`,
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="text-3xl font-bold">{renewableShare.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">renewable</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground">Renewable</p>
              <p className="mt-1 font-semibold text-primary">{renewableDisplay}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground">Grid share</p>
              <p className="mt-1 font-semibold text-info">{gridShare.toFixed(0)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison Chart & Recent Activity */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card>
          <ChartHeader title={view.comparisonTitle} subtitle={view.comparisonSubtitle} />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view.comparison}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={chartColors.muted}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke={chartColors.muted} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: chartColors.surface,
                    border: `1px solid ${chartColors.grid}`,
                    borderRadius: 8,
                  }}
                />
                <Bar
                  dataKey="previous"
                  fill={chartColors.info}
                  opacity={0.35}
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="current" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <ChartHeader title="Recent activity" subtitle="Live alerts and system events" />
          <div className="divide-y divide-border px-5">
            {[
              {
                title: "Peak demand threshold reached",
                time: "12 min ago",
                icon: AlertTriangle,
                tone: "text-warning",
              },
              {
                title: "Solar array 02 back online",
                time: "48 min ago",
                icon: Zap,
                tone: "text-primary",
              },
              {
                title: "Monthly report generated",
                time: "2 hours ago",
                icon: Activity,
                tone: "text-info",
              },
              {
                title: "Grid frequency stabilized",
                time: "4 hours ago",
                icon: Activity,
                tone: "text-primary",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 py-4">
                <div className="mt-0.5">
                  <StatusDot status={item.tone === "text-warning" ? "warning" : "online"} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
