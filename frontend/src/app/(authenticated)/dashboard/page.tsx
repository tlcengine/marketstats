"use client";

import React, { useCallback, useEffect, useMemo, useRef, lazy, Suspense, useState } from "react";
import { useMetric } from "@/components/providers/MetricProvider";
import { useDashboardStore } from "@/lib/store";
import MetricChart, { ChartSkeleton } from "@/components/charts/MetricChart";
import ChartControls from "@/components/charts/ChartControls";
import AreaSelector from "@/components/filters/AreaSelector";
import FilterSidebar from "@/components/filters/FilterSidebar";
import QuickFacts from "@/components/layout/QuickFacts";
import { useMetrics, useQuickFacts } from "@/lib/hooks";
import { generateMockMetricData, generateMockQuickFacts } from "@/lib/mock-data";
import { METRIC_LABELS } from "@/lib/constants";
import {
  exportChartAsPng,
  exportChartAsPdf,
  exportChartAsCsv,
  generateEmbedCode,
  copyCurrentLink,
} from "@/lib/chart-export";
import type { CsvRow } from "@/lib/chart-export";

// Lazy-load map to avoid SSR issues and reduce initial bundle
const AreaMap = lazy(() => import("@/components/maps/AreaMap"));

/**
 * Sync MetricProvider context (used by MetricBar) with Zustand store.
 */
function MetricSync() {
  const { activeMetric, setActiveMetric } = useMetric();
  const selectedMetric = useDashboardStore((s) => s.selectedMetric);
  const setSelectedMetric = useDashboardStore((s) => s.setSelectedMetric);

  useEffect(() => {
    if (activeMetric !== selectedMetric) {
      setSelectedMetric(activeMetric);
    }
  }, [activeMetric, selectedMetric, setSelectedMetric]);

  useEffect(() => {
    if (selectedMetric !== activeMetric) {
      setActiveMetric(selectedMetric);
    }
  }, [selectedMetric, activeMetric, setActiveMetric]);

  return null;
}

/**
 * Mobile filter toggle
 */
function MobileFilterToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 lg:hidden"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="14" y2="12" />
        <line x1="4" y1="18" x2="18" y2="18" />
      </svg>
      {open ? "Hide Filters" : "Show Filters"}
    </button>
  );
}

/**
 * InfoSparks-style dashboard layout:
 *   1. Area Tabs (horizontal colored tabs)
 *   2. Variable Filter Columns (horizontal scrollable)
 *   3. Chart Controls (right-aligned)
 *   4. Chart (~75%) + Quick Facts (~25%)
 *   5. Map (toggleable)
 *   6. MetricBar (fixed bottom, rendered by parent layout)
 */
