"use client";

import useSWR from "swr";
import {
  api,
  type StatesResponse,
  type CountiesResponse,
  type CitiesResponse,
  type ZipsResponse,
  type MetricResponseAPI,
  type QuickFactsResponseAPI,
  type ListingsResponseAPI,
} from "./api";
import {
  getMockStates,
  getMockCounties,
  getMockCities,
  getMockZips,
  generateMockMetricData,
  generateMockQuickFacts,
} from "./mock-data";
import type { MetricDataPoint, QuickFactData } from "./types";
import type { MetricKey } from "./constants";

// ── SWR config ──
const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 30_000, // 30s dedup
  errorRetryCount: 2,
};

// ── Geography hooks ──

export function useStates() {
  return useSWR<StatesResponse>(
    "geographies/states",
    () => api.getStates(),
    {
      ...SWR_OPTIONS,
      fallbackData: {
        states: getMockStates().map((s) => ({ value: s, label: s })),
      },
    }
  );
}

export function useCounties(state: string | undefined) {
  return useSWR<CountiesResponse>(
    state ? `geographies/counties/${state}` : null,
    () => api.getCounties(state!),
    {
      ...SWR_OPTIONS,
      fallbackData: state
        ? {
            state,
            counties: getMockCounties(state).map((c) => ({
              value: c,
              label: c,
            })),
          }
        : undefined,
    }
  );
}

export function useCities(state: string | undefined) {
  return useSWR<CitiesResponse>(
    state ? `geographies/cities/${state}` : null,
    () => api.getCities(state!),
    {
      ...SWR_OPTIONS,
      fallbackData: state
        ? {
            state,
            cities: getMockCities(state).map((c) => ({
              value: c,
              label: c,
            })),
          }
        : undefined,
    }
  );
}

export function useZips(state: string | undefined) {
  return useSWR<ZipsResponse>(
    state ? `geographies/zips/${state}` : null,
    () => api.getZips(state!),
    {
      ...SWR_OPTIONS,
      fallbackData: state
        ? {
            state,
            zips: getMockZips(state).map((z) => ({ value: z, label: z })),
          }
        : undefined,
    }
  );
}

// ── Geo type -> backend geo_type mapping ──
const GEO_TYPE_MAP: Record<string, string> = {
  county: "County",
  city: "City",
  zip: "PostalCode",
};

// ── Metrics hook ──

interface UseMetricsParams {
  state: string;
  metric: MetricKey;
  geoType: string;
  geoValues: string[];
  years: number;
  statType: string;
}

/**
 * Converts API MetricResponseAPI to the flat MetricDataPoint[] format
 * the chart component expects.
 */
function apiMetricToChartData(
  resp: MetricResponseAPI,
  areaId: string
): MetricDataPoint[] {
  const points: MetricDataPoint[] = [];
  for (const series of resp.series) {
    for (const pt of series.data) {
      if (pt.value !== null) {
        points.push({
          // Chart expects YYYY-MM-DD, API sends YYYY-MM
          month: pt.date + "-01",
          value: pt.value,
          areaName: series.name,
          areaId,
        });
      }
    }
  }
  return points;
}

/**
 * Hook for a single area's metric data.
 * Returns data in the same MetricDataPoint[] shape the chart expects.
 */
