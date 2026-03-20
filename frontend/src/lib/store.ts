// Zustand store for dashboard state

import { create } from "zustand";
import type {
  DashboardState,
  FilterState,
  AreaConfig,
  BreakoutField,
  ChartType,
  StatType,
  YearRange,
  RollingWindow,
  DrawnShape,
  CustomRanges,
} from "./types";
import type { MetricKey } from "./constants";

const DEFAULT_FILTERS: FilterState = {
  propertyTypes: ["Residential"],
  priceRange: null,
  construction: "all",
  bedrooms: "all",
  bathrooms: "all",
  sqftRange: null,
  yearBuiltRange: null,
};

let areaCounter = 0;
function createAreaId(): string {
  areaCounter += 1;
  return `area_${areaCounter}`;
}

const DEFAULT_AREA: AreaConfig = {
  id: "area_1",
  state: "",
  geoType: "county",
  geoValues: [],
  name: "Area 1",
};

export const useDashboardStore = create<DashboardState>((set) => ({
  // Metric
  selectedMetric: "MedianSalesPrice" as MetricKey,
  setSelectedMetric: (metric: MetricKey) => set({ selectedMetric: metric }),

  // Areas
  areas: [{ ...DEFAULT_AREA }],
  addArea: () =>
    set((state) => {
      if (state.areas.length >= 4) return state;
      const idx = state.areas.length + 1;
      return {
        areas: [
          ...state.areas,
          {
            id: createAreaId(),
            state: "",
            geoType: "county",
            geoValues: [],
            name: `Area ${idx}`,
          },
        ],
      };
    }),
  removeArea: (id: string) =>
    set((state) => {
      if (state.areas.length <= 1) return state;
      return { areas: state.areas.filter((a) => a.id !== id) };
    }),
  updateArea: (id: string, patch: Partial<AreaConfig>) =>
    set((state) => ({
      areas: state.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  // Chart
  chartType: "line" as ChartType,
  setChartType: (type: ChartType) => set({ chartType: type }),

  // Time range
  years: 3 as YearRange,
  setYears: (years: YearRange) => set({ years }),

  // Rolling average
  rolling: 1 as RollingWindow,
  setRolling: (rolling: RollingWindow) => set({ rolling }),

  // Stat type
  statType: "median" as StatType,
  setStatType: (type: StatType) => set({ statType: type }),

  // Per-metric stat type overrides (for metrics with M/A toggle)
  perMetricStatType: {} as Record<string, StatType>,
  setPerMetricStatType: (metric: string, type: StatType) =>
    set((state) => ({
      perMetricStatType: { ...state.perMetricStatType, [metric]: type },
    })),

  // Breakout
  breakoutField: null as BreakoutField,
  setBreakoutField: (field: BreakoutField) =>
    set((state) => ({
      breakoutField: state.breakoutField === field ? null : field,
    })),

  // Filters
  filters: { ...DEFAULT_FILTERS },
  setFilters: (patch: Partial<FilterState>) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  // Legend
  legendVisible: true,
  toggleLegend: () =>
    set((state) => ({ legendVisible: !state.legendVisible })),

  // Map
  mapVisible: false,
  toggleMap: () =>
    set((state) => ({ mapVisible: !state.mapVisible })),

  // Draw mode
  drawMode: false,
  toggleDrawMode: () =>
    set((state) => ({ drawMode: !state.drawMode })),

  // Drawn shapes
  drawnShapes: [],
  addDrawnShape: (shape: DrawnShape) =>
    set((state) => ({ drawnShapes: [...state.drawnShapes, shape] })),
  removeDrawnShape: (id: string) =>
    set((state) => ({
      drawnShapes: state.drawnShapes.filter((s) => s.id !== id),
    })),
  clearDrawnShapes: () => set({ drawnShapes: [] }),

  // Save drawn shape as custom area
  saveDrawnShapeAsArea: (shape: DrawnShape, name: string) =>
    set((state) => {
      if (state.areas.length >= 4) return state;
      const idx = state.areas.length + 1;
      const newArea: AreaConfig = {
        id: createAreaId(),
        state: "",
        geoType: "custom",
        geoValues: [],
        name: name || `Custom Area ${idx}`,
        drawnShape: shape,
      };
      return {
        areas: [...state.areas, newArea],
        drawnShapes: state.drawnShapes.filter((s) => s.id !== shape.id),
        savedCustomAreas: [
          ...state.savedCustomAreas,
          { name: name || `Custom Area ${idx}`, shape },
        ],
      };
    }),

  // Saved custom areas
  savedCustomAreas: [],
  removeSavedCustomArea: (shapeId: string) =>
    set((state) => ({
      savedCustomAreas: state.savedCustomAreas.filter(
        (a) => a.shape.id !== shapeId
      ),
      areas: state.areas.filter((a) => a.drawnShape?.id !== shapeId),
    })),

  // Custom ranges
  customRanges: { price: [], sqft: [] },
  setCustomRanges: (patch: Partial<CustomRanges>) =>
    set((state) => ({
      customRanges: { ...state.customRanges, ...patch },
    })),

  // Combine areas
  combineAreas: false,
  toggleCombineAreas: () =>
    set((state) => ({ combineAreas: !state.combineAreas })),

  // Filters visibility
  filtersVisible: true,
  toggleFiltersVisible: () =>
    set((state) => ({ filtersVisible: !state.filtersVisible })),
}));
