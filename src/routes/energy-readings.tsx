import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useTransition, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Edit3,
  Eye,
  Filter,
  Gauge,
  Info,
  Leaf,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/greengrid/shell";
import {
  Button,
  Card,
  MetricCard,
  PageHeader,
  inputClass,
  labelClass,
} from "@/components/greengrid/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchFacilities,
  fetchEnergySources,
  fetchEnergyReadings,
  createEnergyReading,
  updateEnergyReading,
  deleteEnergyReading,
  type Facility,
  type EnergySource,
  type EnergyReading,
  type CreateEnergyReadingPayload,
} from "@/lib/energy-api";

export const Route = createFileRoute("/energy-readings")({
  head: () => ({
    meta: [
      { title: "Energy Readings | GreenGrid" },
      {
        name: "description",
        content:
          "Record, monitor, inspect, and manage facility energy readings across campus buildings.",
      },
      { property: "og:title", content: "Energy Readings | GreenGrid" },
      {
        property: "og:description",
        content: "Time-series energy readings management and monitoring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnergyReadingsPage,
});

interface ReadingFormData {
  facility: string;
  energy_source: string;
  reading_type: "consumption" | "generation";
  reading_value: string;
  timestamp: string;
  demand_kw: string;
}

const initialFormData: ReadingFormData = {
  facility: "",
  energy_source: "",
  reading_type: "consumption",
  reading_value: "",
  timestamp: new Date().toISOString().slice(0, 16),
  demand_kw: "",
};

function EnergyReadingsPage() {
  const [readings, setReadings] = useState<EnergyReading[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sources, setSources] = useState<EnergySource[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters & Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [facilityFilter, setFacilityFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [demoFilter, setDemoFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isViewOpen, setIsViewOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Active records for Edit / View / Delete
  const [selectedReading, setSelectedReading] = useState<EnergyReading | null>(null);
  const [readingToDelete, setReadingToDelete] = useState<EnergyReading | null>(null);

  // Form State & Validation
  const [formData, setFormData] = useState<ReadingFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [, startTransition] = useTransition();

  // Load facilities and sources for selection dropdowns
  const loadLookups = useCallback(async () => {
    try {
      const [facList, srcList] = await Promise.all([fetchFacilities(), fetchEnergySources()]);
      setFacilities(facList);
      setSources(srcList);
    } catch {
      // Lookups fail silently or will show when interacting
    }
  }, []);

  // Load readings with active filters and pagination
  const loadReadings = useCallback(async () => {
    setIsLoading(true);
    try {
      const isDemoParam = demoFilter === "demo" ? true : demoFilter === "live" ? false : undefined;
      const dataSourceParam = demoFilter.startsWith("kaggle") ? demoFilter : undefined;
      const response = await fetchEnergyReadings({
        page,
        page_size: pageSize,
        facility: facilityFilter ? Number(facilityFilter) : undefined,
        source: sourceFilter ? Number(sourceFilter) : undefined,
        reading_type: typeFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        is_demo: isDemoParam,
        data_source: dataSourceParam,
        search: search.trim() || undefined,
      });

      setReadings(response.results);
      setTotalCount(response.count);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load energy readings. Ensure Django backend is running.";
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    facilityFilter,
    sourceFilter,
    typeFilter,
    demoFilter,
    startDate,
    endDate,
    search,
  ]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Quick search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setSearch(searchInput);
        setPage(1);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setFacilityFilter("");
    setSourceFilter("");
    setTypeFilter("");
    setDemoFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Helper numbers
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

  // Compute live overview stats from current result set
  const stats = useMemo(() => {
    let totalKwh = 0;
    let consumptionKwh = 0;
    let generationKwh = 0;
    let liveCount = 0;
    let demoCount = 0;

    for (const r of readings) {
      const val = Number(r.reading_value) || 0;
      totalKwh += val;
      if (r.reading_type === "generation" || r.is_renewable) {
        generationKwh += val;
      } else {
        consumptionKwh += val;
      }
      if (r.is_demo) {
        demoCount++;
      } else {
        liveCount++;
      }
    }

    return {
      totalKwh,
      consumptionKwh,
      generationKwh,
      liveCount,
      demoCount,
    };
  }, [readings]);

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.facility) {
      errors["facility"] = "Please select a facility.";
    }

    if (!formData.energy_source) {
      errors["energy_source"] = "Please select an energy source.";
    }

    if (!formData.reading_type) {
      errors["reading_type"] = "Please select a reading type.";
    }

    const valueNum = Number(formData.reading_value);
    if (!formData.reading_value || isNaN(valueNum)) {
      errors["reading_value"] = "Please enter a valid numeric energy amount.";
    } else if (valueNum <= 0) {
      errors["reading_value"] = "Energy reading value must be positive (greater than 0).";
    }

    if (!formData.timestamp) {
      errors["timestamp"] = "Please provide the reading date and time.";
    } else {
      const dateObj = new Date(formData.timestamp);
      if (isNaN(dateObj.getTime())) {
        errors["timestamp"] = "Please enter a valid date and time.";
      }
    }

    if (formData.demand_kw) {
      const demandNum = Number(formData.demand_kw);
      if (isNaN(demandNum) || demandNum < 0) {
        errors["demand_kw"] = "Demand must be a non-negative number.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      facility: facilities.length > 0 ? String(facilities[0].id) : "",
      energy_source: sources.length > 0 ? String(sources[0].id) : "",
      reading_type: sources.length > 0 && sources[0].is_renewable ? "generation" : "consumption",
      reading_value: "",
      timestamp: new Date().toISOString().slice(0, 16),
      demand_kw: "",
    });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (reading: EnergyReading) => {
    if (reading.is_demo) {
      toast.error(
        "Demo records are protected from editing to preserve sample integrity. Please create a new reading.",
      );
      return;
    }
    setSelectedReading(reading);
    setFormData({
      facility: String(reading.facility),
      energy_source: String(reading.energy_source),
      reading_type: reading.reading_type || (reading.is_renewable ? "generation" : "consumption"),
      reading_value: String(reading.reading_value),
      timestamp: new Date(reading.timestamp).toISOString().slice(0, 16),
      demand_kw:
        reading.demand_kw !== null && reading.demand_kw !== undefined
          ? String(reading.demand_kw)
          : "",
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open View Modal
  const handleOpenView = (reading: EnergyReading) => {
    setSelectedReading(reading);
    setIsViewOpen(true);
  };

  // Open Delete Confirmation
  const handleOpenDelete = (reading: EnergyReading) => {
    if (reading.is_demo) {
      toast.error(
        "Demo records are protected and cannot be deleted. You can create, edit, and delete real readings.",
      );
      return;
    }
    setReadingToDelete(reading);
    setIsDeleteOpen(true);
  };

  // Source selection helper in form: auto-adjust reading type if renewable
  const handleSourceChange = (sourceId: string) => {
    const src = sources.find((s) => String(s.id) === sourceId);
    setFormData((prev) => ({
      ...prev,
      energy_source: sourceId,
      reading_type: src?.is_renewable ? "generation" : "consumption",
    }));
  };

  // Submit Create Reading
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: CreateEnergyReadingPayload = {
        facility: Number(formData.facility),
        energy_source: Number(formData.energy_source),
        reading_type: formData.reading_type,
        reading_value: Number(formData.reading_value),
        unit: "kWh",
        demand_kw: formData.demand_kw ? Number(formData.demand_kw) : null,
        timestamp: new Date(formData.timestamp).toISOString(),
        is_demo: false,
      };

      await createEnergyReading(payload);
      toast.success("Energy reading recorded successfully!", {
        description: `${payload.reading_value} kWh (${payload.reading_type}) recorded for ${facilities.find((f) => f.id === payload.facility)?.name || "Facility"}.`,
      });

      setIsCreateOpen(false);
      loadReadings();
      // Notify other components (dashboard) to refresh live data
      window.dispatchEvent(new CustomEvent("energy-readings-updated"));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to record reading. Please check backend response.";
      toast.error("Submission failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Reading
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReading || !validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<CreateEnergyReadingPayload> = {
        facility: Number(formData.facility),
        energy_source: Number(formData.energy_source),
        reading_type: formData.reading_type,
        reading_value: Number(formData.reading_value),
        unit: "kWh",
        demand_kw: formData.demand_kw ? Number(formData.demand_kw) : null,
        timestamp: new Date(formData.timestamp).toISOString(),
      };

      await updateEnergyReading(selectedReading.id, payload);
      toast.success("Energy reading updated successfully!", {
        description: `Reading #${selectedReading.id} updated.`,
      });

      setIsEditOpen(false);
      setSelectedReading(null);
      loadReadings();
      // Notify other components (dashboard) to refresh live data
      window.dispatchEvent(new CustomEvent("energy-readings-updated"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update reading.";
      toast.error("Update failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Reading
  const handleConfirmDelete = async () => {
    if (!readingToDelete) return;
    try {
      await deleteEnergyReading(readingToDelete.id);
      toast.success("Energy reading deleted successfully!", {
        description: `Reading #${readingToDelete.id} was removed.`,
      });
      setIsDeleteOpen(false);
      setReadingToDelete(null);
      loadReadings();
      // Notify other components (dashboard) to refresh live data
      window.dispatchEvent(new CustomEvent("energy-readings-updated"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete reading.";
      toast.error("Delete failed", { description: msg });
    }
  };

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="FACILITY METERS & TELEMETRY"
        title="Energy Reading Management"
        description="Comprehensive CRUD management for time-series energy consumption and renewable generation readings. Directly connected to the Django REST Framework API and MySQL database."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={loadReadings}
              disabled={isLoading}
              title="Refresh readings from database"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Add Reading
            </Button>
          </div>
        }
      />

      {/* KPI Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Database Records"
          value={`${totalCount} readings`}
          detail={`Showing page ${page} of ${totalPages} (${readings.length} loaded)`}
          icon={Gauge}
        />
        <MetricCard
          label="Current Page Energy"
          value={`${nf.format(stats.totalKwh)} kWh`}
          detail={`Across ${readings.length} readings on this view`}
          icon={Zap}
          tone="blue"
        />
        <MetricCard
          label="Consumption Load"
          value={`${nf.format(stats.consumptionKwh)} kWh`}
          detail="Demand from utility grid and operations"
          icon={Activity}
          tone="amber"
        />
        <MetricCard
          label="Renewable Generation"
          value={`${nf.format(stats.generationKwh)} kWh`}
          detail="Solar PV, Wind & Hydropower generated"
          icon={Leaf}
          tone="green"
        />
      </div>

      {/* Backend API Error Banner */}
      {apiError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/8 p-4 text-xs text-danger">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Error communicating with API:</strong> {apiError}
            </span>
          </div>
          <Button variant="secondary" className="h-7 text-xs" onClick={loadReadings}>
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Filter & Search Telemetry
          </div>
          {(search ||
            facilityFilter ||
            sourceFilter ||
            typeFilter ||
            demoFilter ||
            startDate ||
            endDate) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Reset all filters
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {/* Search Input */}
          <div className="sm:col-span-2">
            <label className={labelClass}>Search keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search facility, source, code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {/* Facility Filter */}
          <div>
            <label className={labelClass}>Facility</label>
            <select
              value={facilityFilter}
              onChange={(e) => {
                setFacilityFilter(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.code ? `(${f.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Energy Source Filter */}
          <div>
            <label className={labelClass}>Energy Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">All Energy Sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.source_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Reading Type Filter */}
          <div>
            <label className={labelClass}>Reading Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">All Types</option>
              <option value="consumption">Consumption</option>
              <option value="generation">Generation</option>
            </select>
          </div>

          {/* Demo vs Live / Kaggle Filter */}
          <div>
            <label className={labelClass}>Data Origin</label>
            <select
              value={demoFilter}
              onChange={(e) => {
                setDemoFilter(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">All Data (Kaggle, Live & Demo)</option>
              <option value="kaggle">Kaggle Datasets (All 4 Sources)</option>
              <option value="kaggle:solar-generation">Kaggle: Solar PV (Generation)</option>
              <option value="kaggle:wind-turbine">Kaggle: Wind Turbine (SCADA)</option>
              <option value="kaggle:skillsbuild-hydro">Kaggle: Hydro (IBM SkillsBuild)</option>
              <option value="kaggle:household-power">Kaggle: Grid (Household Power)</option>
              <option value="demo">Synthetic Demo Data Only</option>
              <option value="live">Live Telemetry Only</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className={labelClass}>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className={labelClass}>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </div>
        </div>
      </Card>

      {/* Main Readings Table */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Time-Series Energy Records</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalCount > 0
                ? `Displaying ${readings.length} of ${totalCount} records matching active filters`
                : "No matching records found"}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 rounded-md border border-input bg-secondary px-2 text-xs text-foreground outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Table / Loading / Empty States */}
        {isLoading ? (
          <div className="divide-y divide-border p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-48 rounded bg-muted"></div>
                  <div className="h-3 w-32 rounded bg-muted/60"></div>
                </div>
                <div className="h-4 w-24 rounded bg-muted"></div>
                <div className="h-4 w-16 rounded bg-muted"></div>
                <div className="h-8 w-24 rounded bg-muted"></div>
              </div>
            ))}
          </div>
        ) : readings.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-3 text-base font-semibold text-foreground">
              No Energy Readings Found
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              {search ||
              facilityFilter ||
              sourceFilter ||
              typeFilter ||
              startDate ||
              endDate ||
              demoFilter
                ? "No readings matched your active filter criteria. Try clearing some filters or searching for another facility."
                : "No readings are present in the database yet. Click 'Add Reading' to record your first telemetry data point."}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {(search ||
                facilityFilter ||
                sourceFilter ||
                typeFilter ||
                startDate ||
                endDate ||
                demoFilter) && (
                <Button variant="secondary" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                </Button>
              )}
              <Button onClick={handleOpenCreate}>
                <Plus className="h-3.5 w-3.5" /> Add Energy Reading
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Facility</th>
                  <th className="px-4 py-3.5">Source</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Amount (kWh)</th>
                  <th className="px-4 py-3.5">Peak Demand</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Origin</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {readings.map((reading) => (
                  <tr key={reading.id} className="transition-colors hover:bg-secondary/40">
                    {/* Facility */}
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-foreground">
                        {reading.facility_name || `Facility #${reading.facility}`}
                      </p>
                      <p className="text-xs text-muted-foreground">ID: #{reading.id}</p>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {reading.is_renewable ? (
                          <Leaf className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 text-info shrink-0" />
                        )}
                        <span className="font-medium text-foreground">
                          {reading.source_name || `Source #${reading.energy_source}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground capitalize">
                        {reading.source_type}
                      </span>
                    </td>

                    {/* Reading Type */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          reading.reading_type === "generation"
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : "bg-info/15 text-info border border-info/20"
                        }`}
                      >
                        {reading.reading_type ||
                          (reading.is_renewable ? "generation" : "consumption")}
                      </span>
                    </td>

                    {/* Amount kWh */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-foreground">
                        {nf.format(reading.reading_value)}
                      </span>{" "}
                      <span className="text-xs text-muted-foreground">{reading.unit}</span>
                    </td>

                    {/* Demand kW */}
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {reading.demand_kw !== null && reading.demand_kw !== undefined
                        ? `${Number(reading.demand_kw).toFixed(2)} kW`
                        : "—"}
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        {formatDate(reading.timestamp)}
                      </div>
                    </td>

                    {/* Origin Badge */}
                    <td className="px-4 py-3.5">
                      {reading.is_demo ? (
                        <span
                          title="Synthetic demo dataset (protected from modification)"
                          className="inline-flex items-center gap-1 rounded-md bg-warning/15 border border-warning/25 px-2 py-0.5 text-[11px] font-semibold text-warning"
                        >
                          Demo
                        </span>
                      ) : reading.data_source?.startsWith("kaggle:") ? (
                        <span
                          title={`Kaggle dataset: ${reading.data_source}`}
                          className="inline-flex items-center gap-1 rounded-md bg-accent border border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary"
                        >
                          <Database className="h-3 w-3 shrink-0" />
                          {reading.data_source === "kaggle:wind-turbine"
                            ? "Kaggle: Wind"
                            : reading.data_source === "kaggle:skillsbuild-hydro"
                            ? "Kaggle: Hydro"
                            : reading.data_source === "kaggle:solar-generation"
                            ? "Kaggle: Solar"
                            : reading.data_source === "kaggle:household-power" || reading.data_source === "kaggle:aep-hourly"
                            ? "Kaggle: Grid"
                            : "Kaggle"}
                        </span>
                      ) : (
                        <span
                          title="Live reading logged by operator"
                          className="inline-flex items-center gap-1 rounded-md bg-primary/15 border border-primary/25 px-2 py-0.5 text-[11px] font-semibold text-primary"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Live
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenView(reading)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                          title="View Reading Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(reading)}
                          disabled={reading.is_demo}
                          className={`rounded p-1.5 transition-colors ${
                            reading.is_demo
                              ? "text-muted-foreground/30 cursor-not-allowed"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                          }`}
                          title={
                            reading.is_demo
                              ? "Demo records cannot be edited (Protected)"
                              : "Edit Reading"
                          }
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleOpenDelete(reading)}
                          disabled={reading.is_demo}
                          className={`rounded p-1.5 transition-colors ${
                            reading.is_demo
                              ? "text-muted-foreground/30 cursor-not-allowed"
                              : "text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer"
                          }`}
                          title={
                            reading.is_demo
                              ? "Demo records cannot be deleted (Protected)"
                              : "Delete Reading"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
            <div>
              Showing{" "}
              <strong>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}
              </strong>{" "}
              of <strong>{totalCount}</strong> readings
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                className="h-8 px-2.5 text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>

              <div className="px-2 font-medium text-foreground">
                Page {page} of {totalPages}
              </div>

              <Button
                variant="secondary"
                className="h-8 px-2.5 text-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* -------------------- CREATE READING DIALOG -------------------- */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Energy Reading
            </DialogTitle>
            <DialogDescription>
              Record a new time-series energy consumption or generation measurement. Data will be
              validated and saved to MySQL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Facility Field */}
            <div>
              <label className={labelClass}>
                Facility <span className="text-danger">*</span>
              </label>
              <select
                value={formData.facility}
                onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                className={inputClass}
              >
                <option value="">-- Select Monitored Facility --</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.location ? `· ${f.location}` : ""} {f.code ? `[${f.code}]` : ""}
                  </option>
                ))}
              </select>
              {formErrors["facility"] && (
                <p className="mt-1 text-xs text-danger">{formErrors["facility"]}</p>
              )}
            </div>

            {/* Energy Source Field */}
            <div>
              <label className={labelClass}>
                Energy Source <span className="text-danger">*</span>
              </label>
              <select
                value={formData.energy_source}
                onChange={(e) => handleSourceChange(e.target.value)}
                className={inputClass}
              >
                <option value="">-- Select Energy Source --</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.source_type.toUpperCase()} ·{" "}
                    {s.is_renewable ? "Renewable" : "Non-renewable"})
                  </option>
                ))}
              </select>
              {formErrors["energy_source"] && (
                <p className="mt-1 text-xs text-danger">{formErrors["energy_source"]}</p>
              )}
            </div>

            {/* Reading Type Field */}
            <div>
              <label className={labelClass}>
                Reading Type <span className="text-danger">*</span>
              </label>
              <select
                value={formData.reading_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reading_type: e.target.value as "consumption" | "generation",
                  })
                }
                className={inputClass}
              >
                <option value="consumption">Consumption (Load pulled from grid / consumed)</option>
                <option value="generation">Generation (Solar, wind, hydro generated)</option>
              </select>
              {formErrors["reading_type"] && (
                <p className="mt-1 text-xs text-danger">{formErrors["reading_type"]}</p>
              )}
            </div>

            {/* Reading Value (kWh) & Instantaneous Demand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Energy Amount (kWh) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="e.g. 150.250"
                  value={formData.reading_value}
                  onChange={(e) => setFormData({ ...formData, reading_value: e.target.value })}
                  className={inputClass}
                />
                {formErrors["reading_value"] && (
                  <p className="mt-1 text-xs text-danger">{formErrors["reading_value"]}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Peak Demand in kW (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 37.50"
                  value={formData.demand_kw}
                  onChange={(e) => setFormData({ ...formData, demand_kw: e.target.value })}
                  className={inputClass}
                />
                {formErrors["demand_kw"] && (
                  <p className="mt-1 text-xs text-danger">{formErrors["demand_kw"]}</p>
                )}
              </div>
            </div>

            {/* Reading Timestamp */}
            <div>
              <label className={labelClass}>
                Reading Date & Time <span className="text-danger">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                className={inputClass}
              />
              {formErrors["timestamp"] && (
                <p className="mt-1 text-xs text-danger">{formErrors["timestamp"]}</p>
              )}
            </div>

            <DialogFooter className="mt-6 flex flex-row justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Save Reading
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------- EDIT READING DIALOG -------------------- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit Energy Reading #{selectedReading?.id}
            </DialogTitle>
            <DialogDescription>
              Modify recorded reading values. Changes will take effect immediately and update
              dashboard metrics.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Facility Field */}
            <div>
              <label className={labelClass}>Facility</label>
              <select
                value={formData.facility}
                onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                className={inputClass}
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.location ? `· ${f.location}` : ""}
                  </option>
                ))}
              </select>
              {formErrors["facility"] && (
                <p className="mt-1 text-xs text-danger">{formErrors["facility"]}</p>
              )}
            </div>

            {/* Energy Source Field */}
            <div>
              <label className={labelClass}>Energy Source</label>
              <select
                value={formData.energy_source}
                onChange={(e) => handleSourceChange(e.target.value)}
                className={inputClass}
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.source_type.toUpperCase()})
                  </option>
                ))}
              </select>
              {formErrors["energy_source"] && (
                <p className="mt-1 text-xs text-danger">{formErrors["energy_source"]}</p>
              )}
            </div>

            {/* Reading Type Field */}
            <div>
              <label className={labelClass}>Reading Type</label>
              <select
                value={formData.reading_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reading_type: e.target.value as "consumption" | "generation",
                  })
                }
                className={inputClass}
              >
                <option value="consumption">Consumption</option>
                <option value="generation">Generation</option>
              </select>
              {formErrors["reading_type"] && (
                <p className="mt-1 text-xs text-danger">{formErrors["reading_type"]}</p>
              )}
            </div>

            {/* Reading Value (kWh) & Instantaneous Demand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Energy Amount (kWh)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={formData.reading_value}
                  onChange={(e) => setFormData({ ...formData, reading_value: e.target.value })}
                  className={inputClass}
                />
                {formErrors["reading_value"] && (
                  <p className="mt-1 text-xs text-danger">{formErrors["reading_value"]}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Peak Demand (kW)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.demand_kw}
                  onChange={(e) => setFormData({ ...formData, demand_kw: e.target.value })}
                  className={inputClass}
                />
                {formErrors["demand_kw"] && (
                  <p className="mt-1 text-xs text-danger">{formErrors["demand_kw"]}</p>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <label className={labelClass}>Reading Date & Time</label>
              <input
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                className={inputClass}
              />
              {formErrors["timestamp"] && (
                <p className="mt-1 text-xs text-danger">{formErrors["timestamp"]}</p>
              )}
            </div>

            <DialogFooter className="mt-6 flex flex-row justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Updating...
                  </>
                ) : (
                  <>Update Reading</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------- VIEW READING DETAILS DIALOG -------------------- */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Reading Telemetry Details #{selectedReading?.id}
            </DialogTitle>
            <DialogDescription>
              Complete telemetry parameters stored in the database for this record.
            </DialogDescription>
          </DialogHeader>

          {selectedReading && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2.5">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Facility</span>
                  <span className="font-semibold text-foreground">
                    {selectedReading.facility_name || `Facility #${selectedReading.facility}`}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Energy Source</span>
                  <span className="font-semibold text-foreground">
                    {selectedReading.source_name || `Source #${selectedReading.energy_source}`} (
                    {selectedReading.source_type?.toUpperCase()})
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Reading Type</span>
                  <span className="font-semibold capitalize text-primary">
                    {selectedReading.reading_type}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Energy Quantity</span>
                  <span className="font-bold text-foreground text-sm">
                    {nf.format(selectedReading.reading_value)} {selectedReading.unit}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Instantaneous Peak Demand</span>
                  <span className="font-semibold text-foreground">
                    {selectedReading.demand_kw !== null && selectedReading.demand_kw !== undefined
                      ? `${Number(selectedReading.demand_kw).toFixed(2)} kW`
                      : "Not recorded"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Recorded Timestamp</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(selectedReading.timestamp)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Renewable Source</span>
                  <span className="font-semibold text-foreground">
                    {selectedReading.is_renewable
                      ? "Yes (Zero direct emissions)"
                      : "No (Grid supply)"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Origin</span>
                  <span className="font-semibold text-foreground">
                    {selectedReading.is_demo
                      ? "Synthetic Demo Data (Protected)"
                      : "Live User Entry"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created in System</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(selectedReading.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-row justify-end gap-2">
            {selectedReading && !selectedReading.is_demo && (
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewOpen(false);
                  handleOpenEdit(selectedReading);
                }}
              >
                <Edit3 className="h-4 w-4" /> Edit
              </Button>
            )}
            <Button variant="ghost" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------- DELETE CONFIRMATION DIALOG -------------------- */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-5 w-5" />
              Delete Energy Reading?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs leading-5">
              <span>
                Are you sure you want to delete reading <strong>#{readingToDelete?.id}</strong> (
                <strong>{readingToDelete?.reading_value} kWh</strong> from{" "}
                <strong>{readingToDelete?.facility_name || "Facility"}</strong>)?
              </span>
              <span className="block text-danger font-medium">
                This action is irreversible and will permanently remove this telemetry entry from
                the MySQL database.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-danger text-destructive-foreground hover:bg-danger/90 cursor-pointer"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
