export type PanelType = "mono" | "poly";
export type SystemType = "on-grid" | "off-grid" | "hybrid";

export const panelSpecs: Record<PanelType, { watts: number; sqftPerKw: number; label: string }> = {
  mono: { watts: 550, sqftPerKw: 80, label: "Monocrystalline" },
  poly: { watts: 450, sqftPerKw: 95, label: "Polycrystalline" },
};

/** Sample average peak-sun-hours per day (demonstration assumptions, editable in the UI). */
export const locationPresets: Record<string, number> = {
  "Bengaluru, Karnataka": 5.2,
  "Chennai, Tamil Nadu": 5.4,
  "Delhi NCR": 5.0,
  "Mumbai, Maharashtra": 4.8,
  "Jaipur, Rajasthan": 5.8,
  "Kolkata, West Bengal": 4.5,
};

export type SolarInputs = {
  consumption: number;
  bill: number;
  area: number;
  panelType: PanelType;
  capacity: number;
  system: SystemType;
  sunHours: number;
  efficiency: number; // efficiency in % (after losses)
  costPerKw: number;
  costPerPanel: number;
  inverterCost: number;
  installCost: number;
  batteryCost: number;
  tariff: number;
  emissionFactor: number;
};

export type Field = keyof SolarInputs;

export function validate(i: SolarInputs): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  const num: Field[] = [
    "consumption",
    "bill",
    "area",
    "capacity",
    "sunHours",
    "efficiency",
    "costPerKw",
    "costPerPanel",
    "inverterCost",
    "installCost",
    "batteryCost",
    "tariff",
    "emissionFactor",
  ];
  for (const f of num) {
    const v = i[f] as number;
    if (!Number.isFinite(v)) e[f] = "This field is required.";
    else if (v < 0) e[f] = "Value cannot be negative.";
  }
  const positive: Field[] = ["consumption", "area", "capacity", "sunHours", "efficiency", "tariff"];
  for (const f of positive)
    if (!e[f] && (i[f] as number) === 0) e[f] = "Value must be greater than zero.";
  if (!e.efficiency && i.efficiency > 100) e.efficiency = "Efficiency cannot exceed 100%.";
  if (!e.sunHours && i.sunHours > 12) e.sunHours = "Daily sun hours above 12 are unrealistic.";
  return e;
}

/** kWh produced per kW per month (30 days). */
export const monthlyYieldPerKw = (sunHours: number, efficiency: number) =>
  sunHours * 30 * (efficiency / 100);

export function recommendCapacity(consumption: number, sunHours: number, efficiency: number) {
  const y = monthlyYieldPerKw(sunHours, efficiency);
  if (!(y > 0) || !(consumption > 0)) return 0;
  return Math.ceil((consumption / y) * 2) / 2; // round up to 0.5 kW
}

export function maxCapacityForArea(area: number, panelType: PanelType) {
  return area > 0 ? area / panelSpecs[panelType].sqftPerKw : 0;
}

export function calculate(i: SolarInputs) {
  const errors = validate(i);
  const valid = Object.keys(errors).length === 0;
  const recommended = valid ? recommendCapacity(i.consumption, i.sunHours, i.efficiency) : 0;
  const maxArea = maxCapacityForArea(i.area, i.panelType);
  const areaInsufficient = valid && i.capacity > maxArea;
  const requiredArea = i.capacity * panelSpecs[i.panelType].sqftPerKw;
  const ok = valid && !areaInsufficient;
  const cap = ok ? i.capacity : 0;
  const panels = cap > 0 ? Math.ceil((cap * 1000) / panelSpecs[i.panelType].watts) : 0;
  const panelCost = cap * i.costPerKw + panels * i.costPerPanel;
  const inverter = cap * i.inverterCost;
  const install = cap * i.installCost;
  const battery =
    i.system === "on-grid" ? 0 : cap * i.batteryCost * (i.system === "hybrid" ? 0.65 : 1);
  const total = panelCost + inverter + install + battery;
  const generation = cap * monthlyYieldPerKw(i.sunHours, i.efficiency);
  const dailyGeneration = generation / 30;
  const annualGeneration = generation * 12;
  const offset = Math.min(generation, i.consumption);
  const tariffSavings = offset * i.tariff;
  const savings = i.bill > 0 ? Math.min(i.bill, tariffSavings) : tariffSavings;
  const annual = savings * 12;
  const payback = annual > 0 && total > 0 ? total / annual : null;
  const roi = total > 0 ? (annual / total) * 100 : null;
  const co2 = generation * 12 * i.emissionFactor;
  return {
    errors,
    valid,
    ok,
    recommended,
    maxArea,
    areaInsufficient,
    requiredArea,
    cap,
    panels,
    panelCost,
    inverter,
    install,
    battery,
    total,
    generation,
    dailyGeneration,
    annualGeneration,
    savings,
    annual,
    payback,
    roi,
    co2,
  };
}
