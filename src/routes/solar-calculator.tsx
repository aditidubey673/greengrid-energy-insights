import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Database,
  Download,
  Droplets,
  HelpCircle,
  IndianRupee,
  Info,
  Leaf,
  PanelsTopLeft,
  PencilLine,
  Plus,
  RotateCcw,
  Scale,
  Sigma,
  Sparkles,
  Sun,
  SunMedium,
  TimerReset,
  Trash2,
  Waves,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/greengrid/shell";
import { chartColors } from "@/components/greengrid/data";
import {
  Button,
  Card,
  ChartHeader,
  downloadText,
  inputClass,
  labelClass,
  MetricCard,
  PageHeader,
} from "@/components/greengrid/ui";
import {
  calculate as calculateSolar,
  locationPresets,
  panelSpecs,
  type Field as SolarField,
  type PanelType,
  type SolarInputs,
  type SystemType,
} from "@/components/greengrid/solar";
import {
  calculateHydro,
  type FlowUnit,
  type HydroInputs,
  type HydroField,
} from "@/components/greengrid/hydro";
import {
  appliancePresets,
  calculateElectricity,
  defaultAppliances,
  type ApplianceItem,
} from "@/components/greengrid/electricity";
import { setEnergySettings, useEnergySettings } from "@/components/greengrid/settings-store";

