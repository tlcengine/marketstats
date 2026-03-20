"use client";

import { useMetric } from "@/components/providers/MetricProvider";
import { METRICS, METRIC_SHORT, type MetricKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ROW_1: MetricKey[] = [
  "MedianSalesPrice",
  "NewListings",
  "Inventory",
  "PendingSales",
  "ClosedSales",
  "DaysOnMarket",
  "MonthsSupply",
];

const ROW_2: MetricKey[] = [
  "PctOfListPrice",
  "PricePerSqFt",
  "DollarVolume",
  "AbsorptionRate",
  "AverageSalesPrice",
  "ListToSaleRatio",
  "ShowsToPending",
  "ShowsPerListing",
];

function MetricButton({
  metric,
  isActive,
  onClick,
}: {
  metric: MetricKey;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
        "hover:bg-cream/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold",
        isActive
          ? "bg-cream text-dark-gray border-b-2 border-gold"
          : "text-white/80 hover:text-white border-b-2 border-transparent"
      )}
    >
      {METRIC_SHORT[metric]}
    </button>
  );
}

export function MetricBar() {
  const { activeMetric, setActiveMetric } = useMetric();

  // Validate that all metrics in constants are covered
  const allCovered = METRICS.every(
    (m) => ROW_1.includes(m) || ROW_2.includes(m)
  );
  if (!allCovered && process.env.NODE_ENV === "development") {
    console.warn("MetricBar: not all METRICS are assigned to a row");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-gray">
      {/* Row 1 */}
      <div className="flex items-center justify-center gap-1 px-2 py-1 overflow-x-auto">
        {ROW_1.map((metric) => (
          <MetricButton
            key={metric}
            metric={metric}
            isActive={activeMetric === metric}
            onClick={() => setActiveMetric(metric)}
          />
        ))}
      </div>

      {/* Gold divider */}
      <div className="gold-divider" />

      {/* Row 2 */}
      <div className="flex items-center justify-center gap-1 px-2 py-1 overflow-x-auto">
        {ROW_2.map((metric) => (
          <MetricButton
            key={metric}
            metric={metric}
            isActive={activeMetric === metric}
            onClick={() => setActiveMetric(metric)}
          />
        ))}
      </div>
    </div>
  );
}
