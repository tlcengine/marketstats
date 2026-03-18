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
  close_date?: string | null;
  days_on_market?: number | null;
  property_type?: string | null;
  photo_url?: string | null;
}

export interface ListingsResponseAPI {
  listings: ListingSummaryAPI[];
  total: number;
  page: number;
  page_size: number;
}

export interface ForecastPointAPI {
  date: string; // YYYY-MM
  value: number;
  count?: number;
}

export interface ForecastResponseAPI {
  state: string;
  geo_type: string;
  geo_values: string[];
  stat_type: string;
  historical: ForecastPointAPI[];
  forecast: ForecastPointAPI[];
  confidence_upper: ForecastPointAPI[];
  confidence_lower: ForecastPointAPI[];
  current_median: number | null;
  predicted_median: number | null;
  pct_change: number | null;
  total_transactions?: number;
}

export interface ListingDetailAPI {
  listing: Record<string, unknown>;
}

// ── Tax types ──

export interface TaxSummaryAPI {
  total_properties: number;
  median_net_value: number | null;
  median_tax: number | null;
  avg_tax: number | null;
  avg_net_value: number | null;
  total_land_value: number | null;
  total_improvement_value: number | null;
  effective_rate: number | null;
}

export interface PropertyClassCountAPI {
  property_class: string;
  label: string;
  count: number;
}

export interface TaxDistributionBucketAPI {
  bucket_min: number;
  bucket_max: number;
  count: number;
}

export interface CountyRateAPI {
  county: string;
  effective_rate: number;
  avg_tax: number;
  avg_net_value: number;
  count: number;
}

export interface TaxRecordAPI {
  property_location: string | null;
  city_state: string | null;
  county: string | null;
  net_value: number | null;
  calculated_tax: number | null;
  land_value: number | null;
  improvement_value: number | null;
  property_class: string | null;
  year_constructed: number | null;
  block: string | null;
  lot: string | null;
  zip_code: string | null;
  year_assessed: number | null;
  sale_price: number | null;
}

export interface TaxPredictionRequestAPI {
  county: string;
  municipality?: string;
  property_class?: string;
  current_value?: number;
  bedrooms?: number;
  sqft?: number;
  year_built?: number;
  lot_size?: number;
}

export interface ComparablePropertyAPI {
  address: string | null;
  city: string | null;
  net_value: number;
  calculated_tax: number;
  effective_rate: number;
  year_constructed: number | null;
}

export interface TaxPredictionAPI {
  predicted_tax: number;
  predicted_assessment: number;
  effective_rate: number;
  confidence: string;
  comparable_count: number;
  median_area_tax: number;
  median_area_value: number;
  comparables: ComparablePropertyAPI[];
  low_estimate: number;
  high_estimate: number;
}

// ── Report types ──

export interface ReportKPIAPI {
  label: string;
  value: string;
  change: string | null;
  direction: string | null; // "up", "down", "flat"
}

export interface RecentSaleAPI {
  address: string;
  close_price: number | null;
  list_price: number | null;
  close_date: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  dom: number | null;
}

export interface PriceDistributionBucketAPI {
  range: string;
  count: number;
}

export interface MonthlyDataAPI {
  month: string;
  sales: number;
  avg_price: number;
  median_price: number;
  total_volume: number;
  avg_dom: number;
}

export interface YearlyDataAPI {
  year: number;
  sales: number;
  avg_price: number;
  median_price: number;
  total_volume: number;
  avg_dom: number;
  max_price: number;
}

export interface NarrativeSectionsAPI {
  opening: string;
  supply: string;
  demand: string;
  segment_breakdown: string | null;
  pull_quote: string;
  recommendations: string;
  closing: string;
}

export interface ShareURLsAPI {
  title: string;
  text: string;
  url: string;
  linkedin: string;
  twitter: string;
  facebook: string;
  email: string;
}

export interface ReportResponseAPI {
  city: string;
  state: string;
  mls_label: string;
  data_through: string;
  report_month: string;
  report_date: string;
  headline: string;
  price_segment: string;
  fell_back: boolean;
  original_price_label: string | null;
  narrative: NarrativeSectionsAPI;
  kpis: ReportKPIAPI[];
  stats: {
    r_sales: number;
    p_sales: number;
    r_avg: number;
    r_med: number;
    r_dom: number;
    r_vol: number;
    r_max: number;
    active: number;
    pending: number;
    coming: number;
    sp_lp: number;
    mos: number;
    price_chg: number;
    sales_chg: number;
    dom_chg: number;
  };
  charts: {
    monthly: MonthlyDataAPI[];
    yearly: YearlyDataAPI[];
  };
  price_distribution: PriceDistributionBucketAPI[];
  recent_sales: RecentSaleAPI[];
  share: ShareURLsAPI;
  podcast_url: string;
  podcast_generate_text: string;
}

