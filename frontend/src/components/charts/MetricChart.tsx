"use client";

import React, { useMemo, forwardRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { MetricKey } from "@/lib/constants";
import { AREA_COLORS, METRIC_LABELS } from "@/lib/constants";
import { formatAxisValue, formatMetricValue, formatMonthFull } from "@/lib/format";
import type { MetricDataPoint, ChartType, RollingWindow } from "@/lib/types";

// ── Loading skeleton ──

export function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-lg bg-gray-100 p-6" style={{ height: 450 }}>
      <div className="mb-4 h-4 w-48 rounded bg-gray-200" />
      <div className="flex h-full items-end gap-1 pb-12">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gray-200"
            style={{ height: `${30 + ((i * 17 + 7) % 60)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Custom tooltip ──

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  metric,
  isPercentChange,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  metric: MetricKey;
  isPercentChange?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-lg"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <p className="mb-1 text-xs font-medium text-gray-500">
        {label ? formatMonthFull(label) : ""}
      </p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold" style={{ color: entry.color }}>
            {isPercentChange
              ? `${entry.value >= 0 ? "+" : ""}${entry.value.toFixed(1)}%`
              : formatMetricValue(entry.value, metric)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Props ──

interface MetricChartProps {
  data: MetricDataPoint[];
  metric: MetricKey;
  chartType: ChartType;
  areaNames: string[];
  areaIds: string[];
  rolling: RollingWindow;
  legendVisible: boolean;
  height?: number;
}

// ── Helpers ──

/**
 * Compute Year-to-Date aggregation: for each year, accumulate values
 * from January through each month, producing a running YTD average.
 */
function applyYtd(series: { month: string; value: number }[]): { month: string; value: number }[] {
  const byYear: Record<string, { month: string; value: number }[]> = {};
  for (const pt of series) {
    const year = pt.month.slice(0, 4);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(pt);
  }

  const result: { month: string; value: number }[] = [];
  for (const year of Object.keys(byYear).sort()) {
    const pts = byYear[year].sort((a, b) => a.month.localeCompare(b.month));
    let cumSum = 0;
    let cumCount = 0;
    for (const pt of pts) {
      cumSum += pt.value;
      cumCount += 1;
      result.push({
        month: pt.month,
        value: Math.round((cumSum / cumCount) * 100) / 100,
      });
    }
  }
  return result;
}

/**
 * Pivot data from flat array into Recharts-friendly rows keyed by month.
 * Apply rolling average if rolling > 1, or YTD aggregation if rolling === "ytd".
 */
function pivotData(
  data: MetricDataPoint[],
  areaIds: string[],
  areaNames: string[],
  rolling: RollingWindow
): Record<string, unknown>[] {
  // Group by area, sorted by month
  const byArea: Record<string, { month: string; value: number }[]> = {};
  for (const id of areaIds) {
    byArea[id] = data
      .filter((d) => d.areaId === id)
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Apply rolling average or YTD per area
  if (rolling === "ytd") {
    for (const id of areaIds) {
      byArea[id] = applyYtd(byArea[id]);
    }
  } else if (rolling > 1) {
    for (const id of areaIds) {
      const series = byArea[id];
      const smoothed: { month: string; value: number }[] = [];
      for (let i = 0; i < series.length; i++) {
        const windowStart = Math.max(0, i - rolling + 1);
        const window = series.slice(windowStart, i + 1);
        const avg = window.reduce((s, p) => s + p.value, 0) / window.length;
        smoothed.push({ month: series[i].month, value: Math.round(avg * 100) / 100 });
      }
      byArea[id] = smoothed;
    }
  }

  // Collect all unique months
  const monthSet = new Set<string>();
  for (const id of areaIds) {
    for (const pt of byArea[id]) monthSet.add(pt.month);
  }
  const months = Array.from(monthSet).sort();

  // Build rows
  const nameMap: Record<string, string> = {};
  areaIds.forEach((id, i) => {
    nameMap[id] = areaNames[i];
  });

  return months.map((month) => {
    const row: Record<string, unknown> = { month };
    for (const id of areaIds) {
      const pt = byArea[id].find((p) => p.month === month);
      row[nameMap[id]] = pt?.value ?? null;
    }
    return row;
  });
}

/**
 * Compute YoY percent change from pivoted data.
 * For each month, finds the same month 12 months prior and computes
 * ((current - prior) / prior) * 100 as a percentage.
 */
function computePercentChange(
  pivoted: Record<string, unknown>[],
  areaNames: string[]
): Record<string, unknown>[] {
  // Build lookup by month
  const monthMap: Record<string, Record<string, unknown>> = {};
  for (const row of pivoted) {
    monthMap[row.month as string] = row;
  }

  const result: Record<string, unknown>[] = [];

  for (const row of pivoted) {
    const month = row.month as string;
    // Find month 12 months prior
    const d = new Date(month + "T00:00:00");
    d.setFullYear(d.getFullYear() - 1);
    const priorMonth = d.toISOString().slice(0, 10);
    // Use first day of month format matching
    const priorKey = `${priorMonth.slice(0, 7)}-01`;
    const priorRow = monthMap[priorKey] || monthMap[priorMonth];

    if (!priorRow) continue;

    const newRow: Record<string, unknown> = { month };
    let hasValue = false;

    for (const name of areaNames) {
      const current = row[name] as number | null;
      const prior = priorRow[name] as number | null;
      if (current != null && prior != null && prior !== 0) {
        newRow[name] = Math.round(((current - prior) / prior) * 10000) / 100; // percentage
        hasValue = true;
      } else {
        newRow[name] = null;
      }
    }

    if (hasValue) result.push(newRow);
  }

  return result;
}

// ── Component ──

const MetricChart = forwardRef<HTMLDivElement, MetricChartProps>(function MetricChart(
  {
    data,
    metric,
    chartType,
    areaNames,
    areaIds,
    rolling,
    legendVisible,
    height = 450,
  },
  ref
) {
  const pivoted = useMemo(
    () => pivotData(data, areaIds, areaNames, rolling),
    [data, areaIds, areaNames, rolling]
  );

  const pctChangeData = useMemo(
    () => (chartType === "percentChange" ? computePercentChange(pivoted, areaNames) : []),
    [chartType, pivoted, areaNames]
  );

  const metricLabel = METRIC_LABELS[metric];
  const isPercentChange = chartType === "percentChange";
  const chartData = isPercentChange ? pctChangeData : pivoted;

  const commonProps = {
    data: chartData,
    margin: { top: 8, right: 24, left: 12, bottom: 4 },
  };

  const xAxisProps = {
    dataKey: "month",
    tick: { fontSize: 11, fill: "#53555A" },
    tickFormatter: (val: string) => {
      const d = new Date(val + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    },
    tickLine: false,
    axisLine: { stroke: "#D9D8D6" },
    interval: Math.max(0, Math.floor(chartData.length / 12) - 1),
  };

  const yAxisProps = isPercentChange
    ? {
        tick: { fontSize: 11, fill: "#53555A" },
        tickFormatter: (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`,
        tickLine: false,
        axisLine: false,
        width: 70,
      }
    : {
        tick: { fontSize: 11, fill: "#53555A" },
        tickFormatter: (val: number) => formatAxisValue(val, metric),
        tickLine: false,
        axisLine: false,
        width: 70,
      };

  const rollingLabel =
    rolling === "ytd"
      ? "Year-to-Date"
      : typeof rolling === "number" && rolling > 1
        ? `${rolling}-mo rolling avg`
        : null;

  return (
    <div ref={ref}>
      <h2
        className="mb-3 text-lg font-semibold tracking-tight"
        style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#181818" }}
      >
        {isPercentChange ? `${metricLabel} — YoY % Change` : metricLabel}
        {rollingLabel && (
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({rollingLabel})
          </span>
        )}
      </h2>

      <ResponsiveContainer width="100%" height={height}>
        {chartType === "line" ? (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip
              content={<CustomTooltip metric={metric} />}
              cursor={{ stroke: "#D9D8D6", strokeDasharray: "3 3" }}
            />
            {legendVisible && (
              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  paddingTop: 8,
                }}
              />
            )}
            {areaNames.map((name, idx) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={AREA_COLORS[idx % AREA_COLORS.length]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                connectNulls
              />
            ))}
          </LineChart>
        ) : chartType === "percentChange" ? (
          <BarChart {...commonProps} barGap={2} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <ReferenceLine y={0} stroke="#888" strokeWidth={1} />
            <Tooltip
              content={<CustomTooltip metric={metric} isPercentChange />}
              cursor={{ fill: "rgba(218,170,0,0.08)" }}
            />
            {legendVisible && (
              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  paddingTop: 8,
                }}
              />
            )}
            {areaNames.map((name, idx) => (
              <Bar
                key={name}
                dataKey={name}
                maxBarSize={40}
                radius={[3, 3, 0, 0]}
                fill={AREA_COLORS[idx % AREA_COLORS.length]}
              >
                {chartData.map((row, i) => {
                  const val = row[name] as number | null;
                  // Color green for positive, red for negative; use area color as fallback
                  const color =
                    val != null
                      ? val >= 0
                        ? "#22c55e"
                        : "#ef4444"
                      : AREA_COLORS[idx % AREA_COLORS.length];
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            ))}
          </BarChart>
        ) : (
          <BarChart {...commonProps} barGap={2} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip
              content={<CustomTooltip metric={metric} />}
              cursor={{ fill: "rgba(218,170,0,0.08)" }}
            />
            {legendVisible && (
              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  paddingTop: 8,
                }}
              />
            )}
            {areaNames.map((name, idx) => (
              <Bar
                key={name}
                dataKey={name}
                fill={AREA_COLORS[idx % AREA_COLORS.length]}
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
});

export default MetricChart;