export const Route = createFileRoute("/solar-calculator")({
  head: () => ({
    meta: [
      { title: "Renewable Energy Calculator | GreenGrid" },
      {
        name: "description",
        content:
          "Comprehensive renewable energy and electricity calculator for solar rooftop systems, micro-hydropower generation, and appliance consumption auditing.",
      },
      { property: "og:title", content: "Renewable Energy Calculator | GreenGrid" },
      {
        property: "og:description",
        content:
          "Model solar, hydro, and appliance consumption with instant financial and carbon estimates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RenewableEnergyCalculator,
});

const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const fmtDec2 = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});
const toNum = (s: string) => (s.trim() === "" ? NaN : Number(s));

function Tag({ kind }: { kind: "user" | "sample" | "estimate" }) {
  const map = {
    user: ["User input", "bg-info/12 text-info"],
    sample: ["Sample default", "bg-warning/12 text-warning"],
    estimate: ["Estimate", "bg-primary/12 text-primary"],
  } as const;
  return (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[kind][1]}`}
    >
      {map[kind][0]}
    </span>
  );
}

// -----------------------------------------------------------------------------
// SOLAR CALCULATOR DEFAULTS
// -----------------------------------------------------------------------------
const solarDefaults = {
  consumption: "450",
  bill: "4200",
  area: "600",
  capacity: "3",
  sunHours: "5.2",
  efficiency: "78",
  costPerKw: "30000",
  costPerPanel: "1500",
  inverterCost: "9000",
  installCost: "12000",
  batteryCost: "28000",
};
type SolarTextField = keyof typeof solarDefaults;

// -----------------------------------------------------------------------------
// HYDRO CALCULATOR DEFAULTS
// -----------------------------------------------------------------------------
const hydroDefaults = {
  flowRate: "0.25",
  flowUnit: "m3s" as FlowUnit,
  head: "15",
  turbineEfficiency: "85",
  generatorEfficiency: "92",
  operatingHoursPerDay: "24",
  operatingDaysPerYear: "330",
};
type HydroTextField =
  | "flowRate"
  | "head"
  | "turbineEfficiency"
  | "generatorEfficiency"
  | "operatingHoursPerDay"
  | "operatingDaysPerYear";

function RenewableEnergyCalculator() {
  const settings = useEnergySettings();
  const [activeTab, setActiveTab] = useState<"solar" | "hydro" | "electricity" | "comparison">(
    "solar",
  );

  // Shared tariff/factor local text overrides (synced to store)
  const [tariffText, setTariffText] = useState<string | null>(null);
  const [factorText, setFactorText] = useState<string | null>(null);

  const activeTariff = tariffText !== null ? toNum(tariffText) : settings.tariff;
  const activeEmissionFactor = factorText !== null ? toNum(factorText) : settings.emissionFactor;

  const onTariffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTariffText(e.target.value);
    const n = toNum(e.target.value);
    if (Number.isFinite(n) && n > 0) setEnergySettings({ tariff: n });
  };

  const onFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFactorText(e.target.value);
    const n = toNum(e.target.value);
    if (Number.isFinite(n) && n >= 0) setEnergySettings({ emissionFactor: n });
  };

  // ===========================================================================
  // 1. SOLAR STATE & CALCULATIONS
  // ===========================================================================
  const [solarV, setSolarV] = useState(solarDefaults);
  const [solarTouched, setSolarTouched] = useState<Partial<Record<SolarTextField, boolean>>>({});
  const [panelType, setPanelType] = useState<PanelType>("mono");
  const [system, setSystem] = useState<SystemType>("on-grid");
  const [location, setLocation] = useState("Bengaluru, Karnataka");
  const [solarMode, setSolarMode] = useState<"recommended" | "custom">("custom");

  const setSolarField = (k: SolarTextField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSolarV((p) => ({ ...p, [k]: e.target.value }));
    setSolarTouched((t) => ({ ...t, [k]: true }));
  };

  const solarBase: Omit<SolarInputs, "capacity"> = {
    consumption: toNum(solarV.consumption),
    bill: toNum(solarV.bill),
    area: toNum(solarV.area),
    panelType,
    system,
    sunHours: toNum(solarV.sunHours),
    efficiency: toNum(solarV.efficiency),
    costPerKw: toNum(solarV.costPerKw),
    costPerPanel: toNum(solarV.costPerPanel),
    inverterCost: toNum(solarV.inverterCost),
    installCost: toNum(solarV.installCost),
    batteryCost: toNum(solarV.batteryCost),
    tariff: activeTariff,
    emissionFactor: activeEmissionFactor,
  };

  const solarPreview = calculateSolar({ ...solarBase, capacity: 1 });
  const solarCapacity =
    solarMode === "recommended" ? solarPreview.recommended : toNum(solarV.capacity);
  const solarResult = useMemo(
    () => calculateSolar({ ...solarBase, capacity: solarCapacity }),
    [JSON.stringify(solarBase), solarCapacity], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const solarErr = (f: SolarField) => solarResult.errors[f];

  const onLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocation(e.target.value);
    const h = locationPresets[e.target.value];
    if (h) setSolarV((p) => ({ ...p, sunHours: String(h) }));
  };

  const handleResetSolar = () => {
    setSolarV(solarDefaults);
    setSolarTouched({});
    setPanelType("mono");
    setSystem("on-grid");
    setLocation("Bengaluru, Karnataka");
    setSolarMode("custom");
  };

  const solarBill = Number.isFinite(solarBase.bill) ? solarBase.bill : 0;
  const solarSavingsData = Array.from({ length: 12 }, (_, i) => {
    const seasonal = 0.88 + (i % 4) * 0.04;
    return {
      name: new Date(2026, i).toLocaleString("en", { month: "short" }),
      before: solarBill,
      after: Math.max(0, Math.round(solarBill - solarResult.savings * seasonal)),
      savings: Math.round(solarResult.savings * seasonal),
    };
  });
  const solarRoiData = Array.from({ length: 11 }, (_, y) => ({
    name: `Y${y}`,
    cumulative: Math.round(solarResult.annual * y - solarResult.total),
  }));

  const solarReport = `================================================================================
GREENGRID RENEWABLE ENERGY PLATFORM - SOLAR PV ESTIMATE REPORT
Generated: ${new Date().toLocaleString()}
================================================================================

1. SYSTEM & LOCATION PARAMETERS
--------------------------------------------------------------------------------
- Location: ${location}
- System Architecture: ${system}
- Panel Technology: ${panelSpecs[panelType].label} (${panelSpecs[panelType].watts}W)
- Available Rooftop Area: ${solarV.area} sq. ft.
- Rooftop Max Capacity: ${solarResult.maxArea.toFixed(1)} kW
- Installed Capacity: ${solarResult.cap.toFixed(1)} kW (Recommended: ${solarResult.recommended.toFixed(1)} kW)
- Number of Solar Panels: ${solarResult.panels} panels
- Peak Daily Sun Hours: ${solarV.sunHours} hours
- System Efficiency (After Losses): ${solarV.efficiency}%

2. FINANCIAL & TARIFF ASSUMPTIONS
--------------------------------------------------------------------------------
- Electricity Tariff: ₹${fmtDec2.format(activeTariff)} / kWh
- Grid Emission Factor: ${fmtDec2.format(activeEmissionFactor)} kg CO2 / kWh
- Solar Modules Cost: ₹${fmt.format(solarResult.panelCost)}
- Inverter Cost: ₹${fmt.format(solarResult.inverter)}
- Installation & Cabling: ₹${fmt.format(solarResult.install)}
- Battery Storage Cost: ₹${fmt.format(solarResult.battery)}
- Total Estimated Investment: ₹${fmt.format(solarResult.total)}

3. GENERATION & FINANCIAL ESTIMATES
--------------------------------------------------------------------------------
- Estimated Daily Generation: ${fmtDec.format(solarResult.dailyGeneration)} kWh / day
- Estimated Monthly Generation: ${fmt.format(solarResult.generation)} kWh / month
- Estimated Annual Generation: ${fmt.format(solarResult.annualGeneration)} kWh / year
- Monthly Electricity Savings: ₹${fmt.format(solarResult.savings)} / month
- Annual Electricity Savings: ₹${fmt.format(solarResult.annual)} / year
- Estimated Payback Period: ${solarResult.payback ? solarResult.payback.toFixed(1) + " years" : "n/a"}
- First-Year Return on Investment (ROI): ${solarResult.roi !== null ? solarResult.roi.toFixed(1) + "%" : "n/a"}
- Estimated Annual CO2 Reduction: ${fmt.format(solarResult.co2)} kg CO2 / year

4. FORMULAS & CALCULATION LOGIC
--------------------------------------------------------------------------------
- Monthly Yield per kW = Sun Hours × 30 days × (Efficiency / 100)
- Generation (kWh) = Capacity (kW) × Monthly Yield per kW
- Number of Panels = ceil((Capacity (kW) × 1000) / Panel Wattage)
- Total System Cost = Panel Cost + Inverter Cost + Installation Cost + Battery Cost
- Monthly Savings = min(Bill, Generation Offset × Tariff)
- Payback Period = Total Cost / Annual Savings
- Annual ROI = (Annual Savings / Total Cost) × 100%
- CO2 Reduction = Annual Generation × Grid Emission Factor

5. PLANNING NOTICE
--------------------------------------------------------------------------------
This report provides preliminary planning estimates based on user-supplied parameters.
Actual solar generation and financial returns depend on physical site azimuth, tilt,
shading obstacles, local utility net metering tariffs, and government subsidy schemes.
================================================================================`;

  // ===========================================================================
  // 2. HYDROPOWER STATE & CALCULATIONS
  // ===========================================================================
  const [hydroV, setHydroV] = useState(hydroDefaults);
  const [hydroTouched, setHydroTouched] = useState<Partial<Record<HydroTextField, boolean>>>({});

  const setHydroField = (k: HydroTextField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setHydroV((p) => ({ ...p, [k]: e.target.value }));
    setHydroTouched((t) => ({ ...t, [k]: true }));
  };

  const handleFlowUnitToggle = (unit: FlowUnit) => {
    if (unit === hydroV.flowUnit) return;
    const currentRate = toNum(hydroV.flowRate);
    if (Number.isFinite(currentRate)) {
      if (unit === "ls") {
        // m3/s -> L/s
        setHydroV((p) => ({
          ...p,
          flowUnit: unit,
          flowRate: String(Math.round(currentRate * 1000 * 100) / 100),
        }));
      } else {
        // L/s -> m3/s
        setHydroV((p) => ({
          ...p,
          flowUnit: unit,
          flowRate: String(Math.round((currentRate / 1000) * 10000) / 10000),
        }));
      }
    } else {
      setHydroV((p) => ({ ...p, flowUnit: unit }));
    }
  };

  const hydroInputs: HydroInputs = {
    flowRate: toNum(hydroV.flowRate),
    flowUnit: hydroV.flowUnit,
    head: toNum(hydroV.head),
    turbineEfficiency: toNum(hydroV.turbineEfficiency),
    generatorEfficiency: toNum(hydroV.generatorEfficiency),
    operatingHoursPerDay: toNum(hydroV.operatingHoursPerDay),
    operatingDaysPerYear: toNum(hydroV.operatingDaysPerYear),
    tariff: activeTariff,
    emissionFactor: activeEmissionFactor,
  };

  const hydroResult = useMemo(
    () => calculateHydro(hydroInputs),
    [JSON.stringify(hydroInputs)], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const hydroErr = (f: HydroField) => hydroResult.errors[f];

  const handleResetHydro = () => {
    setHydroV(hydroDefaults);
    setHydroTouched({});
  };

  // Seasonal hydro chart data (simulating monsoon and dry season flow index)
  const seasonalMultipliers = [0.85, 0.8, 0.75, 0.7, 0.85, 1.15, 1.35, 1.4, 1.3, 1.1, 0.95, 0.9];
  const hydroMonthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(2026, i).toLocaleString("en", { month: "short" });
    const factor = seasonalMultipliers[i] ?? 1;
    const genKwh = Math.round(hydroResult.monthlyEnergyKwh * factor);
    const valueRs = Math.round(genKwh * activeTariff);
    return {
      name: monthName,
      generation: genKwh,
      value: valueRs,
      baseline: Math.round(hydroResult.monthlyEnergyKwh),
    };
  });

  // Head sensitivity curve data (power output at head 5m to 35m)
  const headSensitivityData = [5, 10, 15, 20, 25, 30, 35].map((h) => {
    const flowM3s =
      hydroInputs.flowUnit === "ls" ? hydroInputs.flowRate / 1000 : hydroInputs.flowRate;
    const effDec = (hydroInputs.turbineEfficiency / 100) * (hydroInputs.generatorEfficiency / 100);
    const power =
      Number.isFinite(flowM3s) && flowM3s > 0 && Number.isFinite(effDec) && effDec > 0
        ? 9.81 * flowM3s * h * effDec
        : 0;
    return {
      head: `${h}m`,
      powerKw: Number(power.toFixed(2)),
    };
  });

  const hydroReport = `================================================================================
GREENGRID RENEWABLE ENERGY PLATFORM - MICRO-HYDROPOWER REPORT
Generated: ${new Date().toLocaleString()}
================================================================================

1. HYDRAULIC & TECHNICAL INPUTS
--------------------------------------------------------------------------------
- Water Flow Rate: ${hydroV.flowRate} ${hydroV.flowUnit === "m3s" ? "m³/s" : "L/s"} (${fmtDec2.format(hydroResult.flowM3s)} m³/s / ${fmt.format(hydroResult.flowLs)} L/s)
- Effective Water Head: ${hydroV.head} metres
- Turbine Efficiency: ${hydroV.turbineEfficiency}%
- Generator Efficiency: ${hydroV.generatorEfficiency}%
- Combined Overall Efficiency: ${fmtDec.format(hydroResult.overallEfficiencyPct)}%
- Operating Hours: ${hydroV.operatingHoursPerDay} hrs / day
- Operating Days: ${hydroV.operatingDaysPerYear} days / year
- Electricity Tariff: ₹${fmtDec2.format(activeTariff)} / kWh
- Grid Emission Factor: ${fmtDec2.format(activeEmissionFactor)} kg CO2 / kWh

2. CALCULATED ENERGY GENERATION & FINANCIAL VALUE
--------------------------------------------------------------------------------
- Theoretical Electrical Power Output: ${fmtDec2.format(hydroResult.powerKw)} kW
- Daily Energy Generation: ${fmtDec.format(hydroResult.dailyEnergyKwh)} kWh / day
- Estimated Monthly Energy Generation: ${fmt.format(hydroResult.monthlyEnergyKwh)} kWh / month
- Estimated Annual Energy Generation: ${fmt.format(hydroResult.annualEnergyKwh)} kWh / year
- Estimated Daily Electricity Value: ₹${fmt.format(hydroResult.dailyEnergyKwh * activeTariff)}
- Estimated Monthly Electricity Value: ₹${fmt.format(hydroResult.monthlyValue)}
- Estimated Annual Electricity Value: ₹${fmt.format(hydroResult.annualValue)}
- Estimated Monthly CO2 Emissions Avoided: ${fmt.format(hydroResult.monthlyCo2AvoidedKg)} kg CO2
- Estimated Annual CO2 Emissions Avoided: ${fmt.format(hydroResult.annualCo2AvoidedKg)} kg CO2 (${fmtDec2.format(hydroResult.annualCo2AvoidedKg / 1000)} tonnes)

3. CALCULATION FORMULAS & SCIENTIFIC PRINCIPLES
--------------------------------------------------------------------------------
- Electrical Power (kW) = 9.81 × Flow Rate (m³/s) × Effective Head (m) × Overall Efficiency
- Overall Efficiency = (Turbine Efficiency / 100) × (Generator Efficiency / 100)
- Daily Energy (kWh) = Power (kW) × Operating Hours per Day
- Annual Energy (kWh) = Daily Energy (kWh) × Operating Days per Year
- Monthly Energy (kWh) = Annual Energy (kWh) / 12
- Monthly Electricity Value = Monthly Energy × Tariff
- Annual Electricity Value = Annual Energy × Tariff
- Avoided CO2 Emissions = Annual Energy × Grid Emission Factor

4. THEORETICAL VS ACTUAL OUTPUT DISCLAIMER
--------------------------------------------------------------------------------
IMPORTANT NOTE:
This calculation represents a theoretical micro-hydropower resource potential.
Real-world operational output depends on:
1. Seasonal hydrological variation and dry season low-flow limitations.
2. Penstock friction losses, trash rack head drops, and bends.
3. Turbine partial-load efficiency curve roll-off and cavitation margins.
4. Mandatory ecological environmental flow release constraints.
NOTE ON CAPITAL EXPENDITURE: No capital cost or payback period is modeled here
because hydropower project economics depend fundamentally on site-specific civil works,
weir intake infrastructure, penstock length, and terrain topology.
================================================================================`;

  // ===========================================================================
  // 3. ELECTRICITY CONSUMPTION STATE & CALCULATIONS
  // ===========================================================================
  const [appliances, setAppliances] = useState<ApplianceItem[]>(defaultAppliances);
  const [newAppName, setNewAppName] = useState("");
  const [newAppCount, setNewAppCount] = useState("1");
  const [newAppWatts, setNewAppWatts] = useState("100");
  const [newAppHours, setNewAppHours] = useState("8");
  const [newAppDays, setNewAppDays] = useState("30");
  const [selectedPreset, setSelectedPreset] = useState("");

  const electricitySummary = useMemo(
    () =>
      calculateElectricity({
        appliances,
        tariff: activeTariff,
        emissionFactor: activeEmissionFactor,
      }),
    [appliances, activeTariff, activeEmissionFactor],
  );

  const handleAddAppliance = () => {
    const name = newAppName.trim() || "Custom Appliance";
    const count = Math.max(1, parseInt(newAppCount, 10) || 1);
    const powerWatts = Math.max(1, parseFloat(newAppWatts) || 100);
    const hoursPerDay = Math.min(24, Math.max(0, parseFloat(newAppHours) || 8));
    const daysPerMonth = Math.min(31, Math.max(0, parseInt(newAppDays, 10) || 30));

    const newItem: ApplianceItem = {
      id: `app-${Date.now()}`,
      name,
      category: "Custom",
      count,
      powerWatts,
      hoursPerDay,
      daysPerMonth,
    };

    setAppliances((prev) => [...prev, newItem]);
    setNewAppName("");
    setNewAppCount("1");
    setNewAppWatts("100");
    setNewAppHours("8");
    setNewAppDays("30");
    setSelectedPreset("");
  };

  const handleSelectPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    const found = appliancePresets.find((p) => p.name === presetName);
    if (found) {
      setNewAppName(found.name);
      setNewAppWatts(String(found.powerWatts));
      setNewAppHours(String(found.hoursPerDay));
      setNewAppDays(String(found.daysPerMonth));
    }
  };

  const handleUpdateAppliance = (id: string, updates: Partial<ApplianceItem>) => {
    setAppliances((prev) => prev.map((app) => (app.id === id ? { ...app, ...updates } : app)));
  };

  const handleRemoveAppliance = (id: string) => {
    setAppliances((prev) => prev.filter((app) => app.id !== id));
  };

  const handleResetElectricity = () => {
    setAppliances(defaultAppliances);
  };

  const electricityChartData = electricitySummary.appliances.map((app) => ({
    name: app.name.length > 16 ? app.name.slice(0, 16) + "…" : app.name,
    fullName: app.name,
    monthlyKwh: Math.round(app.monthlyKwh),
    monthlyCost: Math.round(app.monthlyCost),
    share: Number(app.percentageOfTotal.toFixed(1)),
  }));

  const electricityReport = `================================================================================
GREENGRID ELECTRICITY CONSUMPTION & COST AUDIT REPORT
Generated: ${new Date().toLocaleString()}
================================================================================

1. GENERAL ASSUMPTIONS & TARIFF
--------------------------------------------------------------------------------
- Electricity Tariff: ₹${fmtDec2.format(activeTariff)} / kWh
- Grid Emission Factor: ${fmtDec2.format(activeEmissionFactor)} kg CO2 / kWh
- Total Audited Appliance Types: ${electricitySummary.appliances.length}
- Total Connected Units: ${electricitySummary.appliances.reduce((a, b) => a + b.count, 0)}

2. AGGREGATE CONSUMPTION & COST TOTALS
--------------------------------------------------------------------------------
- Total Daily Consumption: ${fmtDec.format(electricitySummary.totalDailyKwh)} kWh / day
- Total Monthly Consumption: ${fmt.format(electricitySummary.totalMonthlyKwh)} kWh / month
- Total Annual Consumption: ${fmt.format(electricitySummary.totalAnnualKwh)} kWh / year
- Estimated Daily Spend: ₹${fmtDec2.format(electricitySummary.totalDailyCost)} / day
- Estimated Monthly Spend: ₹${fmt.format(electricitySummary.totalMonthlyCost)} / month
- Estimated Annual Spend: ₹${fmt.format(electricitySummary.totalAnnualCost)} / year
- Monthly CO2 Emissions: ${fmt.format(electricitySummary.totalMonthlyCo2Kg)} kg CO2 / month
- Annual CO2 Emissions: ${fmt.format(electricitySummary.totalAnnualCo2Kg)} kg CO2 / year (${fmtDec2.format(electricitySummary.totalAnnualCo2Kg / 1000)} tonnes)

3. APPLIANCE-BY-APPLIANCE BREAKDOWN
--------------------------------------------------------------------------------
${electricitySummary.appliances
  .map(
    (app, i) =>
      `${i + 1}. ${app.name} (${app.category || "General"})
   Qty: ${app.count} | Rated Power: ${app.powerWatts}W | Usage: ${app.hoursPerDay} hrs/day, ${app.daysPerMonth} days/mo
   Daily Energy: ${fmtDec2.format(app.dailyKwh)} kWh | Monthly Energy: ${fmt.format(app.monthlyKwh)} kWh (${fmtDec.format(app.percentageOfTotal)}% of total)
   Monthly Cost: ₹${fmt.format(app.monthlyCost)} | Annual Cost: ₹${fmt.format(app.annualCost)}
   Monthly CO2: ${fmtDec.format(app.monthlyCo2Kg)} kg CO2`,
  )
  .join("\n\n")}

4. FORMULAS USED
--------------------------------------------------------------------------------
- Daily Energy (kWh) = Appliance Count × Power (W) × Operating Hours / 1000
- Monthly Energy (kWh) = Daily Energy × Operating Days per Month
- Monthly Cost (₹) = Monthly Energy × Tariff
- Annual Cost (₹) = Monthly Cost × 12
- Grid Carbon Emissions = Energy (kWh) × Grid Emission Factor
================================================================================`;

  // ===========================================================================
  // 4. COMPARISON CALCULATIONS & REPORT
  // ===========================================================================
  const bothCalculatorsReady = solarResult.ok && hydroResult.valid;

  const comparisonChartData = [
    {
      metric: "Monthly Gen (kWh)",
      Solar: Math.round(solarResult.generation),
      Hydro: Math.round(hydroResult.monthlyEnergyKwh),
    },
    {
      metric: "Annual Gen (MWh)",
      Solar: Math.round(solarResult.annualGeneration / 1000),
      Hydro: Math.round(hydroResult.annualEnergyKwh / 1000),
    },
    {
      metric: "Annual Value (₹'000)",
      Solar: Math.round(solarResult.annual / 1000),
      Hydro: Math.round(hydroResult.annualValue / 1000),
    },
    {
      metric: "CO2 Offset (Tonnes)",
      Solar: Math.round(solarResult.co2 / 1000),
      Hydro: Math.round(hydroResult.annualCo2AvoidedKg / 1000),
    },
  ];

  const comparisonReport = `================================================================================
GREENGRID RENEWABLE ENERGY SOURCE COMPARISON (SOLAR vs HYDRO)
Generated: ${new Date().toLocaleString()}
================================================================================

1. COMPARATIVE METRICS MATRIX
--------------------------------------------------------------------------------
Metric                              | Solar Rooftop PV           | Micro-Hydropower Plant
--------------------------------------------------------------------------------
Installed / Rated Capacity          | ${solarResult.cap.toFixed(1)} kW                     | ${fmtDec2.format(hydroResult.powerKw)} kW
Daily Generation (kWh/day)          | ${fmtDec.format(solarResult.dailyGeneration)} kWh                    | ${fmtDec.format(hydroResult.dailyEnergyKwh)} kWh
Monthly Generation (kWh/month)      | ${fmt.format(solarResult.generation)} kWh                  | ${fmt.format(hydroResult.monthlyEnergyKwh)} kWh
Annual Generation (kWh/year)        | ${fmt.format(solarResult.annualGeneration)} kWh                | ${fmt.format(hydroResult.annualEnergyKwh)} kWh
Monthly Electricity Value           | ₹${fmt.format(solarResult.savings)}                     | ₹${fmt.format(hydroResult.monthlyValue)}
Annual Electricity Value            | ₹${fmt.format(solarResult.annual)}                    | ₹${fmt.format(hydroResult.annualValue)}
Annual CO2 Avoided                  | ${fmt.format(solarResult.co2)} kg (${fmtDec2.format(solarResult.co2 / 1000)} t)      | ${fmt.format(hydroResult.annualCo2AvoidedKg)} kg (${fmtDec2.format(hydroResult.annualCo2AvoidedKg / 1000)} t)
Estimated Capacity Factor           | ~${fmtDec.format(solarResult.cap > 0 ? (solarResult.annualGeneration / (solarResult.cap * 8760)) * 100 : 0)}%                      | ~${fmtDec.format(hydroResult.powerKw > 0 ? (hydroResult.annualEnergyKwh / (hydroResult.powerKw * 8760)) * 100 : 0)}%
Primary Resource Dependency         | Solar irradiance & roof    | Streamflow & hydraulic head

2. COMBINED RENEWABLE POTENTIAL (HYBRID INTEGRATION)
--------------------------------------------------------------------------------
- Combined Annual Clean Generation: ${fmt.format(solarResult.annualGeneration + hydroResult.annualEnergyKwh)} kWh / year
- Combined Annual Financial Value: ₹${fmt.format(solarResult.annual + hydroResult.annualValue)} / year
- Combined Annual CO2 Abatement: ${fmt.format(solarResult.co2 + hydroResult.annualCo2AvoidedKg)} kg CO2 / year (${fmtDec2.format((solarResult.co2 + hydroResult.annualCo2AvoidedKg) / 1000)} tonnes)

3. COMPARATIVE ENGINEERING ANALYSIS
--------------------------------------------------------------------------------
- Solar PV Pros: Zero moving parts, minimal maintenance, scalable on existing roofs.
- Solar PV Constraints: Intermittent day-only generation, weather dependent, requires storage for night loads.
- Hydropower Pros: High capacity factor, continuous 24/7 base-load power potential, high energy density per kW.
- Hydropower Constraints: Geographically limited to flowing water sources with elevation head, subject to seasonal dry spells.

4. MODELING ASSUMPTIONS & DISCLAIMER
--------------------------------------------------------------------------------
All generation figures are derived from parametric mathematical models using input assumptions.
They do not represent real-time SCADA telemetry or guaranteed commercial output.
================================================================================`;

  // UI helper for solar field rendering
  const solarField = (k: SolarTextField, label: string, opts: { step?: string } = {}) => (
    <label key={k} className="block">
      <span className={labelClass}>
        {label}
        <Tag kind={solarTouched[k] ? "user" : "sample"} />
      </span>
      <input
        className={`${inputClass} ${solarErr(k as SolarField) ? "border-danger ring-1 ring-danger/40" : ""}`}
        type="number"
        min="0"
        step={opts.step ?? "any"}
        value={solarV[k]}
        onChange={setSolarField(k)}
        aria-invalid={!!solarErr(k as SolarField)}
      />
      {solarErr(k as SolarField) && (
        <span className="mt-1 block text-xs text-danger">{solarErr(k as SolarField)}</span>
      )}
    </label>
  );

  // UI helper for hydro field rendering
  const hydroField = (
    k: HydroTextField,
    label: string,
    opts: { step?: string; placeholder?: string } = {},
  ) => (
    <label key={k} className="block">
      <span className={labelClass}>
        {label}
        <Tag kind={hydroTouched[k] ? "user" : "sample"} />
      </span>
      <input
        className={`${inputClass} ${hydroErr(k as HydroField) ? "border-danger ring-1 ring-danger/40" : ""}`}
        type="number"
        min="0"
        step={opts.step ?? "any"}
        placeholder={opts.placeholder}
        value={hydroV[k]}
        onChange={setHydroField(k)}
        aria-invalid={!!hydroErr(k as HydroField)}
      />
      {hydroErr(k as HydroField) && (
        <span className="mt-1 block text-xs text-danger">{hydroErr(k as HydroField)}</span>
      )}
    </label>
  );

  const money = (n: number) => `₹${fmt.format(n)}`;

  return (
    <AppShell>
      {/* Top Page Header */}
      <PageHeader
        eyebrow="Energy Modeling & Feasibility"
        title="Renewable Energy Calculator"
        description="Model and evaluate solar rooftop systems, micro-hydropower generation, and conventional electricity consumption with instant financial and carbon impact analysis."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "solar" && (
              <>
                <Button variant="secondary" onClick={handleResetSolar} title="Reset to defaults">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
                <Button
                  disabled={!solarResult.ok}
                  onClick={() => downloadText("GreenGrid-solar-estimate.txt", solarReport)}
                >
                  <Download className="h-4 w-4" /> Download Report
                </Button>
              </>
            )}
            {activeTab === "hydro" && (
              <>
                <Button variant="secondary" onClick={handleResetHydro} title="Reset to defaults">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
                <Button
                  disabled={!hydroResult.valid}
                  onClick={() => downloadText("GreenGrid-hydro-assessment.txt", hydroReport)}
                >
                  <Download className="h-4 w-4" /> Download Report
                </Button>
              </>
            )}
            {activeTab === "electricity" && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleResetElectricity}
                  title="Reset to sample campus appliances"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
                <Button
                  disabled={electricitySummary.appliances.length === 0}
                  onClick={() => downloadText("GreenGrid-electricity-audit.txt", electricityReport)}
                >
                  <Download className="h-4 w-4" /> Download Report
                </Button>
              </>
            )}
            {activeTab === "comparison" && (
              <Button
                disabled={!bothCalculatorsReady}
                onClick={() => downloadText("GreenGrid-renewable-comparison.txt", comparisonReport)}
              >
                <Download className="h-4 w-4" /> Download Comparison
              </Button>
            )}
          </div>
        }
      />

      {/* Calculator Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("solar")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "solar"
              ? "border border-primary/30 bg-primary/15 text-primary shadow-sm"
              : "border border-border/70 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <SunMedium
            className={`h-4 w-4 ${activeTab === "solar" ? "text-primary" : "text-muted-foreground"}`}
          />
          <span>Solar Calculator</span>
          <span
            className={`hidden rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase sm:inline-block ${
              activeTab === "solar"
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Rooftop PV
          </span>
        </button>

        <button
          onClick={() => setActiveTab("hydro")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "hydro"
              ? "border border-primary/30 bg-primary/15 text-primary shadow-sm"
              : "border border-border/70 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Droplets
            className={`h-4 w-4 ${activeTab === "hydro" ? "text-primary" : "text-muted-foreground"}`}
          />
          <span>Hydropower Calculator</span>
          <span
            className={`hidden rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase sm:inline-block ${
              activeTab === "hydro"
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Micro-Hydro
          </span>
        </button>

        <button
          onClick={() => setActiveTab("electricity")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "electricity"
              ? "border border-primary/30 bg-primary/15 text-primary shadow-sm"
              : "border border-border/70 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Zap
            className={`h-4 w-4 ${activeTab === "electricity" ? "text-primary" : "text-muted-foreground"}`}
          />
          <span>Electricity Consumption</span>
          <span
            className={`hidden rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase sm:inline-block ${
              activeTab === "electricity"
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Appliances
          </span>
        </button>

        <button
          onClick={() => setActiveTab("comparison")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "comparison"
              ? "border border-primary/30 bg-primary/15 text-primary shadow-sm"
              : "border border-border/70 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Scale
            className={`h-4 w-4 ${activeTab === "comparison" ? "text-primary" : "text-muted-foreground"}`}
          />
          <span>Energy Comparison</span>
          <span
            className={`hidden rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase sm:inline-block ${
              activeTab === "comparison"
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Solar vs Hydro
          </span>
        </button>
      </div>

      {/* Global Metadata Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-warning" />
            <Tag kind="sample" /> preset demonstration value
          </span>
          <span className="flex items-center gap-1.5">
            <PencilLine className="h-3.5 w-3.5 text-info" />
            <Tag kind="user" /> user-modified parameter
          </span>
          <span className="flex items-center gap-1.5">
            <Sigma className="h-3.5 w-3.5 text-primary" />
            <Tag kind="estimate" /> calculated via formula
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Tariff: <strong className="text-foreground">₹{fmtDec2.format(activeTariff)}/kWh</strong> ·
          Emission Factor:{" "}
          <strong className="text-foreground">
            {fmtDec2.format(activeEmissionFactor)} kg CO₂/kWh
          </strong>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: SOLAR CALCULATOR
      ===================================================================== */}
      {activeTab === "solar" && (
        <div className="grid items-start gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
          {/* Solar Left Column: Inputs */}
          <div className="space-y-4">
            <Card className="p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Solar System Inputs</h2>
                  <p className="text-xs text-muted-foreground">
                    Adjust inputs to instantly recompute metrics
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {solarField("consumption", "Monthly consumption (kWh)")}
                {solarField("bill", "Average monthly bill (₹)")}
                {solarField("area", "Available rooftop area (sq. ft.)")}
                <label className="block">
                  <span className={labelClass}>Solar panel type</span>
                  <select
                    className={inputClass}
                    value={panelType}
                    onChange={(e) => setPanelType(e.target.value as PanelType)}
                  >
                    <option value="mono">Monocrystalline (550W, 80 sq. ft./kW)</option>
                    <option value="poly">Polycrystalline (450W, 95 sq. ft./kW)</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Solar system type</span>
                  <select
                    className={inputClass}
                    value={system}
                    onChange={(e) => setSystem(e.target.value as SystemType)}
                  >
                    <option value="on-grid">On-grid (Grid-tied net metering)</option>
                    <option value="off-grid">Off-grid (Battery backed)</option>
                    <option value="hybrid">Hybrid (Grid + Battery storage)</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Installation location</span>
                  <select className={inputClass} value={location} onChange={onLocationSelect}>
                    {Object.keys(locationPresets).map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-1 font-semibold text-foreground">Solar Capacity Selection</h2>
              <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/8 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Recommended for your usage
                    <Tag kind="estimate" />
                  </p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {solarPreview.valid ? `${solarPreview.recommended.toFixed(1)} kW` : "—"}
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="mb-4 flex rounded-lg border border-border bg-secondary p-1">
                {(["recommended", "custom"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSolarMode(m)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      solarMode === m
                        ? "bg-accent text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "recommended" ? "Use recommended" : "Custom capacity"}
                  </button>
                ))}
              </div>
              {solarMode === "custom" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {["1", "2", "3", "5", "10"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setSolarV((p) => ({ ...p, capacity: c }))}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          solarV.capacity === c
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        }`}
                      >
                        {c} kW
                      </button>
                    ))}
                  </div>
                  {solarField("capacity", "Selected capacity (kW)", { step: "0.5" })}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Rooftop supports up to{" "}
                <span className="font-semibold text-foreground">
                  {Number.isFinite(solarResult.maxArea) ? solarResult.maxArea.toFixed(1) : "—"} kW
                </span>{" "}
                with {panelSpecs[panelType].label.toLowerCase()} panels (
                {panelSpecs[panelType].sqftPerKw} sq. ft./kW).
              </p>
              {solarResult.areaInsufficient && (
                <div className="mt-3 flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Insufficient rooftop area: {solarCapacity.toFixed(1)} kW needs about{" "}
                    {fmt.format(solarResult.requiredArea)} sq. ft., but only{" "}
                    {fmt.format(solarBase.area)} sq. ft. is available. Reduce capacity to{" "}
                    {solarResult.maxArea.toFixed(1)} kW or less.
                  </span>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-1 font-semibold text-foreground">Generation Assumptions</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Location presets are sample regional averages; override as needed.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {solarField("sunHours", "Avg. daily peak sun hours", { step: "0.1" })}
                {solarField("efficiency", "System efficiency after losses (%)", { step: "1" })}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-1 font-semibold text-foreground">Installation & Equipment Costs</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Editable component costs; tariff is shared with platform settings.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {solarField("costPerKw", "Solar panels base cost per kW (₹)")}
                {solarField("costPerPanel", "Additional mounting hardware per panel (₹)")}
                {solarField("inverterCost", "Inverter cost per kW (₹)")}
                {solarField("installCost", "Installation & wiring per kW (₹)")}
                {solarField("batteryCost", "Battery cost per kW (₹, off-grid/hybrid)")}
                <label className="block">
                  <span className={labelClass}>
                    Electricity tariff (₹/kWh)
                    <Tag kind={tariffText !== null ? "user" : "sample"} />
                  </span>
                  <input
                    className={`${inputClass} ${solarErr("tariff") ? "border-danger" : ""}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={tariffText ?? String(settings.tariff)}
                    onChange={onTariffChange}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>
                    Grid CO₂ factor (kg/kWh)
                    <Tag kind={factorText !== null ? "user" : "sample"} />
                  </span>
                  <input
                    className={`${inputClass} ${solarErr("emissionFactor") ? "border-danger" : ""}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={factorText ?? String(settings.emissionFactor)}
                    onChange={onFactorChange}
                  />
                </label>
              </div>
            </Card>
          </div>

          {/* Solar Right Column: Results & Charts */}
          <div className="space-y-4">
            {!solarResult.valid && (
              <div className="flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Please fix the highlighted inputs in the left panel to calculate solar estimates.
              </div>
            )}

            {/* Top 4 KPI Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Recommended capacity"
                value={solarResult.ok ? `${solarResult.cap.toFixed(1)} kW` : "—"}
                detail={`${solarPreview.valid ? solarPreview.recommended.toFixed(1) : "—"} kW optimal`}
                icon={PanelsTopLeft}
              />
              <MetricCard
                label="Solar panels required"
                value={solarResult.ok ? `${solarResult.panels}` : "—"}
                detail={`${panelSpecs[panelType].watts}W ${panelSpecs[panelType].label.toLowerCase()}`}
                icon={PanelsTopLeft}
                tone="blue"
              />
              <MetricCard
                label="Total system cost"
                value={solarResult.ok ? money(solarResult.total) : "—"}
                detail="Equipment & installation"
                icon={IndianRupee}
                tone="amber"
              />
              <MetricCard
                label="Estimated payback"
                value={
                  solarResult.ok && solarResult.payback
                    ? `${solarResult.payback.toFixed(1)} yrs`
                    : "—"
                }
                detail={`${solarResult.ok ? money(solarResult.annual) : "—"} annual savings`}
                icon={TimerReset}
                tone="rose"
              />
            </div>

            {/* Generation & Savings KPI Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Monthly generation"
                value={solarResult.ok ? `${fmt.format(solarResult.generation)} kWh` : "—"}
                detail={`~${fmtDec.format(solarResult.dailyGeneration)} kWh / day`}
                icon={Sun}
              />
              <MetricCard
                label="Annual generation"
                value={solarResult.ok ? `${fmt.format(solarResult.annualGeneration)} kWh` : "—"}
                detail={`${solarBase.sunHours || 0} sun-hrs · ${solarBase.efficiency || 0}% eff.`}
                icon={SunMedium}
                tone="blue"
              />
              <MetricCard
                label="Monthly bill savings"
                value={solarResult.ok ? money(solarResult.savings) : "—"}
                detail={`Annual: ${solarResult.ok ? money(solarResult.annual) : "—"}`}
                icon={IndianRupee}
                tone="amber"
              />
              <MetricCard
                label="CO₂ emissions reduction"
                value={solarResult.ok ? `${fmt.format(solarResult.co2)} kg/yr` : "—"}
                detail={`~${fmtDec2.format(solarResult.co2 / 1000)} tonnes CO₂ / yr`}
                icon={Leaf}
                tone="green"
              />
            </div>

            {/* Cost Breakdown */}
            <Card>
              <ChartHeader
                title="Cost & Equipment Breakdown"
                subtitle="Computed from your editable pricing parameters"
              />
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {[
                  ["Solar PV Modules", solarResult.panelCost],
                  ["Inverter & Power Electronics", solarResult.inverter],
                  ["Installation, Wiring & Structures", solarResult.install],
                  ["Battery Storage & Controls", solarResult.battery],
                ].map(([name, value]) => (
                  <div
                    key={name as string}
                    className="flex items-center justify-between rounded-lg bg-secondary p-4"
                  >
                    <span className="text-sm text-muted-foreground">{name}</span>
                    <span className="font-semibold text-foreground">
                      {solarResult.ok ? money(value as number) : "—"}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/8 p-4 sm:col-span-2">
                  <span className="font-semibold text-foreground">
                    Total Capital Investment Estimate
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {solarResult.ok ? money(solarResult.total) : "—"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Charts: Before vs After & Monthly Savings */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <ChartHeader
                  title="Before vs After Monthly Bill"
                  subtitle="Projected grid electricity spend"
                />
                <div className="h-72 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={solarSavingsData}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: chartColors.surface,
                          border: `1px solid ${chartColors.grid}`,
                          borderRadius: 8,
                        }}
                        formatter={(val) => `₹${fmt.format(Number(val))}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area
                        dataKey="before"
                        name="Before solar"
                        stroke={chartColors.info}
                        fill="transparent"
                      />
                      <Area
                        dataKey="after"
                        name="After solar"
                        stroke={chartColors.primary}
                        fill={chartColors.primary}
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <ChartHeader
                  title="Monthly Electricity Savings"
                  subtitle="Seasonally adjusted projection"
                />
                <div className="h-72 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={solarSavingsData}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: chartColors.surface,
                          border: `1px solid ${chartColors.grid}`,
                          borderRadius: 8,
                        }}
                        formatter={(val) => `₹${fmt.format(Number(val))}`}
                      />
                      <Bar
                        dataKey="savings"
                        name="Estimated Savings (₹)"
                        fill={chartColors.primary}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* ROI & Cumulative 10-year cash flow */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Estimated Financial Return
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  First-year return on capital expenditure
                </p>
                <div className="mt-6 grid place-items-center">
                  <div
                    className="grid h-40 w-40 place-items-center rounded-full border-[12px] border-primary/15"
                    style={{
                      borderTopColor: chartColors.primary,
                      borderRightColor:
                        solarResult.roi && solarResult.roi > 20 ? chartColors.primary : undefined,
                    }}
                  >
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground">
                        {solarResult.ok && solarResult.roi !== null
                          ? `${solarResult.roi.toFixed(1)}%`
                          : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">year-one ROI</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <ChartHeader
                  title="Cumulative 10-Year Net Cash Flow"
                  subtitle="Breakeven point and net savings"
                />
                <div className="h-64 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={solarRoiData}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: chartColors.surface,
                          border: `1px solid ${chartColors.grid}`,
                          borderRadius: 8,
                        }}
                        formatter={(val) => `₹${fmt.format(Number(val))}`}
                      />
                      <Area
                        dataKey="cumulative"
                        name="Net Cash Position (₹)"
                        stroke={chartColors.primary}
                        fill={chartColors.primary}
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Planning Disclaimer */}
            <div className="flex gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4">
              <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <p className="text-xs leading-5 text-muted-foreground">
                <strong className="text-warning">Planning Estimate:</strong> Generation, cost, and
                savings figures are modeled from standard meteorological and electrical formulas.
                Actual site yield depends on building orientation, shading obstruction, seasonal
                weather, local utility net-metering policies, and applicable subsidies.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: HYDROPOWER CALCULATOR
      ===================================================================== */}
      {activeTab === "hydro" && (
        <div className="grid items-start gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
          {/* Hydro Left Column: Inputs */}
          <div className="space-y-4">
            <Card className="p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-info/10 text-info">
                  <Waves className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Hydraulic Parameters</h2>
                  <p className="text-xs text-muted-foreground">
                    Define water flow, effective head & efficiencies
                  </p>
                </div>
              </div>

              {/* Water flow rate with unit selector toggle */}
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={labelClass + " mb-0"}>
                      Water flow rate
                      <Tag kind={hydroTouched.flowRate ? "user" : "sample"} />
                    </span>
                    <div className="flex rounded-md border border-border bg-secondary p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleFlowUnitToggle("m3s")}
                        className={`rounded px-2 py-0.5 font-medium transition-colors ${
                          hydroV.flowUnit === "m3s"
                            ? "bg-accent text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        m³/s
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFlowUnitToggle("ls")}
                        className={`rounded px-2 py-0.5 font-medium transition-colors ${
                          hydroV.flowUnit === "ls"
                            ? "bg-accent text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        L/s
                      </button>
                    </div>
                  </div>
                  <input
                    className={`${inputClass} ${hydroErr("flowRate") ? "border-danger ring-1 ring-danger/40" : ""}`}
                    type="number"
                    min="0"
                    step="any"
                    value={hydroV.flowRate}
                    onChange={setHydroField("flowRate")}
                    aria-invalid={!!hydroErr("flowRate")}
                  />
                  {hydroErr("flowRate") && (
                    <span className="mt-1 block text-xs text-danger">{hydroErr("flowRate")}</span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    Equivalent:{" "}
                    {hydroV.flowUnit === "m3s"
                      ? `${fmt.format(toNum(hydroV.flowRate) * 1000 || 0)} L/s`
                      : `${fmtDec2.format((toNum(hydroV.flowRate) || 0) / 1000)} m³/s`}
                  </span>
                </div>

                {hydroField("head", "Effective water head (metres)", { step: "0.5" })}

                <div className="grid gap-4 sm:grid-cols-2">
                  {hydroField("turbineEfficiency", "Turbine efficiency (%)", { step: "1" })}
                  {hydroField("generatorEfficiency", "Generator efficiency (%)", { step: "1" })}
                </div>

                <div className="rounded-lg border border-info/20 bg-info/8 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Overall system efficiency:</span>
                    <span className="font-bold text-info">
                      {fmtDec.format(hydroResult.overallEfficiencyPct)}%
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Turbine ({hydroV.turbineEfficiency}%) × Generator ({hydroV.generatorEfficiency}
                    %)
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-1 font-semibold text-foreground">Operational Schedule</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Specify plant runtime to estimate energy yield
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {hydroField("operatingHoursPerDay", "Operating hours per day (0–24)", {
                  step: "1",
                })}
                {hydroField("operatingDaysPerYear", "Operating days per year (0–366)", {
                  step: "1",
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setHydroV((p) => ({
                      ...p,
                      operatingHoursPerDay: "24",
                      operatingDaysPerYear: "350",
                    }))
                  }
                  className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  24/7 Baseload
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHydroV((p) => ({
                      ...p,
                      operatingHoursPerDay: "18",
                      operatingDaysPerYear: "300",
                    }))
                  }
                  className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Seasonal Run-of-River
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHydroV((p) => ({
                      ...p,
                      operatingHoursPerDay: "8",
                      operatingDaysPerYear: "260",
                    }))
                  }
                  className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Peak Peaker
                </button>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-1 font-semibold text-foreground">Tariff & Carbon Factor</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Shared baseline electricity valuation parameters
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block">
                  <span className={labelClass}>
                    Electricity tariff (₹/kWh)
                    <Tag kind={tariffText !== null ? "user" : "sample"} />
                  </span>
                  <input
                    className={`${inputClass} ${hydroErr("tariff") ? "border-danger" : ""}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={tariffText ?? String(settings.tariff)}
                    onChange={onTariffChange}
                  />
                  {hydroErr("tariff") && (
                    <span className="mt-1 block text-xs text-danger">{hydroErr("tariff")}</span>
                  )}
                </label>
                <label className="block">
                  <span className={labelClass}>
                    Grid CO₂ factor (kg/kWh)
                    <Tag kind={factorText !== null ? "user" : "sample"} />
                  </span>
                  <input
                    className={`${inputClass} ${hydroErr("emissionFactor") ? "border-danger" : ""}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={factorText ?? String(settings.emissionFactor)}
                    onChange={onFactorChange}
                  />
                  {hydroErr("emissionFactor") && (
                    <span className="mt-1 block text-xs text-danger">
                      {hydroErr("emissionFactor")}
                    </span>
                  )}
                </label>
              </div>
            </Card>

            {/* Note on Theoretical vs Actual and Capital Costs */}
            <div className="rounded-lg border border-info/20 bg-info/5 p-4 text-xs leading-5 text-muted-foreground">
              <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-info">
                <Info className="h-4 w-4 shrink-0" />
                Capital Cost Policy Note
              </div>
              Civil engineering, weir construction, and penstock piping vary dramatically by site
              topography. In accordance with sound engineering practice, this tool models electrical
              generation and value rather than inventing speculative capital costs or payback
              periods without site survey data.
            </div>
          </div>

          {/* Hydro Right Column: Results & Charts */}
          <div className="space-y-4">
            {!hydroResult.valid && (
              <div className="flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Please correct the hydraulic inputs in the left panel to calculate hydropower
                output.
              </div>
            )}

            {/* Top 4 KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Electrical power output"
                value={hydroResult.valid ? `${fmtDec2.format(hydroResult.powerKw)} kW` : "—"}
                detail={`Head: ${hydroV.head}m · Flow: ${fmtDec2.format(hydroResult.flowM3s)} m³/s`}
                icon={Zap}
                tone="green"
              />
              <MetricCard
                label="Daily energy generation"
                value={hydroResult.valid ? `${fmtDec.format(hydroResult.dailyEnergyKwh)} kWh` : "—"}
                detail={`${hydroV.operatingHoursPerDay} operating hrs/day`}
                icon={Droplets}
                tone="blue"
              />
              <MetricCard
                label="Monthly electricity value"
                value={hydroResult.valid ? money(hydroResult.monthlyValue) : "—"}
                detail={`At ₹${fmtDec2.format(activeTariff)}/kWh tariff`}
                icon={IndianRupee}
                tone="amber"
              />
              <MetricCard
                label="Annual CO₂ avoided"
                value={hydroResult.valid ? `${fmt.format(hydroResult.annualCo2AvoidedKg)} kg` : "—"}
                detail={`~${fmtDec2.format(hydroResult.annualCo2AvoidedKg / 1000)} tonnes CO₂ / yr`}
                icon={Leaf}
                tone="rose"
              />
            </div>

            {/* Annual & Secondary Metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Monthly generation"
                value={hydroResult.valid ? `${fmt.format(hydroResult.monthlyEnergyKwh)} kWh` : "—"}
                detail="Average across billing cycles"
                icon={Waves}
              />
              <MetricCard
                label="Annual generation"
                value={hydroResult.valid ? `${fmt.format(hydroResult.annualEnergyKwh)} kWh` : "—"}
                detail={`${hydroV.operatingDaysPerYear} days / year operating`}
                icon={Waves}
                tone="blue"
              />
              <MetricCard
                label="Annual electricity value"
                value={hydroResult.valid ? money(hydroResult.annualValue) : "—"}
                detail="Value of clean power generated"
                icon={IndianRupee}
                tone="amber"
              />
            </div>

            {/* Formula Explanation Card */}
            <Card className="p-5">
              <ChartHeader
                title="Hydropower Formula & Power Flow"
                subtitle="Pure physics calculation: P = 9.81 × Q × H × η"
              />
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Water Flow (Q)</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {fmtDec2.format(hydroResult.flowM3s)} m³/s
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    ({fmt.format(hydroResult.flowLs)} L/s)
                  </p>
                </div>
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Effective Head (H)</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{hydroResult.head} m</p>
                  <p className="text-[11px] text-muted-foreground">Net hydraulic elevation</p>
                </div>
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Overall Efficiency (η)</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {fmtDec.format(hydroResult.overallEfficiencyPct)}%
                  </p>
                  <p className="text-[11px] text-muted-foreground">Turbine × Generator</p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/8 p-4">
                  <p className="text-xs text-muted-foreground">Net Power Output</p>
                  <p className="mt-1 text-xl font-bold text-primary">
                    {hydroResult.valid ? `${fmtDec2.format(hydroResult.powerKw)} kW` : "—"}
                  </p>
                  <p className="text-[11px] text-primary">Continuous electrical rating</p>
                </div>
              </div>
            </Card>

            {/* Charts: Monthly Generation & Head Sensitivity */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <ChartHeader
                  title="Monthly Generation & Electricity Value"
                  subtitle="Simulation with seasonal monsoon and dry period runoff"
                />
                <div className="h-72 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hydroMonthlyData}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: chartColors.surface,
                          border: `1px solid ${chartColors.grid}`,
                          borderRadius: 8,
                        }}
                        formatter={(val, name) =>
                          name === "Generation (kWh)"
                            ? `${fmt.format(Number(val))} kWh`
                            : `₹${fmt.format(Number(val))}`
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        dataKey="generation"
                        name="Generation (kWh)"
                        fill={chartColors.info}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <ChartHeader
                  title="Head Sensitivity Curve"
                  subtitle={`Power output vs hydraulic head at ${fmtDec2.format(hydroResult.flowM3s)} m³/s flow`}
                />
                <div className="h-72 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={headSensitivityData}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis
                        dataKey="head"
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: chartColors.surface,
                          border: `1px solid ${chartColors.grid}`,
                          borderRadius: 8,
                        }}
                        formatter={(val) => `${val} kW`}
                      />
                      <Area
                        type="monotone"
                        dataKey="powerKw"
                        name="Power (kW)"
                        stroke={chartColors.primary}
                        fill={chartColors.primary}
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Engineering Note Distinguishing Theoretical vs Actual */}
            <div className="flex gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <p className="text-xs leading-5 text-muted-foreground">
                <strong className="text-warning">Theoretical vs. Actual Performance Notice:</strong>{" "}
                Hydropower power equations describe theoretical energy potential under steady-state
                laminar conditions. Real-world plant generation fluctuates according to seasonal
                hydrographs, penstock friction head losses, trash rack clogging, turbine cavitation
                limits, and environmental minimum flow bypass mandates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: ELECTRICITY CONSUMPTION CALCULATOR
      ===================================================================== */}
      {activeTab === "electricity" && (
        <div className="space-y-6">
          {/* Top Metrics Banner */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Daily consumption"
              value={`${fmtDec.format(electricitySummary.totalDailyKwh)} kWh`}
              detail={`Spend: ₹${fmtDec.format(electricitySummary.totalDailyCost)} / day`}
              icon={Zap}
              tone="amber"
            />
            <MetricCard
              label="Monthly consumption"
              value={`${fmt.format(electricitySummary.totalMonthlyKwh)} kWh`}
              detail={`Spend: ₹${fmt.format(electricitySummary.totalMonthlyCost)} / month`}
              icon={Calculator}
              tone="blue"
            />
            <MetricCard
              label="Annual electricity spend"
              value={money(electricitySummary.totalAnnualCost)}
              detail={`${fmt.format(electricitySummary.totalAnnualKwh)} kWh / year`}
              icon={IndianRupee}
              tone="rose"
            />
            <MetricCard
              label="Carbon footprint"
              value={`${fmt.format(electricitySummary.totalMonthlyCo2Kg)} kg`}
              detail={`~${fmtDec2.format(electricitySummary.totalAnnualCo2Kg / 1000)} tonnes CO₂ / yr`}
              icon={Leaf}
              tone="green"
            />
          </div>

          {/* Main Grid: Appliance Manager & Summary */}
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)]">
            {/* Left: Appliance List & Add Form */}
            <div className="space-y-4">
              <Card className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">
                      Connected Appliances & Equipment
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Add, adjust, or remove equipment to compute facility load
                    </p>
                  </div>
                  <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {electricitySummary.appliances.length} items registered
                  </span>
                </div>

                {/* Appliance Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left">
                    <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Appliance / Equipment</th>
                        <th className="px-3 py-2.5 font-medium">Qty</th>
                        <th className="px-3 py-2.5 font-medium">Power (W)</th>
                        <th className="px-3 py-2.5 font-medium">Hrs/Day</th>
                        <th className="px-3 py-2.5 font-medium">Days/Mo</th>
                        <th className="px-3 py-2.5 font-medium">Monthly kWh</th>
                        <th className="px-3 py-2.5 font-medium">Monthly ₹</th>
                        <th className="px-2 py-2.5 text-center font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {electricitySummary.appliances.map((app) => (
                        <tr key={app.id} className="transition-colors hover:bg-secondary/30">
                          <td className="px-3 py-3">
                            <input
                              className="h-8 w-full rounded border border-transparent bg-transparent px-1.5 text-sm font-semibold text-foreground transition focus:border-primary focus:bg-secondary"
                              value={app.name}
                              onChange={(e) =>
                                handleUpdateAppliance(app.id, { name: e.target.value })
                              }
                            />
                            <span className="block px-1.5 text-[10px] text-muted-foreground">
                              {app.category || "General"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="1"
                              className="h-8 w-14 rounded border border-border bg-secondary px-1 text-center text-xs font-medium text-foreground outline-none focus:border-primary"
                              value={app.count}
                              onChange={(e) =>
                                handleUpdateAppliance(app.id, {
                                  count: Math.max(1, parseInt(e.target.value, 10) || 1),
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="1"
                              className="h-8 w-18 rounded border border-border bg-secondary px-1 text-center text-xs font-medium text-foreground outline-none focus:border-primary"
                              value={app.powerWatts}
                              onChange={(e) =>
                                handleUpdateAppliance(app.id, {
                                  powerWatts: Math.max(1, parseFloat(e.target.value) || 1),
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              className="h-8 w-14 rounded border border-border bg-secondary px-1 text-center text-xs font-medium text-foreground outline-none focus:border-primary"
                              value={app.hoursPerDay}
                              onChange={(e) =>
                                handleUpdateAppliance(app.id, {
                                  hoursPerDay: Math.min(
                                    24,
                                    Math.max(0, parseFloat(e.target.value) || 0),
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max="31"
                              className="h-8 w-14 rounded border border-border bg-secondary px-1 text-center text-xs font-medium text-foreground outline-none focus:border-primary"
                              value={app.daysPerMonth}
                              onChange={(e) =>
                                handleUpdateAppliance(app.id, {
                                  daysPerMonth: Math.min(
                                    31,
                                    Math.max(0, parseInt(e.target.value, 10) || 0),
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-foreground">
                            {fmt.format(app.monthlyKwh)}
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-primary">
                            ₹{fmt.format(app.monthlyCost)}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveAppliance(app.id)}
                              className="rounded p-1 text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                              title="Delete appliance"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {electricitySummary.appliances.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No appliances configured. Click below to add an appliance or reset defaults.
                  </div>
                )}
              </Card>

              {/* Add Appliance Card */}
              <Card className="p-5">
                <h3 className="mb-1 text-sm font-semibold text-foreground">
                  Add New Appliance or Equipment
                </h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Select a commercial/residential preset or enter custom wattage
                </p>

                <div className="mb-4">
                  <label className="block">
                    <span className={labelClass}>Quick Presets</span>
                    <select
                      className={inputClass}
                      value={selectedPreset}
                      onChange={(e) => handleSelectPreset(e.target.value)}
                    >
                      <option value="">-- Choose from preset equipment --</option>
                      {appliancePresets.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                          {preset.name} ({preset.powerWatts}W · {preset.hoursPerDay}h/day)
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="sm:col-span-2">
                    <label className="block">
                      <span className={labelClass}>Appliance Name</span>
                      <input
                        className={inputClass}
                        placeholder="e.g. Server AC Unit"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block">
                      <span className={labelClass}>Quantity</span>
                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        value={newAppCount}
                        onChange={(e) => setNewAppCount(e.target.value)}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block">
                      <span className={labelClass}>Power (Watts)</span>
                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        value={newAppWatts}
                        onChange={(e) => setNewAppWatts(e.target.value)}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block">
                      <span className={labelClass}>Hrs / Day</span>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={newAppHours}
                        onChange={(e) => setNewAppHours(e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Operating Days:{" "}
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={newAppDays}
                      onChange={(e) => setNewAppDays(e.target.value)}
                      className="ml-1 inline-block h-7 w-12 rounded border border-border bg-secondary px-1 text-center text-xs font-semibold text-foreground outline-none"
                    />{" "}
                    days/month
                  </div>
                  <Button onClick={handleAddAppliance}>
                    <Plus className="h-4 w-4" /> Add Appliance
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right: Charts & Breakdown */}
            <div className="space-y-4">
              <Card>
                <ChartHeader
                  title="Monthly Electricity by Appliance"
                  subtitle="Energy consumption in kWh per month"
                />
                <div className="h-72 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={electricityChartData}
                      layout="vertical"
                      margin={{ left: 10, right: 10 }}
                    >
                      <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                      <XAxis
                        type="number"
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={chartColors.muted}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          background: chartColors.surface,
                          border: `1px solid ${chartColors.grid}`,
                          borderRadius: 8,
                        }}
                        formatter={(val) => `${fmt.format(Number(val))} kWh`}
                      />
                      <Bar
                        dataKey="monthlyKwh"
                        name="Monthly kWh"
                        fill={chartColors.primary}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 font-semibold text-foreground">Top Energy Consumers</h3>
                <div className="space-y-3">
                  {electricitySummary.appliances
                    .slice()
                    .sort((a, b) => b.monthlyKwh - a.monthlyKwh)
                    .slice(0, 5)
                    .map((app) => (
                      <div key={app.id}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{app.name}</span>
                          <span className="font-semibold text-primary">
                            {fmt.format(app.monthlyKwh)} kWh ({app.percentageOfTotal.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, app.percentageOfTotal)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-2 font-semibold text-foreground">
                  Tariff & Carbon Emission Parameters
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Tariff (₹/kWh)</span>
                    <input
                      className={inputClass}
                      type="number"
                      step="0.01"
                      value={tariffText ?? String(settings.tariff)}
                      onChange={onTariffChange}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>CO₂ factor (kg/kWh)</span>
                    <input
                      className={inputClass}
                      type="number"
                      step="0.01"
                      value={factorText ?? String(settings.emissionFactor)}
                      onChange={onFactorChange}
                    />
                  </label>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>Monthly Grid Cost:</span>
                  <span className="text-base font-bold text-foreground">
                    ₹{fmt.format(electricitySummary.totalMonthlyCost)}
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: ENERGY SOURCE COMPARISON (SOLAR vs HYDRO)
      ===================================================================== */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          {!bothCalculatorsReady ? (
            <Card className="p-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
              <h2 className="mt-4 text-lg font-bold text-foreground">
                Complete Solar & Hydro Inputs to Compare
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                To generate an energy source comparison, ensure both the Solar Calculator and
                Hydropower Calculator tabs have valid inputs without errors.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="secondary" onClick={() => setActiveTab("solar")}>
                  Open Solar Calculator
                </Button>
                <Button variant="secondary" onClick={() => setActiveTab("hydro")}>
                  Open Hydropower Calculator
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Comparative Matrix Card */}
              <Card className="p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Solar PV vs. Micro-Hydropower Comparison Matrix
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Side-by-side comparison of modeled clean energy generation, financial value &
                      carbon displacement
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      <SunMedium className="h-3.5 w-3.5" /> Solar: {solarResult.cap.toFixed(1)} kW
                    </span>
                    <span className="flex items-center gap-1 rounded bg-info/10 px-2 py-1 text-xs font-semibold text-info">
                      <Droplets className="h-3.5 w-3.5" /> Hydro:{" "}
                      {fmtDec.format(hydroResult.powerKw)} kW
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left">
                    <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Evaluation Metric</th>
                        <th className="px-4 py-3 font-semibold text-primary">Solar Photovoltaic</th>
                        <th className="px-4 py-3 font-semibold text-info">Micro-Hydropower</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Combined System</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      <tr>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          Rated / Peak Capacity
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {solarResult.cap.toFixed(1)} kW
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {fmtDec2.format(hydroResult.powerKw)} kW
                        </td>
                        <td className="px-4 py-3 font-bold text-primary">
                          {(solarResult.cap + hydroResult.powerKw).toFixed(1)} kW
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          Daily Energy Generation
                        </td>
                        <td className="px-4 py-3">
                          {fmtDec.format(solarResult.dailyGeneration)} kWh / day
                        </td>
                        <td className="px-4 py-3">
                          {fmtDec.format(hydroResult.dailyEnergyKwh)} kWh / day
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {fmtDec.format(solarResult.dailyGeneration + hydroResult.dailyEnergyKwh)}{" "}
                          kWh / day
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          Monthly Energy Generation
                        </td>
                        <td className="px-4 py-3">
                          {fmt.format(solarResult.generation)} kWh / month
                        </td>
                        <td className="px-4 py-3">
                          {fmt.format(hydroResult.monthlyEnergyKwh)} kWh / month
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {fmt.format(solarResult.generation + hydroResult.monthlyEnergyKwh)} kWh /
                          month
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          Annual Energy Generation
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {fmt.format(solarResult.annualGeneration)} kWh / year
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {fmt.format(hydroResult.annualEnergyKwh)} kWh / year
                        </td>
                        <td className="px-4 py-3 font-bold text-primary">
                          {fmt.format(solarResult.annualGeneration + hydroResult.annualEnergyKwh)}{" "}
                          kWh / year
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          Monthly Electricity Value
                        </td>
                        <td className="px-4 py-3">₹{fmt.format(solarResult.savings)}</td>
                        <td className="px-4 py-3">₹{fmt.format(hydroResult.monthlyValue)}</td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          ₹{fmt.format(solarResult.savings + hydroResult.monthlyValue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          Annual Electricity Value
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          ₹{fmt.format(solarResult.annual)}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          ₹{fmt.format(hydroResult.annualValue)}
                        </td>
                        <td className="px-4 py-3 font-bold text-primary">
                          ₹{fmt.format(solarResult.annual + hydroResult.annualValue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          Annual CO₂ Avoided
                        </td>
                        <td className="px-4 py-3">
                          {fmt.format(solarResult.co2)} kg ({fmtDec2.format(solarResult.co2 / 1000)}{" "}
                          t)
                        </td>
                        <td className="px-4 py-3">
                          {fmt.format(hydroResult.annualCo2AvoidedKg)} kg (
                          {fmtDec2.format(hydroResult.annualCo2AvoidedKg / 1000)} t)
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {fmt.format(solarResult.co2 + hydroResult.annualCo2AvoidedKg)} kg (
                          {fmtDec2.format(
                            (solarResult.co2 + hydroResult.annualCo2AvoidedKg) / 1000,
                          )}{" "}
                          t)
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          Operational Availability
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          Diurnal ({solarBase.sunHours} sun-hrs/day)
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          Continuous ({hydroV.operatingHoursPerDay} hrs/day)
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-primary">
                          Complementary baseload + peak
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Comparative Charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <ChartHeader
                    title="Energy Generation Comparison (kWh)"
                    subtitle="Solar vs. Hydro output across monthly and annual intervals"
                  />
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            category: "Monthly Generation (kWh)",
                            Solar: Math.round(solarResult.generation),
                            Hydro: Math.round(hydroResult.monthlyEnergyKwh),
                          },
                          {
                            category: "Daily Generation (kWh × 10)",
                            Solar: Math.round(solarResult.dailyGeneration * 10),
                            Hydro: Math.round(hydroResult.dailyEnergyKwh * 10),
                          },
                        ]}
                      >
                        <CartesianGrid stroke={chartColors.grid} vertical={false} />
                        <XAxis
                          dataKey="category"
                          stroke={chartColors.muted}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke={chartColors.muted}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: chartColors.surface,
                            border: `1px solid ${chartColors.grid}`,
                            borderRadius: 8,
                          }}
                          formatter={(v) => `${fmt.format(Number(v))}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Solar" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Hydro" fill={chartColors.info} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <ChartHeader
                    title="Annual Economic Value & Carbon Impact"
                    subtitle="Comparative financial value (₹'000) and CO₂ avoided (tonnes)"
                  />
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            category: "Annual Value (₹ thousands)",
                            Solar: Math.round(solarResult.annual / 1000),
                            Hydro: Math.round(hydroResult.annualValue / 1000),
                          },
                          {
                            category: "CO₂ Avoided (Tonnes/yr)",
                            Solar: Math.round(solarResult.co2 / 1000),
                            Hydro: Math.round(hydroResult.annualCo2AvoidedKg / 1000),
                          },
                        ]}
                      >
                        <CartesianGrid stroke={chartColors.grid} vertical={false} />
                        <XAxis
                          dataKey="category"
                          stroke={chartColors.muted}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke={chartColors.muted}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: chartColors.surface,
                            border: `1px solid ${chartColors.grid}`,
                            borderRadius: 8,
                          }}
                          formatter={(v) => `${fmt.format(Number(v))}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Solar" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Hydro" fill={chartColors.info} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Combined Resource Synergy Card */}
              <Card className="p-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Hybrid Renewable Energy Integration Synergy
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      How solar PV and micro-hydro complement campus energy management
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-secondary p-4">
                    <h4 className="text-xs font-semibold text-foreground">
                      Diurnal vs. Baseload Power
                    </h4>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Solar generates exclusively between 08:00 and 17:00, peak-shaving high air
                      conditioning demand. Hydro provides firm 24-hour baseload electricity,
                      eliminating evening grid peak charges.
                    </p>
                  </div>

                  <div className="rounded-lg bg-secondary p-4">
                    <h4 className="text-xs font-semibold text-foreground">
                      Seasonal Runoff Pairing
                    </h4>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Monsoon cloud cover lowers solar insolation while boosting stream runoff and
                      hydro output. Conversely, sunny dry summer months maximize solar output when
                      streamflow drops.
                    </p>
                  </div>

                  <div className="rounded-lg bg-secondary p-4">
                    <h4 className="text-xs font-semibold text-foreground">
                      Combined Clean Generation
                    </h4>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Together, the estimated system would generate{" "}
                      <strong className="text-primary">
                        {fmt.format(solarResult.annualGeneration + hydroResult.annualEnergyKwh)}{" "}
                        kWh/yr
                      </strong>
                      , avoiding{" "}
                      <strong className="text-primary">
                        {fmtDec2.format((solarResult.co2 + hydroResult.annualCo2AvoidedKg) / 1000)}{" "}
                        tonnes
                      </strong>{" "}
                      of CO₂ annually.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Comparison Disclaimer */}
              <div className="flex gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  <strong className="text-warning">Comparison Modeling Assumption:</strong> Solar
                  estimates assume 30 days/month at average peak sun hours. Hydropower assumes
                  steady flow rate at specified operating hours and days. Figures are mathematical
                  simulations and not guaranteed or actual measured generation data.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
