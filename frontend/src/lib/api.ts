// FastAPI client for MarketStats backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ── API Response types (matching backend Pydantic schemas) ──

export interface GeoOption {
  value: string;
  label: string;
  count?: number | null;
}

export interface StatesResponse {
  states: GeoOption[];
}

export interface CountiesResponse {
  state: string;
  counties: GeoOption[];
}

export interface CitiesResponse {
  state: string;
  cities: GeoOption[];
}

export interface ZipsResponse {
  state: string;
  zips: GeoOption[];
}

export interface MetricDataPointAPI {
  date: string; // YYYY-MM
  value: number | null;
  count?: number | null;
}

export interface MetricSeriesAPI {
  name: string;
  data: MetricDataPointAPI[];
  color?: string | null;
}

export interface MetricResponseAPI {
  metric: string;
  stat_type: string;
  series: MetricSeriesAPI[];
  y_axis_label: string;
  y_axis_format: string;
}

export interface QuickFactAPI {
  area_name: string;
  latest_value: number | null;
  previous_value: number | null;
  yoy_change: number | null;
  period: string | null;
}

export interface QuickFactsResponseAPI {
  metric: string;
  facts: QuickFactAPI[];
}

export interface ListingSummaryAPI {
  id: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  list_price?: number | null;
  close_price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  on_market_date?: string | null;
  photo_url?: string | null;
}

export interface ListingsResponseAPI {
  listings: ListingSummaryAPI[];
  total: number;
  page: number;
  page_size: number;
}

// ── API methods ──

export const api = {
  // Health check
  health: () => apiFetch<{ status: string }>("/api/health"),

  // Geographies
  getStates: () => apiFetch<StatesResponse>("/api/geographies/states"),
  getCounties: (state: string) =>
    apiFetch<CountiesResponse>("/api/geographies/counties", { params: { state } }),
  getCities: (state: string) =>
    apiFetch<CitiesResponse>("/api/geographies/cities", { params: { state } }),
  getZips: (state: string) =>
    apiFetch<ZipsResponse>("/api/geographies/zips", { params: { state } }),

  // Metrics
  getMetrics: (params: {
    state: string;
    metric: string;
    geo_type?: string;
    geo_values?: string;
    years?: number;
    stat_type?: string;
  }) => apiFetch<MetricResponseAPI>("/api/metrics/", { params }),

  getQuickFacts: (params: {
    state: string;
    metric: string;
    geo_type?: string;
    geo_values?: string;
    stat_type?: string;
  }) => apiFetch<QuickFactsResponseAPI>("/api/metrics/quick-facts", { params }),

  // Listings
  getListings: (params: {
    state: string;
    geo_type?: string;
    geo_values?: string;
    status?: string;
    min_price?: number;
    max_price?: number;
    property_type?: string;
    bedrooms?: number;
    page?: number;
    page_size?: number;
  }) => apiFetch<ListingsResponseAPI>("/api/listings/", { params }),

  // Report
  getReport: (city: string, state: string) =>
    apiFetch("/api/report/", { params: { city, state } }),

  getFeaturedCities: () => apiFetch("/api/report/featured-cities"),

  // Export
  exportCSV: (data: unknown) =>
    apiFetch("/api/export/csv", { method: "POST", body: JSON.stringify(data) }),
};
