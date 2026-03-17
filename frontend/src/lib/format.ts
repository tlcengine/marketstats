// Value formatting utilities for metrics

import type { MetricKey } from "./constants";
import { METRIC_FORMATS } from "./constants";

/**
 * Format a metric value for display based on its metric key.
 */
export function formatMetricValue(value: number, metric: MetricKey): string {
  const fmt = METRIC_FORMATS[metric];

  if (fmt.startsWith("$")) {
    // Currency format
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${Math.round(value).toLocaleString("en-US")}`;
    }
    return `$${value.toFixed(0)}`;
  }

  if (fmt.includes("%")) {
    return `${(value * 100).toFixed(1)}%`;
  }

  if (fmt.includes(".1f")) {
    return value.toFixed(1);
  }

  if (fmt.includes(".3f")) {
    return value.toFixed(3);
  }

  // Integer count format
  return Math.round(value).toLocaleString("en-US");
}

/**
 * Format a Y-axis tick value for chart display.
 */
export function formatAxisValue(value: number, metric: MetricKey): string {
  const fmt = METRIC_FORMATS[metric];

  if (fmt.startsWith("$")) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }

  if (fmt.includes("%")) {
    return `${(value * 100).toFixed(1)}%`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toLocaleString("en-US");
}

/**
 * Format a date string (YYYY-MM-DD) for chart display.
 */
export function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/**
 * Format a date string (YYYY-MM-DD) for tooltip display.
 */
export function formatMonthFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Format a YoY percentage change.
 */
export function formatYoYChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
