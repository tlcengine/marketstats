"use client";

import React from "react";
import { AREA_COLORS } from "@/lib/constants";
import type { MetricKey } from "@/lib/constants";
import { formatMetricValue, formatYoYChange, formatMonthFull } from "@/lib/format";
import type { QuickFactData } from "@/lib/types";

// -- Loading skeleton --

export function QuickFactsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded bg-gray-100 p-3">
          <div className="mb-2 h-3 w-16 rounded bg-gray-200" />
          <div className="mb-1 h-5 w-24 rounded bg-gray-200" />
          <div className="h-3 w-14 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// -- Single callout card with left-pointing arrow --

function CalloutCard({
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
  const monthLabel = fact.latestMonth
    ? formatMonthFull(fact.latestMonth + "-01")
    : "";

  return (
    <div className="relative flex items-stretch">
      {/* Left-pointing arrow indicator */}
      <div className="flex items-center">
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "10px solid transparent",
            borderBottom: "10px solid transparent",
            borderRight: `10px solid ${color}`,
          }}
        />
      </div>

      {/* Callout body */}
      <div
        className="flex-1 rounded-r-md px-3 py-2"
        style={{
          backgroundColor: color,
          minWidth: 0,
        }}
      >
        {/* Month label */}
        {monthLabel && (
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/60">
            {monthLabel}
          </p>
        )}

        {/* Area name */}
        <p className="truncate text-[10px] font-semibold text-white/80">
          {fact.areaName}
        </p>

        {/* Value + YoY row */}
        <div className="mt-0.5 flex items-baseline gap-2">
          <span
            className="text-lg font-bold leading-tight text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {valueStr}
          </span>

          {hasYoy && (
            <span
              className={`text-[11px] font-semibold ${
                isPositive ? "text-green-200" : "text-red-200"
              }`}
            >
              {isPositive ? "\u2191" : "\u2193"} {yoyStr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Main component --

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

      <div className="flex flex-col gap-2.5">
        {facts.map((fact, idx) => (
          <CalloutCard
            key={fact.areaId}
            fact={fact}
            metric={metric}
            index={idx}
          />
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
