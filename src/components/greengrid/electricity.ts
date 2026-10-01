export type ApplianceItem = {
  id: string;
  name: string;
  category?: string;
  count: number;
  powerWatts: number;
  hoursPerDay: number;
  daysPerMonth: number;
};

export type ApplianceCalculation = {
  id: string;
  name: string;
  category?: string;
  count: number;
  powerWatts: number;
  hoursPerDay: number;
  daysPerMonth: number;
  dailyKwh: number;
  monthlyKwh: number;
  annualKwh: number;
  dailyCost: number;
  monthlyCost: number;
  annualCost: number;
  monthlyCo2Kg: number;
  annualCo2Kg: number;
  percentageOfTotal: number;
};

export type ElectricityInputs = {
  appliances: ApplianceItem[];
  tariff: number;
  emissionFactor: number;
};

export type ElectricitySummary = {
  appliances: ApplianceCalculation[];
  totalDailyKwh: number;
  totalMonthlyKwh: number;
  totalAnnualKwh: number;
  totalDailyCost: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  totalMonthlyCo2Kg: number;
  totalAnnualCo2Kg: number;
  valid: boolean;
  errors: Record<string, string>;
};

export const defaultAppliances: ApplianceItem[] = [
  {
    id: "app-1",
    name: "LED Facility Lighting",
    category: "Lighting",
    count: 120,
    powerWatts: 40,
    hoursPerDay: 12,
    daysPerMonth: 30,
  },
  {
    id: "app-2",
    name: "Central HVAC Chillers",
    category: "Cooling",
    count: 3,
    powerWatts: 4500,
    hoursPerDay: 10,
    daysPerMonth: 26,
  },
  {
    id: "app-3",
    name: "Office Workstations & Mon.",
    category: "IT & Computing",
    count: 50,
    powerWatts: 160,
    hoursPerDay: 9,
    daysPerMonth: 24,
  },
  {
    id: "app-4",
    name: "Data Server & Network Rack",
    category: "IT & Computing",
    count: 2,
    powerWatts: 1500,
    hoursPerDay: 24,
    daysPerMonth: 30,
  },
  {
    id: "app-5",
    name: "Water Circulation Pumps",
    category: "Motors & Pumps",
    count: 2,
    powerWatts: 2200,
    hoursPerDay: 5,
    daysPerMonth: 30,
  },
];

export const appliancePresets: Array<{
  name: string;
  category: string;
  powerWatts: number;
  hoursPerDay: number;
  daysPerMonth: number;
}> = [
  {
    name: "LED Tube Light / Panel",
    category: "Lighting",
    powerWatts: 36,
    hoursPerDay: 12,
    daysPerMonth: 30,
  },
  {
    name: "High-Bay Industrial LED",
    category: "Lighting",
    powerWatts: 150,
    hoursPerDay: 14,
    daysPerMonth: 26,
  },
  {
    name: "Split AC (1.5 Ton, Inverter)",
    category: "Cooling",
    powerWatts: 1450,
    hoursPerDay: 8,
    daysPerMonth: 26,
  },
  {
    name: "Ceiling Fan (BLDC / Standard)",
    category: "Cooling",
    powerWatts: 60,
    hoursPerDay: 14,
    daysPerMonth: 30,
  },
  {
    name: "Commercial Refrigerator",
    category: "Refrigeration",
    powerWatts: 400,
    hoursPerDay: 24,
    daysPerMonth: 30,
  },
  {
    name: "Desktop Computer & Monitor",
    category: "IT & Computing",
    powerWatts: 180,
    hoursPerDay: 9,
    daysPerMonth: 24,
  },
  {
    name: "Laptop Computer",
    category: "IT & Computing",
    powerWatts: 65,
    hoursPerDay: 8,
    daysPerMonth: 22,
  },
  {
    name: "Network Switch & Router Rack",
    category: "IT & Computing",
    powerWatts: 250,
    hoursPerDay: 24,
    daysPerMonth: 30,
  },
  {
    name: "Submersible Water Pump (2 HP)",
    category: "Motors & Pumps",
    powerWatts: 1500,
    hoursPerDay: 4,
    daysPerMonth: 30,
  },
  {
    name: "Air Compressor (3 HP)",
    category: "Industrial",
    powerWatts: 2200,
    hoursPerDay: 6,
    daysPerMonth: 24,
  },
  {
    name: "Electric Water Heater / Geyser",
    category: "Heating",
    powerWatts: 2000,
    hoursPerDay: 3,
    daysPerMonth: 30,
  },
  {
    name: "EV Charging Station (Level 2)",
    category: "Mobility",
    powerWatts: 7400,
    hoursPerDay: 4,
    daysPerMonth: 26,
  },
];

