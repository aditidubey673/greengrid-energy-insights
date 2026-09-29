import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, Database, Download, IndianRupee, Leaf, PanelsTopLeft, PencilLine, Sigma, Sparkles, Sun, TimerReset } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/greengrid/shell";
import { chartColors } from "@/components/greengrid/data";
import { Button, Card, ChartHeader, downloadText, inputClass, labelClass, MetricCard, PageHeader } from "@/components/greengrid/ui";
import { calculate, locationPresets, panelSpecs, type Field, type PanelType, type SolarInputs, type SystemType } from "@/components/greengrid/solar";
import { setEnergySettings, useEnergySettings } from "@/components/greengrid/settings-store";

export const Route = createFileRoute("/solar-calculator")({
  head: () => ({ meta: [{ title: "Solar Calculator | GreenGrid" }, { name: "description", content: "Estimate solar capacity, installation cost, savings, ROI, and carbon reduction." }, { property: "og:title", content: "Solar Calculator | GreenGrid" }, { property: "og:description", content: "Create an instant solar installation estimate." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SolarCalculator,
});

const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const toNum = (s: string) => (s.trim() === "" ? NaN : Number(s));

const defaults = { consumption: "450", bill: "4200", area: "600", capacity: "3", sunHours: "5.2", efficiency: "78", costPerKw: "30000", costPerPanel: "1500", inverterCost: "9000", installCost: "12000", batteryCost: "28000" };
type TextField = keyof typeof defaults;

function Tag({ kind }: { kind: "user" | "sample" | "estimate" }) {
  const map = { user: ["User input", "bg-info/12 text-info"], sample: ["Sample default", "bg-warning/12 text-warning"], estimate: ["Estimate", "bg-primary/12 text-primary"] } as const;
  return <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[kind][1]}`}>{map[kind][0]}</span>;
}

function SolarCalculator() {
  const settings = useEnergySettings();
  const [v, setV] = useState(defaults);
  const [touched, setTouched] = useState<Partial<Record<TextField, boolean>>>({});
  const [panelType, setPanelType] = useState<PanelType>("mono");
  const [system, setSystem] = useState<SystemType>("on-grid");
  const [location, setLocation] = useState("Bengaluru, Karnataka");
  const [mode, setMode] = useState<"recommended" | "custom">("custom");
  const [tariffText, setTariffText] = useState<string | null>(null);
  const [factorText, setFactorText] = useState<string | null>(null);

  const set = (k: TextField) => (e: React.ChangeEvent<HTMLInputElement>) => { setV((p) => ({ ...p, [k]: e.target.value })); setTouched((t) => ({ ...t, [k]: true })); };

  const base: Omit<SolarInputs, "capacity"> = {
    consumption: toNum(v.consumption), bill: toNum(v.bill), area: toNum(v.area), panelType, system,
    sunHours: toNum(v.sunHours), efficiency: toNum(v.efficiency), costPerKw: toNum(v.costPerKw), costPerPanel: toNum(v.costPerPanel),
    inverterCost: toNum(v.inverterCost), installCost: toNum(v.installCost), batteryCost: toNum(v.batteryCost),
    tariff: tariffText !== null ? toNum(tariffText) : settings.tariff, emissionFactor: factorText !== null ? toNum(factorText) : settings.emissionFactor,
  };
  const preview = calculate({ ...base, capacity: 1 });
  const capacity = mode === "recommended" ? preview.recommended : toNum(v.capacity);
  const r = useMemo(() => calculate({ ...base, capacity }), [JSON.stringify(base), capacity]); // eslint-disable-line react-hooks/exhaustive-deps
  const err = (f: Field) => r.errors[f];

  const onTariff = (e: React.ChangeEvent<HTMLInputElement>) => { setTariffText(e.target.value); const n = toNum(e.target.value); if (Number.isFinite(n) && n > 0) setEnergySettings({ tariff: n }); };
  const onFactor = (e: React.ChangeEvent<HTMLInputElement>) => { setFactorText(e.target.value); const n = toNum(e.target.value); if (Number.isFinite(n) && n >= 0) setEnergySettings({ emissionFactor: n }); };
  const onLocation = (e: React.ChangeEvent<HTMLSelectElement>) => { setLocation(e.target.value); const h = locationPresets[e.target.value]; if (h) setV((p) => ({ ...p, sunHours: String(h) })); };

  const bill = Number.isFinite(base.bill) ? base.bill : 0;
  const savingsData = Array.from({ length: 12 }, (_, i) => { const seasonal = 0.88 + ((i % 4) * 0.04); return { name: new Date(2026, i).toLocaleString("en", { month: "short" }), before: bill, after: Math.max(0, Math.round(bill - r.savings * seasonal)), savings: Math.round(r.savings * seasonal) }; });
  const roiData = Array.from({ length: 11 }, (_, y) => ({ name: `Y${y}`, cumulative: Math.round(r.annual * y - r.total) }));

  const quote = `GREENGRID SOLAR ESTIMATE\nLocation: ${location}\nSystem: ${system}\nPanel type: ${panelSpecs[panelType].label}\nInstalled capacity: ${r.cap.toFixed(1)} kW (recommended ${r.recommended.toFixed(1)} kW)\nPanels: ${r.panels}\nEst. monthly generation: ${fmt.format(r.generation)} kWh\nPanel cost: ₹${fmt.format(r.panelCost)}\nInverter: ₹${fmt.format(r.inverter)}\nInstallation: ₹${fmt.format(r.install)}\nBattery: ₹${fmt.format(r.battery)}\nEstimated total: ₹${fmt.format(r.total)}\nMonthly savings: ₹${fmt.format(r.savings)}\nAnnual savings: ₹${fmt.format(r.annual)}\nPayback: ${r.payback ? r.payback.toFixed(1) + " years" : "n/a"}\nYear-one ROI: ${r.roi !== null ? r.roi.toFixed(1) + "%" : "n/a"}\nCO2 reduction: ${fmt.format(r.co2)} kg/year\n\nApproximate estimate only. Actual costs depend on location, equipment, installation, and applicable subsidy policies.`;

  const field = (k: TextField, label: string, opts: { step?: string } = {}) => (
    <label key={k}>
      <span className={labelClass}>{label}<Tag kind={touched[k] ? "user" : "sample"} /></span>
      <input className={`${inputClass} ${err(k as Field) ? "border-danger" : ""}`} type="number" min="0" step={opts.step ?? "any"} value={v[k]} onChange={set(k)} aria-invalid={!!err(k as Field)} />
      {err(k as Field) && <span className="mt-1 block text-xs text-danger">{err(k as Field)}</span>}
    </label>
  );

  const money = (n: number) => (r.ok ? `₹${fmt.format(n)}` : "—");

  return <AppShell>
    <PageHeader eyebrow="Planning tools" title="Solar Panel Calculator" description="Model a rooftop system and see an instant estimate of cost, savings, payback, and environmental impact." action={<Button disabled={!r.ok} onClick={() => downloadText("GreenGrid-solar-estimate.txt", quote)}><Download className="h-4 w-4" />Download quotation</Button>} />

    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-warning" /><Tag kind="sample" /> preset demonstration value</span>
      <span className="flex items-center gap-1.5"><PencilLine className="h-3.5 w-3.5 text-info" /><Tag kind="user" /> value you entered</span>
      <span className="flex items-center gap-1.5"><Sigma className="h-3.5 w-3.5 text-primary" /><Tag kind="estimate" /> calculated from inputs</span>
    </div>

    <div className="grid items-start gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Calculator className="h-5 w-5" /></div><div><h2 className="font-semibold">System inputs</h2><p className="text-xs text-muted-foreground">Adjust values to update results</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {field("consumption", "Monthly consumption (kWh)")}
            {field("bill", "Average bill (₹)")}
            {field("area", "Available rooftop area (sq. ft.)")}
            <label><span className={labelClass}>Solar panel type</span><select className={inputClass} value={panelType} onChange={(e) => setPanelType(e.target.value as PanelType)}><option value="mono">Monocrystalline (550W)</option><option value="poly">Polycrystalline (450W)</option></select></label>
            <label><span className={labelClass}>System type</span><select className={inputClass} value={system} onChange={(e) => setSystem(e.target.value as SystemType)}><option value="on-grid">On-grid</option><option value="off-grid">Off-grid</option><option value="hybrid">Hybrid</option></select></label>
            <label><span className={labelClass}>Installation location</span><select className={inputClass} value={location} onChange={onLocation}>{Object.keys(locationPresets).map((l) => <option key={l}>{l}</option>)}</select></label>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">System capacity</h2>
          <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/8 p-3"><div><p className="text-xs text-muted-foreground">Recommended for your usage<Tag kind="estimate" /></p><p className="mt-1 text-lg font-bold text-primary">{preview.valid ? `${preview.recommended.toFixed(1)} kW` : "—"}</p></div><Sparkles className="h-5 w-5 text-primary" /></div>
          <div className="mb-4 flex rounded-lg border border-border bg-secondary p-1">{(["recommended", "custom"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize ${mode === m ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{m === "recommended" ? "Use recommended" : "Customize"}</button>)}</div>
          {mode === "custom" && <div className="space-y-3">
            <div className="flex flex-wrap gap-2">{["1", "2", "3", "5", "10"].map((c) => <button key={c} onClick={() => setV((p) => ({ ...p, capacity: c }))} className={`rounded-md border px-3 py-1.5 text-xs ${v.capacity === c ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{c} kW</button>)}</div>
            {field("capacity", "Selected capacity (kW)", { step: "0.5" })}
          </div>}
          <p className="mt-3 text-xs text-muted-foreground">Rooftop supports up to <span className="font-semibold text-foreground">{Number.isFinite(r.maxArea) ? r.maxArea.toFixed(1) : "—"} kW</span> with {panelSpecs[panelType].label.toLowerCase()} panels ({panelSpecs[panelType].sqftPerKw} sq. ft./kW).</p>
          {r.areaInsufficient && <div className="mt-3 flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Insufficient rooftop area: {capacity.toFixed(1)} kW needs about {fmt.format(r.requiredArea)} sq. ft., but only {fmt.format(base.area)} sq. ft. is available. Reduce capacity to {r.maxArea.toFixed(1)} kW or less.</span></div>}
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Generation assumptions</h2>
          <p className="mb-4 text-xs text-muted-foreground">Location presets are sample averages; override as needed.</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {field("sunHours", "Avg. daily peak sun hours", { step: "0.1" })}
            {field("efficiency", "System efficiency after losses (%)", { step: "1" })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Pricing & tariff</h2>
          <p className="mb-4 text-xs text-muted-foreground">Tariff and emission factor are shared with Settings and the Dashboard.</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {field("costPerKw", "Solar cost per kW (₹)")}
            {field("costPerPanel", "Additional cost per panel (₹)")}
            {field("inverterCost", "Inverter cost per kW (₹)")}
            {field("installCost", "Installation & wiring per kW (₹)")}
            {field("batteryCost", "Battery cost per kW (₹, off-grid/hybrid)")}
            <label><span className={labelClass}>Electricity tariff (₹/kWh)<Tag kind={tariffText !== null ? "user" : "sample"} /></span><input className={`${inputClass} ${err("tariff") ? "border-danger" : ""}`} type="number" min="0" step="0.01" value={tariffText ?? String(settings.tariff)} onChange={onTariff} />{err("tariff") && <span className="mt-1 block text-xs text-danger">{err("tariff")}</span>}</label>
            <label><span className={labelClass}>CO₂ factor (kg/kWh)<Tag kind={factorText !== null ? "user" : "sample"} /></span><input className={`${inputClass} ${err("emissionFactor") ? "border-danger" : ""}`} type="number" min="0" step="0.01" value={factorText ?? String(settings.emissionFactor)} onChange={onFactor} />{err("emissionFactor") && <span className="mt-1 block text-xs text-danger">{err("emissionFactor")}</span>}</label>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {!r.valid && <div className="flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"><AlertTriangle className="h-5 w-5 shrink-0" />Please fix the highlighted inputs to see your estimate.</div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Installed capacity (est.)" value={r.ok ? `${r.cap.toFixed(1)} kW` : "—"} detail={`${preview.valid ? preview.recommended.toFixed(1) : "—"} kW recommended`} icon={PanelsTopLeft} />
          <MetricCard label="Solar panels (est.)" value={r.ok ? `${r.panels}` : "—"} detail={`${panelSpecs[panelType].watts}W ${panelSpecs[panelType].label.toLowerCase()}`} icon={PanelsTopLeft} tone="blue" />
          <MetricCard label="Total system cost (est.)" value={money(r.total)} detail="Before applicable subsidy" icon={IndianRupee} tone="amber" />
          <MetricCard label="Payback period (est.)" value={r.ok && r.payback ? `${r.payback.toFixed(1)} yrs` : "—"} detail={`${money(r.annual)} annual savings`} icon={TimerReset} tone="rose" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Monthly generation (est.)" value={r.ok ? `${fmt.format(r.generation)} kWh` : "—"} detail={`${base.sunHours || 0} sun-hrs × ${base.efficiency || 0}% efficiency`} icon={Sun} />
          <MetricCard label="Monthly savings (est.)" value={money(r.savings)} detail="Capped at your average bill" icon={IndianRupee} tone="blue" />
          <MetricCard label="CO₂ reduction (est.)" value={r.ok ? `${fmt.format(r.co2)} kg/yr` : "—"} detail={`At ${base.emissionFactor} kg CO₂/kWh`} icon={Leaf} />
        </div>

        <Card><ChartHeader title="Cost breakdown" subtitle="Estimate from your editable pricing" /><div className="grid gap-3 p-5 sm:grid-cols-2">{([["Solar panels", r.panelCost], ["Inverter", r.inverter], ["Installation & wiring", r.install], ["Battery & controls", r.battery]] as const).map(([name, value]) => <div key={name} className="flex items-center justify-between rounded-lg bg-secondary p-4"><span className="text-sm text-muted-foreground">{name}</span><span className="font-semibold">{money(value)}</span></div>)}<div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/8 p-4 sm:col-span-2"><span className="font-semibold">Total installation estimate</span><span className="text-xl font-bold text-primary">{money(r.total)}</span></div></div></Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card><ChartHeader title="Before vs after bill (est.)" subtitle="Projected monthly electricity cost" /><div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={savingsData}><CartesianGrid stroke={chartColors.grid} vertical={false} /><XAxis dataKey="name" stroke={chartColors.muted} fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke={chartColors.muted} fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: chartColors.surface, border: `1px solid ${chartColors.grid}`, borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Area dataKey="before" name="Before solar" stroke={chartColors.info} fill="transparent" /><Area dataKey="after" name="After solar" stroke={chartColors.primary} fill={chartColors.primary} fillOpacity={0.14} /></AreaChart></ResponsiveContainer></div></Card>
          <Card><ChartHeader title="Monthly savings (est.)" subtitle="Seasonally adjusted projection" /><div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={savingsData}><CartesianGrid stroke={chartColors.grid} vertical={false} /><XAxis dataKey="name" stroke={chartColors.muted} fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke={chartColors.muted} fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: chartColors.surface, border: `1px solid ${chartColors.grid}`, borderRadius: 8 }} /><Bar dataKey="savings" fill={chartColors.primary} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5"><h2 className="text-sm font-semibold">Estimated return</h2><p className="mt-1 text-xs text-muted-foreground">First-year financial impact</p><div className="mt-6 grid place-items-center"><div className="grid h-40 w-40 place-items-center rounded-full border-[12px] border-primary/15" style={{ borderTopColor: chartColors.primary, borderRightColor: r.roi && r.roi > 25 ? chartColors.primary : undefined }}><div className="text-center"><p className="text-3xl font-bold">{r.ok && r.roi !== null ? `${r.roi.toFixed(1)}%` : "—"}</p><p className="text-xs text-muted-foreground">year-one ROI</p></div></div></div></Card>
          <Card><ChartHeader title="Cumulative return (est.)" subtitle="Net position over 10 years" /><div className="h-64 p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={roiData}><CartesianGrid stroke={chartColors.grid} vertical={false} /><XAxis dataKey="name" stroke={chartColors.muted} fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke={chartColors.muted} fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: chartColors.surface, border: `1px solid ${chartColors.grid}`, borderRadius: 8 }} /><Area dataKey="cumulative" stroke={chartColors.primary} fill={chartColors.primary} fillOpacity={0.14} /></AreaChart></ResponsiveContainer></div></Card>
        </div>

        <div className="flex gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4"><Leaf className="mt-0.5 h-5 w-5 shrink-0 text-warning" /><p className="text-xs leading-5 text-muted-foreground"><strong className="text-warning">Approximate estimate:</strong> All generation, cost, and savings figures are estimates based on configurable sample assumptions. Actual prices and savings depend on location, selected equipment, site installation requirements, utility tariffs, and applicable subsidy policies.</p></div>
      </div>
    </div>
  </AppShell>;
}