export function useMetrics(areas: UseMetricsParams[]) {
  // Build a composite SWR key from all area params
  const validAreas = areas.filter(
    (a) => a.state && a.geoValues.length > 0
  );

  const key =
    validAreas.length > 0
      ? `metrics/${validAreas
          .map(
            (a) =>
              `${a.state}/${a.metric}/${a.geoType}/${a.geoValues.join(",")}/${a.years}/${a.statType}`
          )
          .join("|")}`
      : null;

  const { data, error, isLoading } = useSWR<MetricDataPoint[]>(
    key,
    async () => {
      // Fetch all areas in parallel, each as a separate API call
      const results = await Promise.all(
        validAreas.map(async (area) => {
          try {
            const resp = await api.getMetrics({
              state: area.state,
              metric: area.metric,
              geo_type: GEO_TYPE_MAP[area.geoType] || area.geoType,
              geo_values: area.geoValues.join(","),
              years: area.years,
              stat_type:
                area.statType === "median" ? "Median" : "Average",
            });
            // Use the first geoValue as area ID for consistency
            return apiMetricToChartData(
              resp,
              `${area.state}-${area.geoType}-${area.geoValues.join(",")}`
            );
          } catch {
            // Fall back to mock for this area on error
            return generateMockMetricData(
              area.metric,
              [area.geoValues.join(", ")],
              [
                `${area.state}-${area.geoType}-${area.geoValues.join(",")}`,
              ],
              area.years * 12
            );
          }
        })
      );
      return results.flat();
    },
    {
      ...SWR_OPTIONS,
      dedupingInterval: 10_000,
    }
  );

  return {
    data: data ?? [],
    error,
    isLoading,
  };
}

// ── Quick Facts hook ──

interface UseQuickFactsParams {
  state: string;
  metric: MetricKey;
  geoType: string;
  geoValues: string[];
  statType: string;
}

function apiQuickFactsToLocal(
  resp: QuickFactsResponseAPI,
  areaId: string
): QuickFactData[] {
  return resp.facts.map((f) => ({
    areaName: f.area_name,
    areaId,
    latestValue: f.latest_value ?? 0,
    yoyChange: f.yoy_change,
    latestMonth: f.period ?? "",
  }));
}

export function useQuickFacts(areas: UseQuickFactsParams[]) {
  const validAreas = areas.filter(
    (a) => a.state && a.geoValues.length > 0
  );

  const key =
    validAreas.length > 0
      ? `quick-facts/${validAreas
          .map(
            (a) =>
              `${a.state}/${a.metric}/${a.geoType}/${a.geoValues.join(",")}/${a.statType}`
          )
          .join("|")}`
      : null;

  const { data, error, isLoading } = useSWR<QuickFactData[]>(
    key,
    async () => {
      const results = await Promise.all(
        validAreas.map(async (area) => {
          try {
            const resp = await api.getQuickFacts({
              state: area.state,
              metric: area.metric,
              geo_type: GEO_TYPE_MAP[area.geoType] || area.geoType,
              geo_values: area.geoValues.join(","),
              stat_type:
                area.statType === "median" ? "Median" : "Average",
            });
            return apiQuickFactsToLocal(
              resp,
              `${area.state}-${area.geoType}-${area.geoValues.join(",")}`
            );
          } catch {
            // Return empty on error — mock fallback can be added
            return [] as QuickFactData[];
          }
        })
      );
      return results.flat();
    },
    {
      ...SWR_OPTIONS,
      dedupingInterval: 10_000,
    }
  );

  return {
    data: data ?? [],
    error,
    isLoading,
  };
}

// ── Listings hook ──

interface UseListingsParams {
  state: string;
  geoType: string;
  geoValues: string[];
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: number;
  page?: number;
  pageSize?: number;
}

export function useListings(params: UseListingsParams | null) {
  const key =
    params && params.state && params.geoValues.length > 0
      ? `listings/${params.state}/${params.geoType}/${params.geoValues.join(",")}/${params.page ?? 1}`
      : null;

  return useSWR<ListingsResponseAPI>(
    key,
    () => {
      if (!params) throw new Error("No params");
      return api.getListings({
        state: params.state,
        geo_type: GEO_TYPE_MAP[params.geoType] || params.geoType,
        geo_values: params.geoValues.join(","),
        status: params.status,
        min_price: params.minPrice,
        max_price: params.maxPrice,
        property_type: params.propertyType,
        bedrooms: params.bedrooms,
        page: params.page ?? 1,
        page_size: params.pageSize ?? 50,
      });
    },
    SWR_OPTIONS
  );
}
