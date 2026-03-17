"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  BarChart3,
  Activity,
  DollarSign,
  CalendarDays,
  Minus,
} from "lucide-react";
import { useStates, useCities, useCounties, useForecast } from "@/lib/hooks";
import { COLORS } from "@/lib/constants";

// ── Formatters ──

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "--";
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function formatCurrencyFull(val: number | null | undefined): string {
  if (val == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatPercent(val: number | null | undefined): string {
  if (val == null) return "--";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

function formatMonth(dateStr: string): string {
  try {
    const [year, month] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ── KPI Card ──

function KPICard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "flat" | null;
}) {
  const trendColor =
    trend === "up"
      ? "text-green-600"
      : trend === "down"
        ? "text-red-600"
        : "text-gray-500";

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[#DAAA00]" />
      </div>
      <p
        className="text-2xl font-bold"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#181818",
        }}
      >
        {value}
      </p>
      {subtitle && (
        <p className={`text-xs mt-1 ${trendColor}`}>{subtitle}</p>
      )}
    </div>
  );
}

// ── Custom Tooltip ──

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !label) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{formatMonth(label)}</p>
      {payload.map((entry, i) => {
        if (entry.name === "confidenceBand") return null;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-medium text-gray-700">
              {formatCurrencyFull(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──

export default function PriceForecastPage() {
  // Geography selectors
  const [selectedState, setSelectedState] = useState<string>("");
  const [geoType, setGeoType] = useState<"city" | "county">("city");
  const [selectedGeo, setSelectedGeo] = useState<string>("");
  const [years, setYears] = useState<number>(5);
  const [forecastMonths, setForecastMonths] = useState<number>(12);
  const [statType, setStatType] = useState<"median" | "average">("median");

  const { data: statesData } = useStates();
  const { data: citiesData } = useCities(selectedState || undefined);
  const { data: countiesData } = useCounties(selectedState || undefined);

  const geoOptions = useMemo(() => {
    if (geoType === "city") {
      return citiesData?.cities ?? [];
    }
    return countiesData?.counties ?? [];
  }, [geoType, citiesData, countiesData]);

  // Forecast params
  const forecastParams = useMemo(() => {
    if (!selectedState || !selectedGeo) return null;
    return {
      state: selectedState,
      geoType,
      geoValues: [selectedGeo],
      years,
      forecastMonths,
      statType,
    };
  }, [selectedState, geoType, selectedGeo, years, forecastMonths, statType]);

  const { data: forecastData, isLoading, error } = useForecast(forecastParams);

  // Build chart data
  const chartData = useMemo(() => {
    if (!forecastData) return [];

    const points: Array<{
      date: string;
      historical: number | null;
      forecast: number | null;
      upper: number | null;
      lower: number | null;
      count?: number;
    }> = [];

    // Historical points
    for (const pt of forecastData.historical) {
      points.push({
        date: pt.date,
        historical: pt.value,
        forecast: null,
        upper: null,
        lower: null,
        count: pt.count,
      });
    }

    // Add overlap point: last historical = first forecast
    if (
      forecastData.historical.length > 0 &&
      forecastData.forecast.length > 0
    ) {
      const lastHistorical =
        forecastData.historical[forecastData.historical.length - 1];
      // The forecast starts after the last historical, but we want a connecting point
      points[points.length - 1].forecast = lastHistorical.value;
    }

    // Forecast points
    for (let i = 0; i < forecastData.forecast.length; i++) {
      points.push({
        date: forecastData.forecast[i].date,
        historical: null,
        forecast: forecastData.forecast[i].value,
        upper: forecastData.confidence_upper[i]?.value ?? null,
        lower: forecastData.confidence_lower[i]?.value ?? null,
      });
    }

    return points;
  }, [forecastData]);

  const states = statesData?.states ?? [];

  const pctChange = forecastData?.pct_change;
  const trendDirection =
    pctChange == null
      ? null
      : pctChange > 0.5
        ? "up"
        : pctChange < -0.5
          ? "down"
          : ("flat" as const);
  const TrendIcon =
    trendDirection === "up"
      ? TrendingUp
      : trendDirection === "down"
        ? TrendingDown
        : Minus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "#181818",
          }}
        >
          Price Forecast
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          View historical price trends and projected future values using linear
          regression analysis.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#DAAA00]" />
            Select Geography
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* State */}
            <div className="w-48">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                State
              </label>
              <Select
                value={selectedState}
                onValueChange={(val) => {
                  setSelectedState(val ?? "");
                  setSelectedGeo("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Geo type toggle */}
            <div className="w-36">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Area Type
              </label>
              <Select
                value={geoType}
                onValueChange={(val) => {
                  setGeoType((val ?? "city") as "city" | "county");
                  setSelectedGeo("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">City</SelectItem>
                  <SelectItem value="county">County</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Geo value */}
            <div className="w-56">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {geoType === "city" ? "City" : "County"}
              </label>
              <Select
                value={selectedGeo}
                onValueChange={(val) => setSelectedGeo(val ?? "")}
                disabled={!selectedState}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      selectedState
                        ? `Select ${geoType}`
                        : "Select state first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {geoOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                      {opt.count ? ` (${opt.count.toLocaleString()})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Years of history */}
            <div className="w-28">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                History
              </label>
              <Select
                value={String(years)}
                onValueChange={(val) => setYears(Number(val ?? 5))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Years</SelectItem>
                  <SelectItem value="5">5 Years</SelectItem>
                  <SelectItem value="10">10 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Forecast horizon */}
            <div className="w-32">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Forecast
              </label>
              <Select
                value={String(forecastMonths)}
                onValueChange={(val) => setForecastMonths(Number(val ?? 12))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stat type */}
            <div className="w-32">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Stat Type
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                    statType === "median"
                      ? "bg-[#1B2D4B] text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  onClick={() => setStatType("median")}
                >
                  Median
                </button>
                <button
                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                    statType === "average"
                      ? "bg-[#1B2D4B] text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  onClick={() => setStatType("average")}
                >
                  Average
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedState || !selectedGeo ? (
        <div className="rounded-lg border border-dashed border-[#DAAA00]/40 bg-[#FAF9F7] px-6 py-16 text-center">
          <Activity className="h-8 w-8 text-[#DAAA00]/50 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Select a state and geography above to view the price forecast.
          </p>
        </div>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#DAAA00]" />
            <p className="text-xs text-gray-400 mt-3">
              Generating forecast...
            </p>
          </CardContent>
        </Card>
      ) : error || !forecastData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-red-500">
              Failed to load forecast data. Make sure the backend is running.
            </p>
          </CardContent>
        </Card>
      ) : forecastData.historical.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-gray-400">
              No historical data available for the selected geography.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label={`Current ${statType === "median" ? "Median" : "Average"}`}
              value={formatCurrencyFull(forecastData.current_median)}
              subtitle={
                forecastData.historical.length > 0
                  ? `As of ${formatMonth(forecastData.historical[forecastData.historical.length - 1].date)}`
                  : undefined
              }
              icon={DollarSign}
            />
            <KPICard
              label={`${forecastMonths}mo Forecast`}
              value={formatCurrencyFull(forecastData.predicted_median)}
              subtitle={
                pctChange != null ? formatPercent(pctChange) : undefined
              }
              icon={TrendIcon}
              trend={trendDirection}
            />
            <KPICard
              label="Projected Change"
              value={pctChange != null ? formatPercent(pctChange) : "--"}
              subtitle={
                trendDirection === "up"
                  ? "Price appreciation expected"
                  : trendDirection === "down"
                    ? "Price decline projected"
                    : "Prices expected stable"
              }
              icon={BarChart3}
              trend={trendDirection}
            />
            <KPICard
              label="Transactions"
              value={
                forecastData.total_transactions != null
                  ? forecastData.total_transactions.toLocaleString()
                  : "--"
              }
              subtitle={`Over ${years} year${years !== 1 ? "s" : ""}`}
              icon={CalendarDays}
            />
          </div>

          {/* Chart */}
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#DAAA00]" />
                {statType === "median" ? "Median" : "Average"} Sales Price
                Trend &amp; Forecast
                <span className="text-xs font-normal text-gray-400 ml-auto">
                  {selectedGeo}, {selectedState}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E5E7EB"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatMonth}
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip
                      content={<ForecastTooltip />}
                    />

                    {/* Confidence band (shaded area) */}
                    <Area
                      dataKey="upper"
                      stroke="none"
                      fill={COLORS.gold}
                      fillOpacity={0.1}
                      name="confidenceBand"
                      dot={false}
                      activeDot={false}
                      legendType="none"
                    />
                    <Area
                      dataKey="lower"
                      stroke="none"
                      fill="#FFFFFF"
                      fillOpacity={1}
                      name="confidenceBand"
                      dot={false}
                      activeDot={false}
                      legendType="none"
                    />

                    {/* Historical line */}
                    <Line
                      dataKey="historical"
                      name="Historical"
                      stroke={COLORS.navy}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: COLORS.navy,
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                      connectNulls={false}
                    />

                    {/* Forecast line (dashed) */}
                    <Line
                      dataKey="forecast"
                      name="Forecast"
                      stroke={COLORS.gold}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: COLORS.gold,
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                      connectNulls={false}
                    />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="line"
                      wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Methodology note */}
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-[#FAF9F7] px-4 py-3">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <span className="font-medium text-gray-500">
                    Methodology:
                  </span>{" "}
                  Forecast generated using ordinary least squares linear
                  regression on monthly{" "}
                  {statType === "median" ? "median" : "average"} close prices.
                  The shaded band represents a 95% confidence interval that
                  widens over the forecast horizon. This is a statistical
                  projection, not a guarantee of future prices. Market
                  conditions, economic factors, and local developments can
                  significantly impact actual outcomes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Forecast data table */}
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#DAAA00]" />
                Forecast Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-[#FAF9F7]">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                        Month
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                        Predicted Price
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                        Lower Bound
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                        Upper Bound
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.forecast.map((pt, i) => (
                      <tr
                        key={pt.date}
                        className="border-b border-gray-50 hover:bg-[#FAF9F7] transition-colors"
                      >
                        <td className="px-4 py-2 text-gray-700">
                          {formatMonth(pt.date)}
                        </td>
                        <td
                          className="px-4 py-2 text-right font-medium tabular-nums"
                          style={{ color: COLORS.gold }}
                        >
                          {formatCurrencyFull(pt.value)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-400 tabular-nums">
                          {formatCurrencyFull(
                            forecastData.confidence_lower[i]?.value
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-400 tabular-nums">
                          {formatCurrencyFull(
                            forecastData.confidence_upper[i]?.value
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
