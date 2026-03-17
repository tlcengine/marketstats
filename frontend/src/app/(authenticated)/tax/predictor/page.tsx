"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import {
  api,
  type TaxPredictionAPI,
  type ComparablePropertyAPI,
} from "@/lib/api";
import { COLORS } from "@/lib/constants";

// ── Helpers ──

function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// ── Stat Card ──

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent
          ? "border-[#DAAA00]/40 bg-[#DAAA00]/5"
          : "border-[#D9D8D6] bg-white"
      }`}
    >
      <p className="text-xs font-medium text-[#53555A] uppercase tracking-wide">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold text-[#181818]"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[#53555A]">{sub}</p>}
    </div>
  );
}

// ── Confidence Badge ──

function ConfidenceBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    high: { color: "text-green-700", bg: "bg-green-50 border-green-200", label: "High Confidence" },
    medium: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", label: "Medium Confidence" },
    low: { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Low Confidence" },
  };
  const c = config[level] || config.low;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.color}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          level === "high" ? "bg-green-500" : level === "medium" ? "bg-yellow-500" : "bg-red-500"
        }`}
      />
      {c.label}
    </span>
  );
}

// ── Comparable Table ──

function ComparableTable({ comparables }: { comparables: ComparablePropertyAPI[] }) {
  if (!comparables.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#D9D8D6]">
            <th className="text-left py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">
              Address
            </th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">
              Assessed Value
            </th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">
              Tax
            </th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">
              Eff. Rate
            </th>
            <th className="text-right py-2 px-2 text-xs font-semibold text-[#53555A] uppercase">
              Year Built
            </th>
          </tr>
        </thead>
        <tbody>
          {comparables.map((c, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-[#FAF9F7]" : "bg-white"}
            >
              <td className="py-1.5 px-2 text-[#181818]">
                <div className="font-medium">{c.address || "N/A"}</div>
                {c.city && (
                  <div className="text-xs text-[#53555A]">{c.city}</div>
                )}
              </td>
              <td className="py-1.5 px-2 text-right text-[#181818]">
                {fmtCurrency(c.net_value)}
              </td>
              <td className="py-1.5 px-2 text-right text-[#181818]">
                ${c.calculated_tax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-1.5 px-2 text-right text-[#53555A]">
                {c.effective_rate.toFixed(2)}%
              </td>
              <td className="py-1.5 px-2 text-right text-[#53555A]">
                {c.year_constructed || "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Visual Range Indicator ──

function RangeIndicator({
  low,
  predicted,
  high,
}: {
  low: number;
  predicted: number;
  high: number;
}) {
  const range = high - low;
  const pct = range > 0 ? ((predicted - low) / range) * 100 : 50;

  return (
    <div className="mt-2">
      <div className="relative h-4 w-full rounded-full bg-gradient-to-r from-green-100 via-[#DAAA00]/20 to-red-100 overflow-hidden">
        <div
          className="absolute top-0 h-full w-1 bg-[#181818] rounded"
          style={{ left: `${Math.min(Math.max(pct, 2), 98)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-[#53555A]">
        <span>{fmtCurrency(low)}</span>
        <span className="font-semibold text-[#181818]">{fmtCurrency(predicted)}</span>
        <span>{fmtCurrency(high)}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════

const PROPERTY_CLASSES = [
  { value: "2", label: "Residential" },
  { value: "1", label: "Vacant Land" },
  { value: "4A", label: "Commercial" },
  { value: "4B", label: "Industrial" },
  { value: "4C", label: "Apartment (5+)" },
];

export default function TaxPredictorPage() {
  // Form state
  const [county, setCounty] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [propertyClass, setPropertyClass] = useState("2");
  const [currentValue, setCurrentValue] = useState<string>("");
  const [yearBuilt, setYearBuilt] = useState<string>("");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [sqft, setSqft] = useState<string>("");
  const [lotSize, setLotSize] = useState<string>("");

  // Prediction state
  const [prediction, setPrediction] = useState<TaxPredictionAPI | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch counties
  const { data: countiesData } = useSWR("tax/counties", () => api.getTaxCounties(), {
    revalidateOnFocus: false,
  });
  const counties = countiesData?.counties ?? [];

  useEffect(() => {
    if (counties.length > 0 && !county) {
      setCounty(counties[0]);
    }
  }, [counties, county]);

  // Fetch municipalities
  const { data: munisData } = useSWR(
    county ? `tax/municipalities/${county}` : null,
    () => api.getTaxMunicipalities(county),
    { revalidateOnFocus: false }
  );
  const municipalities = munisData?.municipalities ?? [];

  // Submit prediction
  const handlePredict = async () => {
    if (!county) return;
    setPredicting(true);
    setError(null);
    setPrediction(null);

    try {
      const result = await api.predictTax({
        county,
        municipality: municipality || undefined,
        property_class: propertyClass,
        current_value: currentValue ? parseFloat(currentValue) : undefined,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        sqft: sqft ? parseFloat(sqft) : undefined,
        year_built: yearBuilt ? parseInt(yearBuilt) : undefined,
        lot_size: lotSize ? parseFloat(lotSize) : undefined,
      });
      setPrediction(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate prediction"
      );
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[#181818]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Property Tax Predictor
        </h1>
        <p className="mt-1 text-sm text-[#53555A]">
          Estimate property taxes based on comparable properties in your area.
          Enter property details to get a tax prediction with confidence intervals.
        </p>
      </div>

      {/* Input Form */}
      <div className="rounded-lg border border-[#D9D8D6] bg-white p-6">
        <h2
          className="text-base font-semibold text-[#181818] mb-4"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Property Details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* County */}
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              County *
            </label>
            <select
              value={county}
              onChange={(e) => {
                setCounty(e.target.value);
                setMunicipality("");
                setPrediction(null);
              }}
              className="h-9 w-full rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
            >
              <option value="">Select County</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/\b\w/g, (ch) => ch.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Municipality */}
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Municipality
            </label>
            <select
              value={municipality}
              onChange={(e) => {
                setMunicipality(e.target.value);
                setPrediction(null);
              }}
              className="h-9 w-full rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
            >
              <option value="">All Municipalities</option>
              {municipalities.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Property Class */}
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Property Class
            </label>
            <select
              value={propertyClass}
              onChange={(e) => setPropertyClass(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
            >
              {PROPERTY_CLASSES.map((pc) => (
                <option key={pc.value} value={pc.value}>
                  {pc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current Value */}
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Current Assessed Value ($)
            </label>
            <input
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="e.g. 350000"
              className="h-9 w-full rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] placeholder:text-[#53555A]/50 focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
            />
            <p className="mt-0.5 text-[10px] text-[#53555A]">
              Leave blank to use area median
            </p>
          </div>

          {/* Year Built */}
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Year Built
            </label>
            <input
              type="number"
              value={yearBuilt}
              onChange={(e) => setYearBuilt(e.target.value)}
              placeholder="e.g. 1985"
              min="1700"
              max="2026"
              className="h-9 w-full rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] placeholder:text-[#53555A]/50 focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
            />
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Bedrooms
            </label>
            <input
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="e.g. 3"
              min="0"
              max="20"
              className="h-9 w-full rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] placeholder:text-[#53555A]/50 focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
            />
          </div>

          {/* Sq Ft */}
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Square Footage
            </label>
            <input
              type="number"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              placeholder="e.g. 2000"
              min="0"
              className="h-9 w-full rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] placeholder:text-[#53555A]/50 focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
            />
          </div>

          {/* Lot Size */}
          <div>
            <label className="block text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
              Lot Size (acres)
            </label>
            <input
              type="number"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              placeholder="e.g. 0.25"
              min="0"
              step="0.01"
              className="h-9 w-full rounded-lg border border-[#D9D8D6] bg-white px-3 text-sm text-[#181818] placeholder:text-[#53555A]/50 focus:border-[#DAAA00] focus:ring-1 focus:ring-[#DAAA00] outline-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            onClick={handlePredict}
            disabled={!county || predicting}
            className="h-10 rounded-lg bg-[#DAAA00] px-6 text-sm font-semibold text-white hover:bg-[#c49a00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {predicting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analyzing...
              </span>
            ) : (
              "Get Tax Prediction"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {prediction && (
        <div className="space-y-6">
          {/* Prediction Summary */}
          <div className="rounded-lg border border-[#DAAA00]/30 bg-[#DAAA00]/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold text-[#181818]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Tax Prediction Results
              </h2>
              <ConfidenceBadge level={prediction.confidence} />
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label="Predicted Annual Tax"
                value={`$${prediction.predicted_tax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                accent
              />
              <StatCard
                label="Assessed Value"
                value={fmtCurrency(prediction.predicted_assessment)}
              />
              <StatCard
                label="Effective Tax Rate"
                value={`${prediction.effective_rate.toFixed(2)}%`}
              />
              <StatCard
                label="Comparables Used"
                value={prediction.comparable_count.toString()}
                sub={`${prediction.confidence} confidence`}
              />
            </div>

            {/* Range */}
            <div className="mt-6">
              <p className="text-xs font-medium text-[#53555A] uppercase tracking-wide mb-1">
                Tax Estimate Range
              </p>
              <RangeIndicator
                low={prediction.low_estimate}
                predicted={prediction.predicted_tax}
                high={prediction.high_estimate}
              />
            </div>
          </div>

          {/* Area Comparison */}
          <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
            <h3
              className="text-base font-semibold text-[#181818] mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Area Comparison
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-[#53555A] uppercase">Your Predicted Tax</p>
                <p className="text-lg font-semibold text-[#181818]">
                  ${prediction.predicted_tax.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#53555A] uppercase">Area Median Tax</p>
                <p className="text-lg font-semibold text-[#181818]">
                  {fmtCurrency(prediction.median_area_tax)}
                </p>
                {prediction.predicted_tax !== prediction.median_area_tax && (
                  <p className="text-xs text-[#53555A]">
                    {prediction.predicted_tax > prediction.median_area_tax
                      ? `${(((prediction.predicted_tax - prediction.median_area_tax) / prediction.median_area_tax) * 100).toFixed(1)}% above median`
                      : `${(((prediction.median_area_tax - prediction.predicted_tax) / prediction.median_area_tax) * 100).toFixed(1)}% below median`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#53555A] uppercase">Area Median Value</p>
                <p className="text-lg font-semibold text-[#181818]">
                  {fmtCurrency(prediction.median_area_value)}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
            <h3
              className="text-base font-semibold text-[#181818] mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Payment Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-[#FAF9F7] p-3 text-center">
                <p className="text-[10px] text-[#53555A] uppercase">Annual</p>
                <p className="text-lg font-semibold text-[#181818]">
                  ${prediction.predicted_tax.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-lg bg-[#FAF9F7] p-3 text-center">
                <p className="text-[10px] text-[#53555A] uppercase">Quarterly</p>
                <p className="text-lg font-semibold text-[#181818]">
                  ${(prediction.predicted_tax / 4).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-lg bg-[#FAF9F7] p-3 text-center">
                <p className="text-[10px] text-[#53555A] uppercase">Monthly</p>
                <p className="text-lg font-semibold text-[#181818]">
                  ${(prediction.predicted_tax / 12).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Comparables */}
          {prediction.comparables.length > 0 && (
            <div className="rounded-lg border border-[#D9D8D6] bg-white p-5">
              <h3
                className="text-base font-semibold text-[#181818] mb-3"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Comparable Properties
              </h3>
              <p className="text-xs text-[#53555A] mb-3">
                Sampled from {prediction.comparable_count} comparable properties
                in the area.
              </p>
              <ComparableTable comparables={prediction.comparables} />
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-lg border border-dashed border-[#D9D8D6] bg-[#FAF9F7] p-4">
            <p className="text-[11px] text-[#53555A] leading-relaxed">
              <strong>Disclaimer:</strong> This tax prediction is an estimate based on
              comparable properties in the NJ tax assessment database. Actual tax
              amounts may vary based on exemptions, abatements, revaluations, and
              other factors. This tool is for informational purposes only and should
              not be used as a substitute for professional tax advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
