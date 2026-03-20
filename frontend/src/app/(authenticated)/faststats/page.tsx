"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { HelpCircle } from "lucide-react";
import useSWR from "swr";
import { api, type FastStatsMetricAPI } from "@/lib/api";
import { useStates, useCities, useCounties, useZips } from "@/lib/hooks";
import { COLORS } from "@/lib/constants";

// ── Month names ──

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Format helpers ──

function formatMetricValue(val: number | null, fmt: string): string {
  if (val == null || (typeof val === "number" && !isFinite(val))) return "N/A";

  switch (fmt) {
    case "$":
      if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
      if (Math.abs(val) >= 1_000) return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
      return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    case "$big":
      if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
      if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
      if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
      return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    case "%":
      return Math.abs(val) < 5 ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
    case "#":
      return Math.round(val).toLocaleString("en-US");
    case "d":
      return `${Math.round(val)}`;
    case "f":
      return val.toFixed(1);
    default:
      return `${val}`;
  }
}

function formatYoY(pct: number | null): { text: string; direction: "up" | "down" | "flat" } {
  if (pct == null || !isFinite(pct)) return { text: "N/A", direction: "flat" };
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return { text: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`, direction: dir };
}

// ── Trend Arrow SVG ──

function TrendArrow({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "flat") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }
  if (direction === "up") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600">
        <polyline points="17 11 12 6 7 11" />
        <line x1="12" y1="6" x2="12" y2="18" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-600">
      <polyline points="17 13 12 18 7 13" />
      <line x1="12" y1="18" x2="12" y2="6" />
    </svg>
  );
}

// ── Tooltip "?" icon component ──

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex cursor-help align-middle">
      <HelpCircle className="h-3 w-3 text-gray-400 transition-colors group-hover:text-gray-600" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-normal rounded bg-[#1B2D4B] px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        style={{ width: "max-content", maxWidth: 260 }}
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1B2D4B]" />
      </span>
    </span>
  );
}

// ── Metric tooltip explanations ──

const METRIC_TOOLTIPS: Record<string, string> = {
  "MedianSalesPrice": "The middle sale price when all sales are ranked lowest to highest. Half sold for more, half for less",
  "NewListings": "Properties newly listed for sale during the period",
  "ClosedSales": "The number of transactions that closed (settled) during the period",
  "Inventory": "The total number of properties currently available for sale (active listings)",
  "PendingSales": "Properties under contract but not yet closed",
  "DaysOnMarket": "Days on Market: The median number of days from listing to contract",
  "PricePerSqFt": "The sale price divided by the home's total square footage, useful for comparing value across different-sized homes",
  "DollarVolume": "The total dollar value of all closed transactions in the period",
  "MonthsSupply": "How long it would take to sell all current inventory at the current sales pace. Under 6 months favors sellers, over 6 favors buyers",
  "AbsorptionRate": "The percentage of available inventory that sold during the period. Higher rates indicate stronger demand",
  "PctOfListPrice": "The percentage of the asking price that sellers actually received (sale price / list price)",
  "AverageSalesPrice": "The arithmetic mean of all sale prices in the period",
  "ListToSaleRatio": "The ratio of listings to sales. A higher number means more listings per sale, indicating a slower market",
};

// ── KPI Card ──

function KPICard({ metric }: { metric: FastStatsMetricAPI }) {
  const currentFormatted = formatMetricValue(metric.current_value, metric.format);
  const priorFormatted = formatMetricValue(metric.prior_value, metric.format);
  const yoy = formatYoY(metric.yoy_change);

  return (
    <div className="rounded-lg border border-[#D9D8D6] bg-white p-4 hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-[#53555A] uppercase tracking-wide flex items-center">
        <span className="truncate">{metric.label}</span>
        {METRIC_TOOLTIPS[metric.metric] && <InfoTooltip text={METRIC_TOOLTIPS[metric.metric]} />}
      </p>

      <div className="mt-2 flex items-end justify-between gap-2">
        <p
          className="text-2xl font-bold text-[#181818] leading-none"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {currentFormatted}
        </p>
        <div className="flex items-center gap-0.5 shrink-0">
          <TrendArrow direction={yoy.direction} />
          <span
            className={`text-xs font-semibold ${
              yoy.direction === "up"
                ? "text-green-600"
                : yoy.direction === "down"
                ? "text-red-600"
                : "text-gray-400"
            }`}
          >
            {yoy.text}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-[#53555A]">
        <span>Prior Year: {priorFormatted}</span>
      </div>

      {/* Mini progress bar showing YoY change magnitude */}
      {metric.yoy_change != null && isFinite(metric.yoy_change) && (
        <div className="mt-2 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(Math.abs(metric.yoy_change) * 2, 100)}%`,
              backgroundColor:
                metric.yoy_change > 0 ? "#16a34a" : metric.yoy_change < 0 ? "#dc2626" : "#9ca3af",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Geo Type Map ──
const GEO_TYPE_MAP: Record<string, string> = {
  county: "County",
  city: "City",
  zip: "PostalCode",
};

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════

export default function FastStatsPage() {
  // Geography
  const [selectedState, setSelectedState] = useState("");
  const [geoType, setGeoType] = useState<"county" | "city" | "zip">("county");
  const [selectedGeoValues, setSelectedGeoValues] = useState<string[]>([]);

  // Time period
  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);

  // Report generation
  const [generated, setGenerated] = useState(false);
  const [fetchKey, setFetchKey] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Geography data
  const { data: statesData } = useStates();
  const states = statesData?.states ?? [];

  useEffect(() => {
    if (states.length > 0 && !selectedState) {
      setSelectedState(states[0].value);
    }
  }, [states, selectedState]);

  const { data: countiesData } = useCounties(selectedState || undefined);
  const { data: citiesData } = useCities(selectedState || undefined);
  const { data: zipsData } = useZips(selectedState || undefined);

  const geoOptions = (() => {
    switch (geoType) {
      case "county":
        return countiesData?.counties ?? [];
      case "city":
        return citiesData?.cities ?? [];
      case "zip":
        return zipsData?.zips ?? [];
      default:
        return [];
    }
  })();

  // FastStats data
  const { data: fastStatsData, isLoading, error } = useSWR(
    fetchKey,
    () =>
      api.getFastStats({
        state: selectedState,
        geo_type: GEO_TYPE_MAP[geoType],
        geo_values: selectedGeoValues.join(","),
        month,
        year,
        stat_type: "Median",
      }),
    { revalidateOnFocus: false }
  );

  const handleGenerate = useCallback(() => {
    if (!selectedState || selectedGeoValues.length === 0) return;
    const key = `faststats/${selectedState}/${geoType}/${selectedGeoValues.join(",")}/${year}/${month}`;
    setFetchKey(key);
    setGenerated(true);
  }, [selectedState, geoType, selectedGeoValues, year, month]);

  const handleGeoSelect = (value: string) => {
    setSelectedGeoValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setGenerated(false);
    setFetchKey(null);
  };

  // PDF download - print-friendly version
  const handleDownloadPDF = useCallback(() => {
    if (!reportRef.current) return;
    window.print();
  }, []);

  const areaName =
    fastStatsData?.area ||
    (selectedGeoValues.length > 0 ? selectedGeoValues.join(", ") : "");

  const yearOptions = Array.from({ length: 10 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[#181818]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          FastStats - Monthly Market Indicators
        </h1>
        <p className="mt-1 text-sm text-[#53555A]">
          Generate a snapshot of all 13 market metrics for any geography and
          time period.
        </p>
      </div>

      {/* Selectors */}
      <div className="rounded-lg border border-[#D9D8D6] bg-white p-5 space-y-4">
        {/* State & Geo Type */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedGeoValues([]);
                setGenerated(false);
                setFetchKey(null);
              }}
              className="h-9 rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none min-w-[180px]"
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Geography Type
            </label>
            <select
              value={geoType}
              onChange={(e) => {
                setGeoType(e.target.value as "county" | "city" | "zip");
                setSelectedGeoValues([]);
                setGenerated(false);
                setFetchKey(null);
              }}
              className="h-9 rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none min-w-[150px]"
            >
              <option value="county">County</option>
              <option value="city">City</option>
              <option value="zip">Zip Code</option>
            </select>
          </div>
        </div>

        {/* Geo Values */}
        <div>
          <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
            Select {geoType === "county" ? "Counties" : geoType === "city" ? "Cities" : "Zip Codes"}
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-[#D9D8D6] p-2">
            {geoOptions.length === 0 ? (
              <p className="text-xs text-[#53555A] p-2">
                {selectedState ? "Loading..." : "Select a state first"}
              </p>
            ) : (
              geoOptions.map((opt) => {
                const isSelected = selectedGeoValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleGeoSelect(opt.value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-[#DAAA00] text-white"
                        : "bg-[#FAF9F7] text-[#53555A] hover:bg-[#DAAA00]/10"
                    }`}
                  >
                    {opt.label}
                    {opt.count != null && (
                      <span className="ml-1 opacity-60">({opt.count})</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          {selectedGeoValues.length > 0 && (
            <p className="mt-1 text-[10px] text-[#53555A]">
              Selected: {selectedGeoValues.join(", ")}
            </p>
          )}
        </div>

        {/* Month / Year */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => {
                setMonth(parseInt(e.target.value));
                setGenerated(false);
                setFetchKey(null);
              }}
              className="h-9 rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none min-w-[140px]"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => {
                setYear(parseInt(e.target.value));
                setGenerated(false);
                setFetchKey(null);
              }}
              className="h-9 rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none min-w-[100px]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!selectedState || selectedGeoValues.length === 0}
          className="h-10 w-full rounded-lg bg-[#DAAA00] px-6 text-sm font-semibold text-white hover:bg-[#c49a00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          Generate Report
        </button>
      </div>

      {/* Loading */}
      {isLoading && generated && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && generated && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Failed to load FastStats. The API may not have data for this
            geography/period.
          </p>
        </div>
      )}

      {/* Results */}
      {fastStatsData && generated && !isLoading && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          {/* Report Header */}
          <div className="rounded-lg border border-[#D9D8D6] bg-white p-5 print:border-none print:p-0">
            <div className="flex items-start justify-between">
              <div>
                <h2
                  className="text-xl font-bold text-[#181818]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Monthly Market Indicators
                </h2>
                <p className="text-sm text-[#53555A] mt-0.5">
                  {areaName} -- {MONTHS[fastStatsData.month - 1]}{" "}
                  {fastStatsData.year}
                </p>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="print:hidden h-8 rounded-lg border border-[#D9D8D6] bg-white px-3 text-xs font-medium text-[#53555A] hover:bg-[#FAF9F7] transition-colors flex items-center gap-1.5"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Print / PDF
              </button>
            </div>
          </div>

          {/* Market Summary */}
          {(() => {
            const metrics = fastStatsData.metrics;
            const closedSales = metrics.find((m) => m.metric === "ClosedSales");
            const medianPrice = metrics.find((m) => m.metric === "MedianSalesPrice");
            const dom = metrics.find((m) => m.metric === "DaysOnMarket");
            const monthsSupply = metrics.find((m) => m.metric === "MonthsSupply");

            const parts: string[] = [];
            if (closedSales?.current_value != null) {
              const cs = Math.round(closedSales.current_value);
              if (closedSales.yoy_change != null) {
                const dir = closedSales.yoy_change > 0 ? "up" : "down";
                parts.push(
                  `In ${MONTHS[fastStatsData.month - 1]} ${fastStatsData.year}, ${areaName} saw ${cs.toLocaleString()} closed sales, ${dir} ${Math.abs(closedSales.yoy_change).toFixed(1)}% year-over-year.`
                );
              } else {
                parts.push(`In ${MONTHS[fastStatsData.month - 1]} ${fastStatsData.year}, ${areaName} recorded ${cs.toLocaleString()} closed sales.`);
              }
            }
            if (medianPrice?.current_value != null) {
              const mp = medianPrice.current_value;
              if (medianPrice.yoy_change != null) {
                const dir = medianPrice.yoy_change > 0 ? "rose" : "fell";
                parts.push(`The median sales price ${dir} ${Math.abs(medianPrice.yoy_change).toFixed(1)}% to $${mp.toLocaleString("en-US", { maximumFractionDigits: 0 })}.`);
              }
            }
            if (dom?.current_value != null) {
              parts.push(`Properties spent a median of ${Math.round(dom.current_value)} days on market.`);
            }
            if (monthsSupply?.current_value != null) {
              const ms = monthsSupply.current_value;
              const condition = ms < 4 ? "indicating a seller's market" : ms > 6 ? "indicating a buyer's market" : "suggesting a balanced market";
              parts.push(`Months supply stood at ${ms.toFixed(1)}, ${condition}.`);
            }

            if (parts.length === 0) return null;

            return (
              <div className="rounded-lg border border-[#DAAA00]/30 bg-[#DAAA00]/5 p-4">
                <p className="text-xs font-semibold text-[#53555A] uppercase tracking-wide mb-1">
                  Market Summary
                </p>
                <p className="text-sm text-[#181818] leading-relaxed">
                  {parts.join(" ")}
                </p>
              </div>
            );
          })()}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 print:grid-cols-3 print:gap-2">
            {fastStatsData.metrics.map((metric) => (
              <KPICard key={metric.metric} metric={metric} />
            ))}
          </div>

          {/* Tabular View */}
          <div className="rounded-lg border border-[#D9D8D6] bg-white p-5 print:border-none print:p-0">
            <h3
              className="text-base font-semibold text-[#181818] mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Detailed Metrics
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#DAAA00]">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#53555A] uppercase">
                      Metric
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-[#53555A] uppercase">
                      {MONTHS[fastStatsData.month - 1].slice(0, 3)} {fastStatsData.year}
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-[#53555A] uppercase">
                      <span className="inline-flex items-center justify-end">
                        YoY Change
                        <InfoTooltip text="Year-over-Year: Compares the current period to the same period one year ago" />
                      </span>
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-[#53555A] uppercase">
                      {MONTHS[fastStatsData.month - 1].slice(0, 3)} {fastStatsData.year - 1}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fastStatsData.metrics.map((m, i) => {
                    const yoy = formatYoY(m.yoy_change);
                    return (
                      <tr
                        key={m.metric}
                        className={i % 2 === 0 ? "bg-[#FAF9F7]" : "bg-white"}
                      >
                        <td className="py-2 px-3 font-medium text-[#181818]">
                          <span className="inline-flex items-center">
                            {m.label}
                            {METRIC_TOOLTIPS[m.metric] && <InfoTooltip text={METRIC_TOOLTIPS[m.metric]} />}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#181818]">
                          {formatMetricValue(m.current_value, m.format)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 font-medium ${
                              yoy.direction === "up"
                                ? "text-green-600"
                                : yoy.direction === "down"
                                ? "text-red-600"
                                : "text-gray-400"
                            }`}
                          >
                            <TrendArrow direction={yoy.direction} />
                            {yoy.text}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-[#53555A]">
                          {formatMetricValue(m.prior_value, m.format)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-[#53555A] print:mt-4">
            Generated by MarketStats on{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!generated && !isLoading && (
        <div className="rounded-lg border border-dashed border-[#DAAA00]/40 bg-[#FAF9F7] p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[#DAAA00]/50 mb-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <p className="text-sm text-[#53555A]">
            Select a geography and time period above, then click{" "}
            <strong>Generate Report</strong> to see all 13 market indicators at a
            glance.
          </p>
        </div>
      )}
    </div>
  );
}
