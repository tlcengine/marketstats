// MarketStats constants — ported from dashboard/constants.py

export const METRICS = [
  "MedianSalesPrice",
  "NewListings",
  "Inventory",
  "PendingSales",
  "ClosedSales",
  "DaysOnMarket",
  "MonthsSupply",
  "PctOfListPrice",
  "PricePerSqFt",
  "DollarVolume",
  "AbsorptionRate",
  "AverageSalesPrice",
  "ListToSaleRatio",
  "ShowsToPending",
  "ShowsPerListing",
] as const;

export type MetricKey = (typeof METRICS)[number];

export const METRIC_LABELS: Record<MetricKey, string> = {
  MedianSalesPrice: "Median Sales Price",
  NewListings: "New Listings",
  Inventory: "Inventory",
  PendingSales: "Pending Sales",
  ClosedSales: "Closed Sales",
  DaysOnMarket: "Days on Market",
  MonthsSupply: "Months Supply",
  PctOfListPrice: "% of List Price",
  PricePerSqFt: "Price Per Sq Ft",
  DollarVolume: "Dollar Volume",
  AbsorptionRate: "Absorption Rate",
  AverageSalesPrice: "Average Sales Price",
  ListToSaleRatio: "List-to-Sale Ratio",
  ShowsToPending: "Shows to Pending",
  ShowsPerListing: "Shows Per Listing",
};

export const METRIC_SHORT: Record<MetricKey, string> = {
  MedianSalesPrice: "Sales Price",
  NewListings: "New Listings",
  Inventory: "Inventory",
  PendingSales: "Pending",
  ClosedSales: "Closed",
  DaysOnMarket: "Days/Mkt",
  MonthsSupply: "Mo. Supply",
  PctOfListPrice: "% List",
  PricePerSqFt: "$/SqFt",
  DollarVolume: "$ Volume",
  AbsorptionRate: "Absorb",
  AverageSalesPrice: "Avg Price",
  ListToSaleRatio: "L/S Ratio",
  ShowsToPending: "Shows/Pend",
  ShowsPerListing: "Shows/List",
};

export const METRIC_FORMATS: Record<MetricKey, string> = {
  MedianSalesPrice: "$,.0f",
  NewListings: ",.0f",
  Inventory: ",.0f",
  PendingSales: ",.0f",
  ClosedSales: ",.0f",
  DaysOnMarket: ",.0f",
  MonthsSupply: ".1f",
  PctOfListPrice: ".1%",
  PricePerSqFt: "$,.0f",
  DollarVolume: "$,.0f",
  AbsorptionRate: ".1%",
  AverageSalesPrice: "$,.0f",
  ListToSaleRatio: ".3f",
  ShowsToPending: ".1f",
  ShowsPerListing: ".1f",
};

// BHS-inspired color palette
export const COLORS = {
  gold: "#DAAA00",
  black: "#000000",
  darkGray: "#181818",
  bodyGray: "#53555A",
  borderWarm: "#D9D8D6",
  cream: "#FAF9F7",
  white: "#FFFFFF",
  navy: "#1B2D4B",
  bgLight: "#f6f8fa",
} as const;

// Metrics that support a Median/Average sub-toggle (like InfoSparks)
export const METRICS_WITH_MA_TOGGLE: MetricKey[] = [
  "MedianSalesPrice",
  "DaysOnMarket",
  "PctOfListPrice",
  "PricePerSqFt",
  "ShowsToPending",
];

// InfoSparks tab/chart colors for up to 4 areas (orange first, matching InfoSparks)
export const AREA_COLORS = ["#E8871E", "#d4553a", "#2d8a4e", "#7b7b7b"];

// Lighter backgrounds for area tabs
export const AREA_TAB_BG = ["#e8f0fa", "#fce8e4", "#e4f5ea", "#efefef"];

// Breakout colors
export const BREAKOUT_COLORS = [
  "#1B2D4B", "#DAAA00", "#53555A", "#8B4513",
  "#2E86AB", "#A23B72", "#F18F01", "#C73E1D",
  "#3B1F2B", "#44BBA4", "#E94F37", "#393E41",
];