export default function DashboardPage() {
  const { activeMetric } = useMetric();
  const areas = useDashboardStore((s) => s.areas);
  const chartType = useDashboardStore((s) => s.chartType);
  const years = useDashboardStore((s) => s.years);
  const rolling = useDashboardStore((s) => s.rolling);
  const statType = useDashboardStore((s) => s.statType);
  const legendVisible = useDashboardStore((s) => s.legendVisible);
  const mapVisible = useDashboardStore((s) => s.mapVisible);
  const drawMode = useDashboardStore((s) => s.drawMode);
  const toggleDrawMode = useDashboardStore((s) => s.toggleDrawMode);

  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [embedModalOpen, setEmbedModalOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Show a brief toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Check if any area has selections (including custom drawn areas)
  const hasAreas = areas.some(
    (a) => (a.state && a.geoValues.length > 0) || (a.geoType === "custom" && a.drawnShape)
  );

  // Build params for API hooks
  const metricsParams = useMemo(
    () =>
      areas
        .filter((a) => a.state && a.geoValues.length > 0)
        .map((a) => ({
          state: a.state,
          metric: activeMetric,
          geoType: a.geoType,
          geoValues: a.geoValues,
          years,
          statType,
        })),
    [areas, activeMetric, years, statType]
  );

  const quickFactsParams = useMemo(
    () =>
      areas
        .filter((a) => a.state && a.geoValues.length > 0)
        .map((a) => ({
          state: a.state,
          metric: activeMetric,
          geoType: a.geoType,
          geoValues: a.geoValues,
          statType,
        })),
    [areas, activeMetric, statType]
  );

  // Fetch real data from API (falls back to mock on error)
  const {
    data: apiChartData,
    isLoading: chartLoading,
  } = useMetrics(metricsParams);

  const {
    data: apiQuickFacts,
    isLoading: quickFactsLoading,
  } = useQuickFacts(quickFactsParams);

  // Generate mock demo data when no areas selected
  const demoChartData = useMemo(() => {
    if (hasAreas) return [];
    return generateMockMetricData(
      activeMetric,
      ["Demo Area"],
      ["demo_1"],
      years * 12
    );
  }, [activeMetric, hasAreas, years]);

  const demoQuickFacts = useMemo(() => {
    if (hasAreas) return [];
    return generateMockQuickFacts(demoChartData, ["Demo Area"], ["demo_1"]);
  }, [demoChartData, hasAreas]);

  // Use API data when areas are selected, mock data otherwise
  const chartData = hasAreas ? apiChartData : demoChartData;
  const quickFacts = hasAreas ? apiQuickFacts : demoQuickFacts;

  // Derive area names and IDs from the chart data
  const displayAreaNames = useMemo(() => {
    if (!hasAreas) return ["Demo Area"];
    const names = [...new Set(chartData.map((d) => d.areaName))];
    return names.length > 0
      ? names
      : areas
          .filter((a) => a.state && a.geoValues.length > 0)
          .map((a) => a.name || "Area");
  }, [areas, hasAreas, chartData]);

  const displayAreaIds = useMemo(() => {
    if (!hasAreas) return ["demo_1"];
    const ids = [...new Set(chartData.map((d) => d.areaId))];
    return ids.length > 0
      ? ids
      : areas
          .filter((a) => a.state && a.geoValues.length > 0)
          .map((a) => a.id);
  }, [areas, hasAreas, chartData]);

  const isLoading = hasAreas && chartLoading;

  // Build pivoted CSV data for export
  const csvPivoted: CsvRow[] = useMemo(() => {
    if (chartData.length === 0) return [];
    const byArea: Record<string, { month: string; value: number }[]> = {};
    for (const id of displayAreaIds) {
      byArea[id] = chartData
        .filter((d) => d.areaId === id)
        .sort((a, b) => a.month.localeCompare(b.month));
    }
    const nameMap: Record<string, string> = {};
    displayAreaIds.forEach((id, i) => { nameMap[id] = displayAreaNames[i]; });
    const monthSet = new Set<string>();
    for (const id of displayAreaIds) {
      for (const pt of byArea[id]) monthSet.add(pt.month);
    }
    return Array.from(monthSet).sort().map((month) => {
      const row: CsvRow = { month };
      for (const id of displayAreaIds) {
        const pt = byArea[id].find((p) => p.month === month);
        row[nameMap[id]] = pt?.value ?? null;
      }
      return row;
    });
  }, [chartData, displayAreaIds, displayAreaNames]);

  const metricLabel = METRIC_LABELS[activeMetric];

  // Chart export handler wired to ChartControls
  const handleExport = useCallback(
    async (type: string) => {
      switch (type) {
        case "png": {
          if (!chartRef.current) return;
          try {
            await exportChartAsPng(chartRef.current, `MarketStats-${metricLabel.replace(/\s+/g, "_")}`);
            showToast("PNG downloaded");
          } catch (err) {
            console.error("PNG export failed:", err);
            showToast("PNG export failed");
          }
          break;
        }
        case "pdf": {
          if (!chartRef.current) return;
          try {
            const areaSubtitle = displayAreaNames.join(" vs ");
            await exportChartAsPdf(chartRef.current, {
              filename: `MarketStats-${metricLabel.replace(/\s+/g, "_")}`,
              title: metricLabel,
              subtitle: areaSubtitle,
            });
            showToast("PDF downloaded");
          } catch (err) {
            console.error("PDF export failed:", err);
            showToast("PDF export failed");
          }
          break;
        }
        case "csv": {
          if (csvPivoted.length === 0) {
            showToast("No data to export");
            return;
          }
          exportChartAsCsv(csvPivoted, metricLabel);
          showToast("CSV downloaded");
          break;
        }
        case "embed": {
          setEmbedModalOpen(true);
          break;
        }
        case "link": {
          const ok = await copyCurrentLink();
          showToast(ok ? "Link copied to clipboard" : "Could not copy link");
          break;
        }
        default:
          console.log(`Unknown export type: ${type}`);
      }
    },
    [metricLabel, displayAreaNames, csvPivoted, showToast]
  );

  return (
    <>
      <MetricSync />

      <div className="flex flex-col pb-20">
        {/* ── 1. AREA TABS ── */}
        <div className="bg-white px-4 pt-3 lg:px-6">
          <AreaSelector />
        </div>

        {/* ── 2. FILTER COLUMNS (horizontal) ── */}
        <div className="border-b border-gray-100 bg-white px-4 lg:px-6">
          {/* Mobile toggle */}
          <div className="py-2 lg:hidden">
            <MobileFilterToggle
              open={mobileFiltersOpen}
              onToggle={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            />
          </div>

          {/* Filters - always visible on desktop, toggled on mobile */}
          <div
            className={`${
              mobileFiltersOpen ? "block" : "hidden"
            } lg:block`}
          >
            <FilterSidebar />
          </div>
        </div>

        {/* ── 3. CHART CONTROLS (right-aligned) ── */}
        <div className="border-b border-gray-100 bg-white px-4 lg:px-6">
          <ChartControls onExport={handleExport} />
        </div>

        {/* ── 4. CHART + QUICK FACTS ── */}
        <div className="flex flex-1 gap-0 bg-white">
          {/* Chart area (~75%) */}
          <div className="min-w-0 flex-1 px-4 py-4 lg:px-6">
            {isLoading ? (
              <ChartSkeleton />
            ) : chartData.length > 0 ? (
              <MetricChart
                ref={chartRef}
                data={chartData}
                metric={activeMetric}
                chartType={chartType}
                areaNames={displayAreaNames}
                areaIds={displayAreaIds}
                rolling={rolling}
                legendVisible={legendVisible}
                height={450}
              />
            ) : hasAreas ? (
              <div className="flex h-[450px] items-center justify-center rounded-lg bg-gray-50">
                <p className="text-sm text-gray-400">
                  No data available for the selected area and time range.
                </p>
              </div>
            ) : (
              <ChartSkeleton />
            )}

            {/* Info when no areas selected */}
            {!hasAreas && (
              <div className="mt-4 rounded-lg border border-dashed border-[#DAAA00]/40 bg-[#FAF9F7] px-4 py-3 text-center">
                <p className="text-xs text-gray-500">
                  Showing demo data. Select a state and geography in the
                  area tabs above to view real market analytics.
                </p>
              </div>
            )}

            {/* Error banner */}
            {hasAreas && !chartLoading && chartData.length === 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-red-300 bg-red-50 px-4 py-3 text-center">
                <p className="text-xs text-red-600">
                  Could not load data. The API may be unavailable. Check that
                  the backend is running at{" "}
                  {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}.
                </p>
              </div>
            )}
          </div>

          {/* Quick Facts panel (~25%) - desktop */}
          <div className="hidden w-[260px] shrink-0 border-l border-gray-100 bg-[#FAF9F7] p-4 xl:block">
            <QuickFacts
              facts={quickFacts}
              metric={activeMetric}
              loading={hasAreas && quickFactsLoading}
            />
          </div>
        </div>

        {/* Quick Facts - mobile (below chart) */}
        <div className="border-t border-gray-100 bg-[#FAF9F7] px-4 py-4 xl:hidden">
          <QuickFacts
            facts={quickFacts}
            metric={activeMetric}
            loading={hasAreas && quickFactsLoading}
          />
        </div>

        {/* ── 5. MAP (toggleable) ── */}
        {mapVisible && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 lg:px-6">
            <div className="mb-2 flex items-center justify-between">
              <h3
                className="text-sm font-semibold"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: "#181818",
                }}
              >
                Area Map
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleDrawMode}
                  className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    drawMode
                      ? "border-[#1a4b7f] bg-[#1a4b7f] text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                  aria-label="Toggle draw tools"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  {drawMode ? "Drawing On" : "Draw Area"}
                </button>
                <span className="text-[10px] text-gray-400">
                  Showing {areas.length} area{areas.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center rounded-lg border border-gray-200 bg-[#f0f4f8]"
                  style={{ height: 350 }}
                >
                  <p className="text-xs text-gray-400">Loading map...</p>
                </div>
              }
            >
              <AreaMap height={350} />
            </Suspense>
          </div>
        )}
      </div>

      {/* ── EMBED CODE MODAL ── */}
      {embedModalOpen && (
        <EmbedModal
          onClose={() => setEmbedModalOpen(false)}
          onCopy={() => showToast("Embed code copied")}
        />
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 animate-fade-in">
          <div
            className="rounded-lg border px-4 py-2 text-sm font-medium shadow-lg"
            style={{
              backgroundColor: "#181818",
              borderColor: "#DAAA00",
              color: "#ffffff",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}

// ── Embed Code Modal ──────────────────────────────────────────────────────────

function EmbedModal({
  onClose,
  onCopy,
}: {
  onClose: () => void;
  onCopy: () => void;
}) {
  const embedCode = generateEmbedCode(
    typeof window !== "undefined" ? window.location.href : ""
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      onCopy();
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
        onCopy();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-xl border bg-white p-6 shadow-2xl"
        style={{ borderColor: "#D9D8D6" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-base font-semibold"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "#181818",
            }}
          >
            Embed This Chart
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mb-3 text-xs text-gray-500" style={{ fontFamily: "Inter, sans-serif" }}>
          Copy the code below and paste it into your website or blog to embed
          this chart.
        </p>

        <textarea
          ref={textareaRef}
          readOnly
          value={embedCode}
          rows={6}
          className="w-full rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 focus:border-[#DAAA00] focus:outline-none focus:ring-1 focus:ring-[#DAAA00]"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className="rounded-md px-4 py-2 text-xs font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#DAAA00" }}
          >
            Copy Code
          </button>
        </div>
      </div>
    </div>
  );
}
