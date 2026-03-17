"use client";

import React from "react";
import { AREA_COLORS } from "@/lib/constants";
import type { MetricKey } from "@/lib/constants";
import { formatMetricValue, formatYoYChange, formatMonthFull } from "@/lib/format";
import type { QuickFactData } from "@/lib/types";

// ── Loading skeleton ──

export function QuickFactsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-lg bg-gray-50 p-3">
          <div className="mb-2 h-3 w-20 rounded bg-gray-200" />
          <div className="mb-1 h-6 w-28 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ── Single fact card ──

function FactCard({
  fact,
  metric,
  index,
}: {
  fact: QuickFactData;
  metric: MetricKey;
  index: number;
}) {
  const color = AREA_COLORS[index % AREA_COLORS.length];
  const valueStr = formatMetricValue(fact.latestValue, metric);
  const hasYoy = fact.yoyChange !== null;
  const yoyStr = hasYoy ? formatYoYChange(fact.yoyChange!) : null;
  const isPositive = hasYoy && fact.yoyChange! >= 0;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: "#FAF9F7",
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Area name */}
      <p
        className="mb-1 truncate text-[11px] font-medium uppercase tracking-wide"
        style={{ color: "#53555A" }}
      >
        {fact.areaName}
      </p>

      {/* Value */}
      <p
        className="text-xl font-bold leading-tight"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#181818",
        }}
      >
        {valueStr}
      </p>

      {/* YoY change */}
      {hasYoy && (
        <div className="mt-1 flex items-center gap-1">
          <span
            className={`text-xs font-semibold ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <svg
                className="mr-0.5 inline h-3 w-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            ) : (
              <svg
                className="mr-0.5 inline h-3 w-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 20l1.41-1.41L7.83 13H20v-2H7.83l5.58-5.59L12 4l-8 8z" />
              </svg>
            )}
            {yoyStr}
          </span>
          <span className="text-[10px] text-gray-400">YoY</span>
        </div>
      )}

      {/* Month label */}
      <p className="mt-1 text-[10px] text-gray-400">
        {formatMonthFull(fact.latestMonth)}
      </p>
    </div>
  );
}

// ── Main component ──

interface QuickFactsProps {
  facts: QuickFactData[];
  metric: MetricKey;
  loading?: boolean;
}

export default function QuickFacts({ facts, metric, loading }: QuickFactsProps) {
  if (loading) return <QuickFactsSkeleton />;

  return (
    <div>
      <p
        className="mb-3 border-b-2 pb-1 text-[11px] font-semibold uppercase tracking-wider"
        style={{
          color: "#181818",
          borderColor: "#DAAA00",
          fontFamily: "Inter, -apple-system, sans-serif",
          letterSpacing: "0.9px",
        }}
      >
        Quick Facts
      </p>

      <div className="flex flex-col gap-3">
        {facts.map((fact, idx) => (
          <FactCard key={fact.areaId} fact={fact} metric={metric} index={idx} />
        ))}

        {facts.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">
            Select an area to see quick facts
          </p>
        )}
      </div>
    </div>
  );
}
