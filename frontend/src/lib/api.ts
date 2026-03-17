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

// ── API methods ──

export const api = {
  // Health check
  health: () => apiFetch<{ status: string }>("/api/health"),

  // Geographies
  getStates: () => apiFetch<{ states: string[] }>("/api/geographies/states"),
  getCounties: (state: string) =>
    apiFetch<{ counties: string[] }>("/api/geographies/counties", { params: { state } }),
  getCities: (state: string) =>
    apiFetch<{ cities: Array<{ value: string; label: string; count: number }> }>(
      "/api/geographies/cities",
      { params: { state } }
    ),
  getZips: (state: string) =>
    apiFetch<{ zips: string[] }>("/api/geographies/zips", { params: { state } }),

  // Metrics
  getMetrics: (params: {
    state: string;
    metric: string;
    geo_type?: string;
    geo_values?: string;
    years?: number;
    rolling?: number;
    stat_type?: string;
  }) => apiFetch("/api/metrics/", { params }),

  getQuickFacts: (params: {
    state: string;
    metric: string;
    geo_type?: string;
    geo_values?: string;
  }) => apiFetch("/api/metrics/quick-facts", { params }),

  // Listings
  getListings: (params: {
    state: string;
    geo_type?: string;
    geo_values?: string;
    status?: string;
    min_price?: number;
    max_price?: number;
    property_type?: string;
    page?: number;
    page_size?: number;
  }) => apiFetch("/api/listings/", { params }),

  // Report
  getReport: (city: string, state: string) =>
    apiFetch("/api/report/", { params: { city, state } }),

  getFeaturedCities: () => apiFetch("/api/report/featured-cities"),

  // Export
  exportCSV: (data: unknown) =>
    apiFetch("/api/export/csv", { method: "POST", body: JSON.stringify(data) }),
};
