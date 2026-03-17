"use client";

import React, { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import {
  api,
  type TaxSummaryAPI,
  type PropertyClassCountAPI,
  type TaxDistributionBucketAPI,
  type CountyRateAPI,
  type TaxRecordAPI,
} from "@/lib/api";
import { COLORS } from "@/lib/constants";

// ── Formatting helpers ──

function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtNumber(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return val.toLocaleString("en-US");
}

function fmtPercent(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return `${val.toFixed(2)}%`;
}

// ── Stat Card ──

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-[#D9D8D6] bg-white p-4">
      <p className="text-xs font-medium text-[#53555A] uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#181818]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[#53555A]">{sub}</p>}
    </div>
  );
}

// ── Simple Bar Chart (CSS-based) ──

function HorizontalBar({
  items,
  maxValue,
  colorFn,
}: {
  items: { label: string; value: number; tooltip?: string }[];
  maxValue: number;
  colorFn?: (i: number) => string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.label} className="group">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-[#181818] font-medium truncate max-w-[60%]">{item.label}</span>
            <span className="text-[#53555A]">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-5 w-full rounded bg-[#FAF9F7] overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${Math.max((item.value / maxValue) * 100, 1)}%`,
                backgroundColor: colorFn ? colorFn(i) : COLORS.gold,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Histogram ──

function Histogram({
  buckets,
  label,
  formatTick,
}: {
  buckets: TaxDistributionBucketAPI[];
  label: string;
  formatTick: (v: number) => string;
}) {
  if (!buckets.length) return <p className="text-sm text-[#53555A]">No distribution data available.</p>;
  const maxCount = Math.max(...buckets.map((b) => b.count));

  return (
    <div>
      <p className="text-xs text-[#53555A] mb-2">{label}</p>
      <div className="flex items-end gap-px h-40">
        {buckets.map((b, i) => (
          <div
            key={i}
            className="flex-1 group relative"
            style={{ height: "100%" }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t transition-all duration-300 hover:opacity-80"
              style={{
                height: `${Math.max((b.count / maxCount) * 100, 2)}%`,
                backgroundColor: COLORS.navy,
              }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded bg-[#181818] px-2 py-1 text-[10px] text-white shadow-lg">
              {formatTick(b.bucket_min)} - {formatTick(b.bucket_max)}: {b.count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-[#53555A]">
        <span>{formatTick(buckets[0]?.bucket_min ?? 0)}</span>
        <span>{formatTick(buckets[buckets.length - 1]?.bucket_max ?? 0)}</span>
      </div>
    </div>
  );
}

// ── County Rates Table ──

function EffectiveRatesTable({ rates }: { rates: CountyRateAPI[] }) {
  const sorted = [...rates].sort((a, b) => b.effective_rate - a.effective_rate);
  const maxRate = sorted[0]?.effective_rate ?? 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#D9D8D6]">
            <th className="text-left py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">County</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">Eff. Rate</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">Avg Tax</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">Avg Value</th>
            <th className="text-left py-2 px-2 text-xs font-semibold text-[#53555A] uppercase w-32">Rate</th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">Props</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.county} className={i % 2 === 0 ? "bg-[#FAF9F7]" : "bg-white"}>
              <td className="py-1.5 px-2 font-medium text-[#181818]">{r.county}</td>
              <td className="py-1.5 px-2 text-right text-[#181818]">{r.effective_rate.toFixed(2)}%</td>
              <td className="py-1.5 px-2 text-right text-[#53555A]">{fmtCurrency(r.avg_tax)}</td>
              <td className="py-1.5 px-2 text-right text-[#53555A]">{fmtCurrency(r.avg_net_value)}</td>
              <td className="py-1.5 px-2">
                <div className="h-3 w-full rounded bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(r.effective_rate / maxRate) * 100}%`,
                      backgroundColor:
                        r.effective_rate > maxRate * 0.7
                          ? "#dc2626"
                          : r.effective_rate > maxRate * 0.4
                          ? COLORS.gold
                          : "#16a34a",
                    }}
                  />
                </div>
              </td>
              <td className="py-1.5 px-2 text-right text-[#53555A]">{r.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Property Search Result ──

function PropertyResult({ record }: { record: TaxRecordAPI }) {
  const effRate =
    record.net_value && record.calculated_tax && record.net_value > 0
      ? (record.calculated_tax / record.net_value) * 100
      : null;
  return (
    <div className="rounded-lg border border-[#D9D8D6] bg-white p-4">
      <p className="font-semibold text-sm text-[#181818]">
        {record.property_location || "N/A"}
      </p>
      <p className="text-xs text-[#53555A]">
        {record.city_state} | {record.county?.replace(/\b\w/g, (c) => c.toUpperCase())} County
        {record.zip_code ? ` | ${record.zip_code}` : ""}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] text-[#53555A] uppercase">Net Value</p>
          <p className="text-sm font-semibold text-[#181818]">{fmtCurrency(record.net_value)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#53555A] uppercase">Tax</p>
          <p className="text-sm font-semibold text-[#181818]">
            {record.calculated_tax != null ? `$${record.calculated_tax.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#53555A] uppercase">Eff. Rate</p>
          <p className="text-sm font-semibold text-[#181818]">{fmtPercent(effRate)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#53555A] uppercase">Year Built</p>
          <p className="text-sm font-semibold text-[#181818]">
            {record.year_constructed && record.year_constructed > 0 ? Math.round(record.year_constructed) : "N/A"}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs text-[#53555A]">
        <span>Land: {fmtCurrency(record.land_value)}</span>
        <span>Improvement: {fmtCurrency(record.improvement_value)}</span>
        <span>Class: {record.property_class || "N/A"}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════

export default function TaxAnalysisPage() {
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [selectedMuni, setSelectedMuni] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  // ── Data fetching ──

  const { data: countiesData } = useSWR("tax/counties", () => api.getTaxCounties(), {
    revalidateOnFocus: false,
  });

  const counties = countiesData?.counties ?? [];

  // Auto-select first county
  useEffect(() => {
    if (counties.length > 0 && !selectedCounty) {
      setSelectedCounty(counties[0]);
    }
  }, [counties, selectedCounty]);

  const { data: munisData } = useSWR(
    selectedCounty ? `tax/municipalities/${selectedCounty}` : null,
    () => api.getTaxMunicipalities(selectedCounty),
    { revalidateOnFocus: false }
  );
  const municipalities = munisData?.municipalities ?? [];

  const { data: summary, isLoading: summaryLoading } = useSWR(
    selectedCounty ? `tax/summary/${selectedCounty}/${selectedMuni}` : null,
    () =>
      api.getTaxSummary({
        county: selectedCounty,
        municipality: selectedMuni || undefined,
      }),
    { revalidateOnFocus: false }
  );

  const { data: classData } = useSWR(
    selectedCounty ? `tax/classes/${selectedCounty}/${selectedMuni}` : null,
    () =>
      api.getTaxPropertyClasses({
        county: selectedCounty,
        municipality: selectedMuni || undefined,
      }),
    { revalidateOnFocus: false }
  );

  const { data: distData } = useSWR(
    selectedCounty ? `tax/dist/${selectedCounty}/${selectedMuni}` : null,
    () =>
      api.getTaxDistribution({
        county: selectedCounty,
        municipality: selectedMuni || undefined,
        field: "net_value",
        buckets: 30,
      }),
    { revalidateOnFocus: false }
  );

  const { data: taxDistData } = useSWR(
    selectedCounty ? `tax/taxdist/${selectedCounty}/${selectedMuni}` : null,
    () =>
      api.getTaxDistribution({
        county: selectedCounty,
        municipality: selectedMuni || undefined,
        field: "calculated_tax",
        buckets: 30,
      }),
    { revalidateOnFocus: false }
  );

  const { data: ratesData } = useSWR("tax/effective-rates", () => api.getTaxEffectiveRates(), {
    revalidateOnFocus: false,
  });

  const { data: searchData, isLoading: searchLoading } = useSWR(
    activeSearch.length >= 3 ? `tax/search/${activeSearch}/${selectedCounty}` : null,
    () =>
      api.searchTaxProperty({
        query: activeSearch,
        county: selectedCounty || undefined,
        limit: 20,
      }),
    { revalidateOnFocus: false }
  );

  const handleSearch = useCallback(() => {
    if (searchQuery.length >= 3) {
      setActiveSearch(searchQuery);
    }
  }, [searchQuery]);

  const geoLabel = selectedMuni || (selectedCounty ? `${selectedCounty.replace(/\b\w/g, (c) => c.toUpperCase())} County` : "");

  const classItems = (classData?.classes ?? []).slice(0, 10);
  const maxClassCount = classItems.length > 0 ? Math.max(...classItems.map((c) => c.count)) : 1;

  const CLASS_COLORS = ["#1B2D4B", "#DAAA00", "#53555A", "#2E86AB", "#A23B72", "#F18F01", "#C73E1D", "#44BBA4", "#E94F37", "#3B1F2B"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[#181818]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          NJ Property Tax Analysis
        </h1>
        <p className="mt-1 text-sm text-[#53555A]">
          Analyze property tax assessments, effective rates, and value distributions across New Jersey.
        </p>
      </div>

      {/* Geography Selector */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
            County
          </label>
          <select
            value={selectedCounty}
            onChange={(e) => {
              setSelectedCounty(e.target.value);
              setSelectedMuni("");
            }}
            className="h-9 rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none min-w-[200px]"
          >
            <option value="">Select County</option>
            {counties.map((c) => (
              <option key={c} value={c}>
                {c.replace(/\b\w/g, (ch) => ch.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
            Municipality
          </label>
          <select
            value={selectedMuni}
            onChange={(e) => setSelectedMuni(e.target.value)}
            className="h-9 rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none min-w-[200px]"
          >
            <option value="">All Municipalities</option>
            {municipalities.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div>
            <h2
              className="text-lg font-semibold text-[#181818] mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Overview: {geoLabel}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Total Properties" value={fmtNumber(summary.total_properties)} />
              <StatCard label="Median Assessed Value" value={fmtCurrency(summary.median_net_value)} />
              <StatCard label="Median Tax" value={fmtCurrency(summary.median_tax)} />
              <StatCard
                label="Avg Effective Tax Rate"
                value={fmtPercent(summary.effective_rate)}
              />
            </div>
          </div>

          {/* Property Classes */}
          {classItems.length > 0 && (
            <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
              <h3
                className="text-base font-semibold text-[#181818] mb-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Properties by Class
              </h3>
              <HorizontalBar
                items={classItems.map((c) => ({
                  label: c.label,
                  value: c.count,
                }))}
                maxValue={maxClassCount}
                colorFn={(i) => CLASS_COLORS[i % CLASS_COLORS.length]}
              />
            </div>
          )}

          {/* Land vs Improvement */}
          {summary.total_land_value != null && summary.total_improvement_value != null && (
            <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
              <h3
                className="text-base font-semibold text-[#181818] mb-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Land Value vs Improvement Value
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-8 flex rounded overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(summary.total_land_value / (summary.total_land_value + summary.total_improvement_value)) * 100}%`,
                        backgroundColor: COLORS.navy,
                      }}
                    />
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(summary.total_improvement_value / (summary.total_land_value + summary.total_improvement_value)) * 100}%`,
                        backgroundColor: COLORS.gold,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-6 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.navy }} />
                  <span className="text-[#53555A]">
                    Land: {fmtCurrency(summary.total_land_value)} (
                    {((summary.total_land_value / (summary.total_land_value + summary.total_improvement_value)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.gold }} />
                  <span className="text-[#53555A]">
                    Improvement: {fmtCurrency(summary.total_improvement_value)} (
                    {((summary.total_improvement_value / (summary.total_land_value + summary.total_improvement_value)) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Distribution Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
              <h3
                className="text-base font-semibold text-[#181818] mb-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Assessed Value Distribution
              </h3>
              <Histogram
                buckets={distData?.buckets ?? []}
                label="Net Assessed Value ($)"
                formatTick={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`}
              />
            </div>
            <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
              <h3
                className="text-base font-semibold text-[#181818] mb-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Tax Amount Distribution
              </h3>
              <Histogram
                buckets={taxDistData?.buckets ?? []}
                label="Calculated Tax ($)"
                formatTick={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`}
              />
            </div>
          </div>
        </>
      ) : selectedCounty ? (
        <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">No data found for the selected geography.</p>
        </div>
      ) : null}

      {/* Effective Tax Rates by County */}
      {ratesData?.rates && ratesData.rates.length > 0 && (
        <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
          <h2
            className="text-lg font-semibold text-[#181818] mb-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Effective Tax Rate by County
          </h2>
          <p className="text-xs text-[#53555A] mb-4">
            Effective rate = avg calculated tax / avg net assessed value. Higher rates indicate a heavier tax burden.
          </p>
          <EffectiveRatesTable rates={ratesData.rates} />
        </div>
      )}

      {/* Property Search */}
      <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
        <h2
          className="text-lg font-semibold text-[#181818] mb-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Property Search
        </h2>
        <p className="text-xs text-[#53555A] mb-3">
          Search for a specific property by street address.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. 12 HOOD AVE"
            className="h-9 flex-1 rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] placeholder:text-[#53555A]/50 focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searchQuery.length < 3}
            className="h-9 rounded-lg bg-[#DAAA00] px-4 text-sm font-medium text-white hover:bg-[#c49a00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>

        {searchLoading && (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {searchData && !searchLoading && (
          <div className="mt-4">
            {searchData.results.length > 0 ? (
              <>
                <p className="text-xs text-[#53555A] mb-3">
                  Found {searchData.total} matching {searchData.total === 1 ? "property" : "properties"}.
                </p>
                <div className="space-y-3">
                  {searchData.results.map((r, i) => (
                    <PropertyResult key={i} record={r} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#53555A] mt-3">No properties found matching that address.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
