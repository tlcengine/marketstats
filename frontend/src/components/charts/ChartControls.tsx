"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDashboardStore } from "@/lib/store";
import type { ChartType, YearRange, RollingWindow, StatType } from "@/lib/types";

// ── Toggle button group helper ──

interface ToggleOption<T> {
  label: string;
  value: T;
}

function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ToggleOption<T>[];
  value: T;
  onChange: (val: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
            value === opt.value
              ? "bg-[#1B2D4B] text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Share dropdown ──

function ShareDropdown({ onExport }: { onExport: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const items = [
    { label: "Copy Link", value: "link" },
    { label: "CSV Download", value: "csv" },
    { label: "PNG Download", value: "png" },
    { label: "PDF Report", value: "pdf" },
    { label: "Embed Code", value: "embed" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
        aria-label="Share or export"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                onExport(item.value);
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component: right-aligned chart controls bar ──

export default function ChartControls() {
  const chartType = useDashboardStore((s) => s.chartType);
  const setChartType = useDashboardStore((s) => s.setChartType);
  const years = useDashboardStore((s) => s.years);
  const setYears = useDashboardStore((s) => s.setYears);
  const rolling = useDashboardStore((s) => s.rolling);
  const setRolling = useDashboardStore((s) => s.setRolling);
  const statType = useDashboardStore((s) => s.statType);
  const setStatType = useDashboardStore((s) => s.setStatType);
  const legendVisible = useDashboardStore((s) => s.legendVisible);
  const toggleLegend = useDashboardStore((s) => s.toggleLegend);
  const mapVisible = useDashboardStore((s) => s.mapVisible);
  const toggleMap = useDashboardStore((s) => s.toggleMap);
  const selectedMetric = useDashboardStore((s) => s.selectedMetric);

  const handleExport = (type: string) => {
    console.log(`Export: ${type}`);
  };

  const showStatToggle =
    selectedMetric === "MedianSalesPrice" || selectedMetric === "AverageSalesPrice";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 py-2">
      {/* Chart type */}
      <ToggleGroup<ChartType>
        options={[
          { label: "Line", value: "line" },
          { label: "Bar", value: "bar" },
        ]}
        value={chartType}
        onChange={setChartType}
        ariaLabel="Chart type"
      />

      {/* Year range */}
      <ToggleGroup<YearRange>
        options={[
          { label: "1yr", value: 1 },
          { label: "3yr", value: 3 },
          { label: "5yr", value: 5 },
          { label: "Max", value: 20 },
        ]}
        value={years}
        onChange={setYears}
        ariaLabel="Time range"
      />

      {/* Rolling average */}
      <ToggleGroup<RollingWindow>
        options={[
          { label: "Monthly", value: 1 },
          { label: "3mo", value: 3 },
          { label: "6mo", value: 6 },
          { label: "12mo", value: 12 },
        ]}
        value={rolling}
        onChange={setRolling}
        ariaLabel="Rolling average"
      />

      {/* Median/Average toggle */}
      {showStatToggle && (
        <ToggleGroup<StatType>
          options={[
            { label: "Median", value: "median" },
            { label: "Average", value: "average" },
          ]}
          value={statType}
          onChange={setStatType}
          ariaLabel="Statistic type"
        />
      )}

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200" />

      {/* Map toggle */}
      <button
        onClick={toggleMap}
        className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
          mapVisible
            ? "border-[#1a4b7f] bg-[#1a4b7f] text-white"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        }`}
        aria-label="Toggle map"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        Map
      </button>

      {/* Legend toggle */}
      <button
        onClick={toggleLegend}
        className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
          legendVisible
            ? "border-[#1B2D4B] bg-[#1B2D4B] text-white"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        }`}
        aria-label="Toggle legend"
      >
        Legend
      </button>

      {/* Share */}
      <ShareDropdown onExport={handleExport} />

      {/* Print */}
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
        aria-label="Print"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Print
      </button>
    </div>
  );
}
