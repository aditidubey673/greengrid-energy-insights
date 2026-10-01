export type FlowUnit = "m3s" | "ls";

export type HydroInputs = {
  flowRate: number;
  flowUnit: FlowUnit;
  head: number;
  turbineEfficiency: number; // in %
  generatorEfficiency: number; // in %
  operatingHoursPerDay: number;
  operatingDaysPerYear: number;
  tariff: number;
  emissionFactor: number;
};

export type HydroField = keyof HydroInputs;

export type HydroErrors = Partial<Record<HydroField, string>>;

export function validateHydro(i: HydroInputs): HydroErrors {
  const errors: HydroErrors = {};

  if (!Number.isFinite(i.flowRate)) {
    errors.flowRate = "Flow rate is required.";
  } else if (i.flowRate <= 0) {
    errors.flowRate = "Flow rate must be greater than zero.";
  }

  if (!Number.isFinite(i.head)) {
    errors.head = "Effective head is required.";
  } else if (i.head <= 0) {
    errors.head = "Head must be greater than zero.";
  }

  if (!Number.isFinite(i.turbineEfficiency)) {
    errors.turbineEfficiency = "Turbine efficiency is required.";
  } else if (i.turbineEfficiency <= 0 || i.turbineEfficiency > 100) {
    errors.turbineEfficiency = "Efficiency must be between 1% and 100%.";
  }

  if (!Number.isFinite(i.generatorEfficiency)) {
    errors.generatorEfficiency = "Generator efficiency is required.";
  } else if (i.generatorEfficiency <= 0 || i.generatorEfficiency > 100) {
    errors.generatorEfficiency = "Efficiency must be between 1% and 100%.";
  }

  if (!Number.isFinite(i.operatingHoursPerDay)) {
    errors.operatingHoursPerDay = "Operating hours is required.";
  } else if (i.operatingHoursPerDay < 0 || i.operatingHoursPerDay > 24) {
    errors.operatingHoursPerDay = "Hours must be between 0 and 24.";
  }

  if (!Number.isFinite(i.operatingDaysPerYear)) {
    errors.operatingDaysPerYear = "Operating days is required.";
  } else if (i.operatingDaysPerYear < 0 || i.operatingDaysPerYear > 366) {
    errors.operatingDaysPerYear = "Days must be between 0 and 366.";
  }

  if (!Number.isFinite(i.tariff)) {
    errors.tariff = "Tariff is required.";
  } else if (i.tariff < 0) {
    errors.tariff = "Tariff cannot be negative.";
  }

  if (!Number.isFinite(i.emissionFactor)) {
    errors.emissionFactor = "Emission factor is required.";
  } else if (i.emissionFactor < 0) {
    errors.emissionFactor = "Emission factor cannot be negative.";
  }

  return errors;
}

export type HydroResult = {
  errors: HydroErrors;
  valid: boolean;
  flowM3s: number;
  flowLs: number;
  head: number;
  overallEfficiencyPct: number;
  powerKw: number;
  dailyEnergyKwh: number;
  monthlyEnergyKwh: number;
  annualEnergyKwh: number;
  monthlyValue: number;
  annualValue: number;
  annualCo2AvoidedKg: number;
  monthlyCo2AvoidedKg: number;
};

export function calculateHydro(i: HydroInputs): HydroResult {
  const errors = validateHydro(i);
  const valid = Object.keys(errors).length === 0;

  if (!valid) {
    return {
      errors,
      valid: false,
      flowM3s: 0,
      flowLs: 0,
      head: 0,
      overallEfficiencyPct: 0,
      powerKw: 0,
      dailyEnergyKwh: 0,
      monthlyEnergyKwh: 0,
      annualEnergyKwh: 0,
      monthlyValue: 0,
      annualValue: 0,
      annualCo2AvoidedKg: 0,
      monthlyCo2AvoidedKg: 0,
    };
  }

  // Convert flow rate to m³/s and L/s
  const flowM3s = i.flowUnit === "ls" ? i.flowRate / 1000 : i.flowRate;
  const flowLs = i.flowUnit === "ls" ? i.flowRate : i.flowRate * 1000;

  // Convert percentages to decimal fraction
  const turbineEffDec = i.turbineEfficiency / 100;
  const generatorEffDec = i.generatorEfficiency / 100;
  const overallEfficiencyDec = turbineEffDec * generatorEffDec;
  const overallEfficiencyPct = overallEfficiencyDec * 100;

  // Formula: Power (kW) = 9.81 * Q (m3/s) * H (m) * Overall Efficiency
  const powerKw = 9.81 * flowM3s * i.head * overallEfficiencyDec;

  // Energy generation
  const dailyEnergyKwh = powerKw * i.operatingHoursPerDay;
  const annualEnergyKwh = dailyEnergyKwh * i.operatingDaysPerYear;
  const monthlyEnergyKwh = annualEnergyKwh / 12;

  // Economic value
  const monthlyValue = monthlyEnergyKwh * i.tariff;
  const annualValue = annualEnergyKwh * i.tariff;

  // Environmental impact
  const annualCo2AvoidedKg = annualEnergyKwh * i.emissionFactor;
  const monthlyCo2AvoidedKg = monthlyEnergyKwh * i.emissionFactor;

  return {
    errors,
    valid: true,
    flowM3s,
    flowLs,
    head: i.head,
    overallEfficiencyPct,
    powerKw,
    dailyEnergyKwh,
    monthlyEnergyKwh,
    annualEnergyKwh,
    monthlyValue,
    annualValue,
    annualCo2AvoidedKg,
    monthlyCo2AvoidedKg,
  };
}
