// Dashboard type definitions

import type { MetricKey } from "./constants";

export type GeoType = "county" | "city" | "zip";
export type ChartType = "line" | "bar";
export type StatType = "median" | "average";
export type YearRange = 1 | 3 | 5 | 10 | 20;
export type RollingWindow = 1 | 3 | 6 | 12;

export interface AreaConfig {
  id: string;
  state: string;
  geoType: GeoType;
  geoValues: string[];
  name: string;
}

export interface FilterState {
  propertyTypes: string[];
  priceRange: { min: number; max: number } | null;
  construction: "all" | "new" | "existing";
  bedrooms: string;
  sqftRange: { min: number; max: number } | null;
  yearBuiltRange: { min: number; max: number } | null;
}

export type BreakoutField =
  | "propertyType"
  | "priceRange"
  | "bedrooms"
  | "sqft"
  | "yearBuilt"
  | null;

export interface MetricDataPoint {
  month: string; // ISO date string YYYY-MM-DD
  value: number;
  areaName: string;
  areaId: string;
}

export interface QuickFactData {
  areaName: string;
  areaId: string;
  latestValue: number;
  yoyChange: number | null;
  latestMonth: string;
}

export interface MetricApiResponse {
  metric: string;
  data: MetricDataPoint[];
}

export interface DashboardState {
  // Metric
  selectedMetric: MetricKey;
  setSelectedMetric: (metric: MetricKey) => void;

  // Areas
  areas: AreaConfig[];
  addArea: () => void;
  removeArea: (id: string) => void;
  updateArea: (id: string, patch: Partial<AreaConfig>) => void;

  // Chart
  chartType: ChartType;
  setChartType: (type: ChartType) => void;

  // Time range
  years: YearRange;
  setYears: (years: YearRange) => void;

  // Rolling average
  rolling: RollingWindow;
  setRolling: (rolling: RollingWindow) => void;

  // Stat type
  statType: StatType;
  setStatType: (type: StatType) => void;

  // Breakout
  breakoutField: BreakoutField;
  setBreakoutField: (field: BreakoutField) => void;

  // Filters
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  // Legend visibility
  legendVisible: boolean;
  toggleLegend: () => void;

  // Map visibility
  mapVisible: boolean;
  toggleMap: () => void;
}
