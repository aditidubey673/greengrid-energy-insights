import { apiClient } from "./api";

export interface HealthCheckResponse {
  status: "healthy" | "degraded";
  service: string;
  version: string;
  database: "connected" | "disconnected";
  database_engine?: string;
  database_name?: string;
  timestamp: string;
  error?: string;
}

export interface Facility {
  id: number;
  name: string;
  code?: string;
  facility_type?: string;
  location?: string;
  floor_area_sqft?: number | null;
  is_active: boolean;
  readings_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EnergySource {
  id: number;
  name: string;
  source_type: "grid" | "solar" | "hydro" | "wind" | "biomass";
  is_renewable: boolean;
  emission_factor: number;
  description?: string;
}

export interface EnergyReading {
  id: number;
  facility: number;
  facility_name?: string;
  energy_source: number;
  source_name?: string;
  source_type?: string;
  is_renewable?: boolean;
  timestamp: string;
  reading_value: number;
  unit: string;
  demand_kw?: number | null;
  is_demo: boolean;
  created_at?: string;
}

export interface SourceBreakdown {
  source_id: number;
  source_name: string;
  source_type: string;
  is_renewable: boolean;
  kwh: number;
  share: number;
}

export interface FacilityBreakdown {
  facility_id: number;
  facility_name: string;
  location: string;
  total_kwh: number;
  renewable_kwh: number;
  share: number;
}

export interface EnergySummary {
  is_empty: boolean;
  period: string;
  readings_count: number;
  total_consumption_kwh: number;
  renewable_generation_kwh: number;
  grid_consumption_kwh: number;
  renewable_percentage: number;
  grid_percentage: number;
  estimated_cost: number;
  tariff_rate: number;
  estimated_emissions_kg: number;
  breakdown_by_source: SourceBreakdown[];
  breakdown_by_facility: FacilityBreakdown[];
  message?: string;
}

export interface UtilityBill {
  id: number;
  facility?: number | null;
  facility_name?: string;
  billing_period_start: string;
  billing_period_end: string;
  consumption_kwh: number;
  total_amount: number;
  energy_charge: number;
  demand_charge: number;
  taxes_and_duties: number;
  tariff_rate?: number | null;
  payment_status: "pending" | "paid" | "overdue";
  due_date?: string | null;
  is_demo: boolean;
  created_at?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Check backend and database connectivity health
 */
export async function fetchHealthStatus(): Promise<HealthCheckResponse> {
  const response = await apiClient.get<HealthCheckResponse>("/api/health/");
  return response.data;
}

/**
 * List all facilities from backend
 */
export async function fetchFacilities(): Promise<Facility[]> {
  const response = await apiClient.get<PaginatedResponse<Facility> | Facility[]>(
    "/api/facilities/",
  );
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
}

/**
 * Create a new facility
 */
export async function createFacility(data: Partial<Facility>): Promise<Facility> {
  const response = await apiClient.post<Facility>("/api/facilities/", data);
  return response.data;
}

/**
 * Fetch energy readings with optional filtering and pagination
 */
export async function fetchEnergyReadings(params?: {
  page?: number;
  page_size?: number;
  facility?: number;
  source?: number;
  source_type?: string;
  start_date?: string;
  end_date?: string;
  is_demo?: boolean;
}): Promise<PaginatedResponse<EnergyReading>> {
  const response = await apiClient.get<PaginatedResponse<EnergyReading>>("/api/energy-readings/", {
    params,
  });
  return response.data;
}

/**
 * Submit an energy reading to backend
 */
export async function createEnergyReading(data: {
  facility: number;
  energy_source: number;
  reading_value: number;
  unit?: string;
  demand_kw?: number;
  timestamp?: string;
  is_demo?: boolean;
}): Promise<EnergyReading> {
  const response = await apiClient.post<EnergyReading>("/api/energy-readings/", data);
  return response.data;
}

/**
 * Fetch aggregated energy consumption and generation summary
 */
export async function fetchEnergySummary(params?: {
  period?: "daily" | "weekly" | "monthly" | "all";
  facility?: number;
  tariff?: number;
  is_demo?: boolean;
}): Promise<EnergySummary> {
  const response = await apiClient.get<EnergySummary>("/api/energy-summary/", {
    params,
  });
  return response.data;
}

/**
 * List utility bills with optional status/facility filters
 */
export async function fetchUtilityBills(params?: {
  status?: "pending" | "paid" | "overdue";
  facility?: number;
  page?: number;
}): Promise<PaginatedResponse<UtilityBill>> {
  const response = await apiClient.get<PaginatedResponse<UtilityBill>>("/api/utility-bills/", {
    params,
  });
  return response.data;
}

/**
 * Add a new utility bill
 */
export async function createUtilityBill(data: Partial<UtilityBill>): Promise<UtilityBill> {
  const response = await apiClient.post<UtilityBill>("/api/utility-bills/", data);
  return response.data;
}
