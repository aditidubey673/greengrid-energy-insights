import { useSyncExternalStore } from "react";

export type EnergySettings = { tariff: number; emissionFactor: number };
export const defaultEnergySettings: EnergySettings = { tariff: 8.06, emissionFactor: 0.82 };

const KEY = "greengrid-energy-settings";
let current: EnergySettings = defaultEnergySettings;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const tariff = Number(parsed.tariff), emissionFactor = Number(parsed.emissionFactor);
      current = {
        tariff: Number.isFinite(tariff) && tariff > 0 ? tariff : defaultEnergySettings.tariff,
        emissionFactor: Number.isFinite(emissionFactor) && emissionFactor >= 0 ? emissionFactor : defaultEnergySettings.emissionFactor,
      };
    }
  } catch { /* ignore corrupt storage */ }
}

export function setEnergySettings(next: Partial<EnergySettings>) {
  load();
  current = { ...current, ...next };
  try { window.localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export function useEnergySettings(): EnergySettings {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => { load(); return current; },
    () => defaultEnergySettings,
  );
}