export function calculateApplianceEnergy(
  item: ApplianceItem,
  tariff: number,
  emissionFactor: number,
): ApplianceCalculation {
  const count = Math.max(0, item.count);
  const powerWatts = Math.max(0, item.powerWatts);
  const hoursPerDay = Math.min(24, Math.max(0, item.hoursPerDay));
  const daysPerMonth = Math.min(31, Math.max(0, item.daysPerMonth));

  // Daily energy (kWh) = Number of appliances × Power (W) × Operating hours / 1000
  const dailyKwh = (count * powerWatts * hoursPerDay) / 1000;

  // Monthly energy (kWh) = Daily energy × Operating days per month
  const monthlyKwh = dailyKwh * daysPerMonth;

  // Annual energy (kWh) = Monthly energy × 12
  const annualKwh = monthlyKwh * 12;

  // Monthly cost (₹) = Monthly energy × Electricity tariff
  const monthlyCost = monthlyKwh * tariff;
  const dailyCost = dailyKwh * tariff;
  const annualCost = annualKwh * tariff;

  const monthlyCo2Kg = monthlyKwh * emissionFactor;
  const annualCo2Kg = annualKwh * emissionFactor;

  return {
    id: item.id,
    name: item.name || "Unnamed appliance",
    category: item.category || "General",
    count,
    powerWatts,
    hoursPerDay,
    daysPerMonth,
    dailyKwh,
    monthlyKwh,
    annualKwh,
    dailyCost,
    monthlyCost,
    annualCost,
    monthlyCo2Kg,
    annualCo2Kg,
    percentageOfTotal: 0,
  };
}

export function calculateElectricity(inputs: ElectricityInputs): ElectricitySummary {
  const errors: Record<string, string> = {};

  if (!Number.isFinite(inputs.tariff) || inputs.tariff < 0) {
    errors["tariff"] = "Electricity tariff must be a valid positive number.";
  }

  if (!Number.isFinite(inputs.emissionFactor) || inputs.emissionFactor < 0) {
    errors["emissionFactor"] = "Emission factor must be a valid non-negative number.";
  }

  const safeTariff = Number.isFinite(inputs.tariff) && inputs.tariff >= 0 ? inputs.tariff : 0;
  const safeEmission =
    Number.isFinite(inputs.emissionFactor) && inputs.emissionFactor >= 0
      ? inputs.emissionFactor
      : 0;

  const valid = Object.keys(errors).length === 0;

  const applianceCalcs = inputs.appliances.map((app) =>
    calculateApplianceEnergy(app, safeTariff, safeEmission),
  );

  const totalDailyKwh = applianceCalcs.reduce((acc, a) => acc + a.dailyKwh, 0);
  const totalMonthlyKwh = applianceCalcs.reduce((acc, a) => acc + a.monthlyKwh, 0);
  const totalAnnualKwh = applianceCalcs.reduce((acc, a) => acc + a.annualKwh, 0);

  const totalDailyCost = applianceCalcs.reduce((acc, a) => acc + a.dailyCost, 0);
  const totalMonthlyCost = applianceCalcs.reduce((acc, a) => acc + a.monthlyCost, 0);
  const totalAnnualCost = applianceCalcs.reduce((acc, a) => acc + a.annualCost, 0);

  const totalMonthlyCo2Kg = totalMonthlyKwh * safeEmission;
  const totalAnnualCo2Kg = totalAnnualKwh * safeEmission;

  // Calculate percentages
  const appliancesWithPct = applianceCalcs.map((a) => ({
    ...a,
    percentageOfTotal: totalMonthlyKwh > 0 ? (a.monthlyKwh / totalMonthlyKwh) * 100 : 0,
  }));

  return {
    appliances: appliancesWithPct,
    totalDailyKwh,
    totalMonthlyKwh,
    totalAnnualKwh,
    totalDailyCost,
    totalMonthlyCost,
    totalAnnualCost,
    totalMonthlyCo2Kg,
    totalAnnualCo2Kg,
    valid,
    errors,
  };
}
