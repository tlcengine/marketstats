"use client";

import { useMetric } from "@/components/providers/MetricProvider";
import { useDashboardStore } from "@/lib/store";
import {
  METRICS,
  METRIC_SHORT,
  METRICS_WITH_MA_TOGGLE,
  type MetricKey,
} from "@/lib/constants";
import type { StatType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** All metrics in a single flat list for the scrollable bar */
const ALL_METRICS: MetricKey[] = [...METRICS];

function MetricButton({
  metric,
  isActive,
  onClick,
  hasToggle,
  currentStatType,
  onStatTypeChange,
}: {
  metric: MetricKey;
  isActive: boolean;
  onClick: () => void;
  hasToggle: boolean;
  currentStatType: StatType;
  onStatTypeChange: (type: StatType) => void;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center px-2.5 py-1.5 transition-colors duration-150 cursor-pointer",
        "hover:bg-white/10",
        isActive
          ? "bg-white/15 border-b-2 border-[#DAAA00]"
          : "border-b-2 border-transparent"
      )}
      onClick={onClick}
    >
      {/* Metric name */}
      <span
        className={cn(
          "text-[11px] font-semibold whitespace-nowrap leading-tight",
          isActive ? "text-white" : "text-white/70"
        )}
      >
        {METRIC_SHORT[metric]}
      </span>

      {/* M/A sub-toggle buttons (only for metrics that support it) */}
      {hasToggle && (
        <div className="mt-1 flex gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatTypeChange("median");
              onClick();
            }}
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none transition-colors",
              currentStatType === "median"
                ? "bg-[#DAAA00] text-[#1a2e1a]"
                : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80"
            )}
          >
            Median
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatTypeChange("average");
              onClick();
            }}
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none transition-colors",
              currentStatType === "average"
                ? "bg-[#DAAA00] text-[#1a2e1a]"
                : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80"
            )}
          >
            Average
          </button>
        </div>
      )}
    </div>
  );
}

export function MetricBar() {
  const { activeMetric, setActiveMetric } = useMetric();
  const perMetricStatType = useDashboardStore((s) => s.perMetricStatType);
  const setPerMetricStatType = useDashboardStore(
    (s) => s.setPerMetricStatType
  );
  const statType = useDashboardStore((s) => s.statType);
  const setStatType = useDashboardStore((s) => s.setStatType);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ backgroundColor: "#3d6b5e" }}
    >
      {/* Single horizontal scrollable row */}
      <div
        className="flex items-stretch overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {ALL_METRICS.map((metric) => {
          const hasToggle = METRICS_WITH_MA_TOGGLE.includes(metric);
          // Use per-metric stat type if set, otherwise fall back to global
          const currentStat = hasToggle
            ? perMetricStatType[metric] ?? statType
            : statType;

          return (
            <MetricButton
              key={metric}
              metric={metric}
              isActive={activeMetric === metric}
              onClick={() => setActiveMetric(metric)}
              hasToggle={hasToggle}
              currentStatType={currentStat}
              onStatTypeChange={(type) => {
                setPerMetricStatType(metric, type);
                // Also update the global stat type so the API call uses it
                setStatType(type);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