export interface FeaturedCitiesResponseAPI {
  cities: Array<{ city: string; state: string; desc?: string }>;
}

export interface CitiesListResponseAPI {
  cities: string[];
}

// ── Feeds types ──

export interface FeedStatusAPI {
  key: string;
  name: string;
  provider: string;
  method: string;
  state: string;
  status: string; // "active", "stale", "broken"
  enabled: boolean;
  doc_count: number | null;
  last_sync: string | null;
  disabled_reason: string | null;
}

export interface FeedsResponseAPI {
  feeds: FeedStatusAPI[];
  summary: {
    total_feeds: number;
    active_feeds: number;
    total_documents: number;
  };
}

// ── Branding types ──

export interface BrandingProfileAPI {
  agent_name: string;
  title: string;
  company_name: string;
  phone: string;
  email: string;
  website: string;
  headshot_data: string | null;
  headshot_mime: string | null;
  logo_data: string | null;
  logo_mime: string | null;
  updated_at: string | null;
}

// ── FastStats types ──

export interface FastStatsMetricAPI {
  metric: string;
  label: string;
  format: string;
  current_value: number | null;
  prior_value: number | null;
  yoy_change: number | null;
}

export interface FastStatsResponseAPI {
  area: string;
  month: number;
  year: number;
  state: string;
  metrics: FastStatsMetricAPI[];
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
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  }) => apiFetch<ListingsResponseAPI>("/api/listings/", { params }),

  // Single listing detail
  getListingDetail: (id: string, state: string) =>
    apiFetch<ListingDetailAPI>(`/api/listings/${id}`, { params: { state } }),

  // Forecast
  getForecast: (params: {
    state: string;
    geo_type?: string;
    geo_values?: string;
    years?: number;
    forecast_months?: number;
    stat_type?: string;
  }) => apiFetch<ForecastResponseAPI>("/api/forecast/", { params }),

  // Report
  getReport: (city: string, state: string, min_price?: number, price_label?: string) =>
    apiFetch<ReportResponseAPI>("/api/report/", {
      params: { city, state, min_price: min_price ?? 0, price_label: price_label ?? "All Prices" },
    }),

  getFeaturedCities: () =>
    apiFetch<FeaturedCitiesResponseAPI>("/api/report/featured-cities"),

  getReportCities: () =>
    apiFetch<CitiesListResponseAPI>("/api/report/cities"),

  // Feeds
  getFeeds: () => apiFetch<FeedsResponseAPI>("/api/feeds/"),

  triggerSync: (feedKey: string) =>
    apiFetch<{ status: string; message: string }>(`/api/feeds/${feedKey}/sync`, {
      method: "POST",
    }),

  // Branding
  getBranding: (userEmail?: string) =>
    apiFetch<BrandingProfileAPI>("/api/branding/", {
      params: { user_email: userEmail || "default" },
    }),

  saveBranding: (formData: FormData) =>
    fetch(`${API_BASE}/api/branding/`, {
      method: "POST",
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error(`API error: ${r.status}`);
      return r.json();
    }),

  // Tax
  getTaxCounties: () =>
    apiFetch<{ counties: string[] }>("/api/tax/counties"),
  getTaxMunicipalities: (county: string) =>
    apiFetch<{ county: string; municipalities: string[] }>("/api/tax/municipalities", {
      params: { county },
    }),
  getTaxSummary: (params: { county: string; municipality?: string }) =>
    apiFetch<TaxSummaryAPI>("/api/tax/summary", { params }),
  getTaxPropertyClasses: (params: { county: string; municipality?: string }) =>
    apiFetch<{ classes: PropertyClassCountAPI[] }>("/api/tax/property-classes", { params }),
  getTaxDistribution: (params: {
    county: string;
    municipality?: string;
    field?: string;
    buckets?: number;
  }) =>
    apiFetch<{ buckets: TaxDistributionBucketAPI[]; field: string }>(
      "/api/tax/distribution",
      { params }
    ),
  getTaxEffectiveRates: () =>
    apiFetch<{ rates: CountyRateAPI[] }>("/api/tax/effective-rates"),
  searchTaxProperty: (params: { query: string; county?: string; limit?: number }) =>
    apiFetch<{ results: TaxRecordAPI[]; total: number }>("/api/tax/search", { params }),
  predictTax: (body: TaxPredictionRequestAPI) =>
    apiFetch<TaxPredictionAPI>("/api/tax/predict", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // FastStats
  getFastStats: (params: {
    state: string;
    geo_type: string;
    geo_values: string;
    month?: number;
    year?: number;
    stat_type?: string;
  }) =>
    apiFetch<FastStatsResponseAPI>("/api/faststats/", { params }),

  // Export
  exportCSV: (data: unknown) =>
    apiFetch("/api/export/csv", { method: "POST", body: JSON.stringify(data) }),
};
