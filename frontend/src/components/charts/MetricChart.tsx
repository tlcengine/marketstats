"use client";

import React, { useMemo, forwardRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  metric: MetricKey;
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
            {formatMetricValue(entry.value, metric)}
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
 * Pivot data from flat array into Recharts-friendly rows keyed by month.
 * Apply rolling average if rolling > 1.
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

  // Apply rolling average per area
  if (rolling > 1) {
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

  const metricLabel = METRIC_LABELS[metric];

  const commonProps = {
    data: pivoted,
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
    interval: Math.max(0, Math.floor(pivoted.length / 12) - 1),
  };

  const yAxisProps = {
    tick: { fontSize: 11, fill: "#53555A" },
    tickFormatter: (val: number) => formatAxisValue(val, metric),
    tickLine: false,
    axisLine: false,
    width: 70,
  };

  return (
    <div ref={ref}>
      <h2
        className="mb-3 text-lg font-semibold tracking-tight"
        style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#181818" }}
      >
        {metricLabel}
        {rolling > 1 && (
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({rolling}-mo rolling avg)
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
