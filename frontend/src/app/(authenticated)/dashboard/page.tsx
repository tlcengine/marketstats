"use client";

import React, { useEffect, useMemo, lazy, Suspense } from "react";
import { useMetric } from "@/components/providers/MetricProvider";
import { useDashboardStore } from "@/lib/store";
import MetricChart, { ChartSkeleton } from "@/components/charts/MetricChart";
import ChartControls from "@/components/charts/ChartControls";
import AreaSelector from "@/components/filters/AreaSelector";
import FilterSidebar from "@/components/filters/FilterSidebar";
import QuickFacts from "@/components/layout/QuickFacts";
import { useMetrics, useQuickFacts } from "@/lib/hooks";
import { generateMockMetricData, generateMockQuickFacts } from "@/lib/mock-data";

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

  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  // Check if any area has selections
  const hasAreas = areas.some((a) => a.state && a.geoValues.length > 0);

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
          <ChartControls />
        </div>

        {/* ── 4. CHART + QUICK FACTS ── */}
        <div className="flex flex-1 gap-0 bg-white">
          {/* Chart area (~75%) */}
          <div className="min-w-0 flex-1 px-4 py-4 lg:px-6">
            {isLoading ? (
              <ChartSkeleton />
            ) : chartData.length > 0 ? (
              <MetricChart
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
              <span className="text-[10px] text-gray-400">
                Showing {areas.length} area{areas.length !== 1 ? "s" : ""}
              </span>
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
    </>
  );
}
