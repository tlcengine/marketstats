"use client";

import React, { useRef, useState, useEffect } from "react";
import { useDashboardStore } from "@/lib/store";
import type { BreakoutField } from "@/lib/types";

// ── Filter column header with breakout icon ──

function FilterColumnHeader({
  label,
  breakoutKey,
}: {
  label: string;
  breakoutKey: BreakoutField;
}) {
  const breakoutField = useDashboardStore((s) => s.breakoutField);
  const setBreakoutField = useDashboardStore((s) => s.setBreakoutField);

  const isActive = breakoutField === breakoutKey;

  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#181818]">
        {label}
      </span>
      {breakoutKey && (
        <button
          onClick={() => setBreakoutField(breakoutKey)}
          className={`rounded px-1 py-0.5 text-[11px] font-medium transition-colors ${
            isActive
              ? "bg-[#DAAA00] text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          title={`Break out chart by ${label}`}
          aria-label={`Break out by ${label}`}
        >
          &#8660;
        </button>
      )}
    </div>
  );
}

// ── Checkbox group (vertical) ──

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-xs text-gray-700 hover:bg-gray-50"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="h-3.5 w-3.5 rounded border-gray-300 accent-[#1B2D4B]"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

// ── Radio group (vertical) ──

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-xs text-gray-700 hover:bg-gray-50"
        >
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-3.5 w-3.5 accent-[#1B2D4B]"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ── Constants ──

const PRICE_PRESETS = [
  { label: "All Prices", min: 0, max: 999_999_999 },
  { label: "$209K or Less", min: 0, max: 208_999 },
  { label: "$209K - $289K", min: 209_000, max: 288_999 },
  { label: "$289K - $410K", min: 289_000, max: 409_999 },
  { label: "$410K - $600K", min: 410_000, max: 599_999 },
  { label: "$600K+", min: 600_000, max: 999_999_999 },
];

const PROPERTY_TYPES = [
  "Single Family",
  "Condo",
  "Townhouse",
  "Multi-Family",
];

const BEDROOM_OPTIONS = [
  { label: "All", value: "all" },
  { label: "1 or Fewer", value: "1" },
  { label: "2 BR", value: "2" },
  { label: "3 BR", value: "3" },
  { label: "4 BR", value: "4" },
  { label: "5+ BR", value: "5+" },
];

const CONSTRUCTION_OPTIONS = [
  { label: "All", value: "all" },
  { label: "New Construction", value: "new" },
  { label: "Existing / Resale", value: "existing" },
];

const SQFT_PRESETS = [
  { label: "All Sizes", min: 0, max: 999_999 },
  { label: "Under 1,000", min: 0, max: 999 },
  { label: "1,000 - 1,500", min: 1_000, max: 1_499 },
  { label: "1,500 - 2,000", min: 1_500, max: 1_999 },
  { label: "2,000 - 3,000", min: 2_000, max: 2_999 },
  { label: "3,000+", min: 3_000, max: 999_999 },
];

// ── Main component: horizontal filter columns ──

export default function FilterSidebar() {
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);
  const resetFilters = useDashboardStore((s) => s.resetFilters);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  return (
    <div className="relative">
      {/* Left scroll arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-1 shadow-sm hover:bg-gray-50"
          aria-label="Scroll filters left"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#53555A" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Right scroll arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-1 shadow-sm hover:bg-gray-50"
          aria-label="Scroll filters right"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#53555A" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Scrollable filter columns */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-0 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* PROPERTY TYPE */}
        <div className="min-w-[140px] shrink-0 border-r border-gray-100 px-3 py-2">
          <FilterColumnHeader label="Property Type" breakoutKey="propertyType" />
          <CheckboxGroup
            options={PROPERTY_TYPES}
            selected={filters.propertyTypes}
            onChange={(vals) => setFilters({ propertyTypes: vals })}
          />
        </div>

        {/* PRICE RANGE */}
        <div className="min-w-[150px] shrink-0 border-r border-gray-100 px-3 py-2">
          <FilterColumnHeader label="Price Range" breakoutKey="priceRange" />
          <div className="flex flex-col gap-0.5">
            {PRICE_PRESETS.map((preset) => {
              const isActive =
                filters.priceRange?.min === preset.min &&
                filters.priceRange?.max === preset.max;
              const isAll = preset.min === 0 && preset.max === 999_999_999;
              const isActiveAll = isAll && filters.priceRange === null;

              return (
                <label
                  key={preset.label}
                  className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="priceRange"
                    checked={isActive || isActiveAll}
                    onChange={() =>
                      setFilters({
                        priceRange: isAll
                          ? null
                          : { min: preset.min, max: preset.max },
                      })
                    }
                    className="h-3.5 w-3.5 accent-[#1B2D4B]"
                  />
                  {preset.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* CONSTRUCTION */}
        <div className="min-w-[140px] shrink-0 border-r border-gray-100 px-3 py-2">
          <FilterColumnHeader label="Construction" breakoutKey="yearBuilt" />
          <RadioGroup
            name="construction"
            options={CONSTRUCTION_OPTIONS}
            value={filters.construction}
            onChange={(val) =>
              setFilters({ construction: val as "all" | "new" | "existing" })
            }
          />
        </div>

        {/* BEDROOMS */}
        <div className="min-w-[120px] shrink-0 border-r border-gray-100 px-3 py-2">
          <FilterColumnHeader label="Bedrooms" breakoutKey="bedrooms" />
          <RadioGroup
            name="bedrooms"
            options={BEDROOM_OPTIONS}
            value={filters.bedrooms}
            onChange={(val) => setFilters({ bedrooms: val })}
          />
        </div>

        {/* SQ FOOTAGE */}
        <div className="min-w-[140px] shrink-0 px-3 py-2">
          <FilterColumnHeader label="Sq Footage" breakoutKey="sqft" />
          <div className="flex flex-col gap-0.5">
            {SQFT_PRESETS.map((preset) => {
              const isActive =
                filters.sqftRange?.min === preset.min &&
                filters.sqftRange?.max === preset.max;
              const isAll = preset.min === 0 && preset.max === 999_999;
              const isActiveAll = isAll && filters.sqftRange === null;

              return (
                <label
                  key={preset.label}
                  className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="sqft"
                    checked={isActive || isActiveAll}
                    onChange={() =>
                      setFilters({
                        sqftRange: isAll
                          ? null
                          : { min: preset.min, max: preset.max },
                      })
                    }
                    className="h-3.5 w-3.5 accent-[#1B2D4B]"
                  />
                  {preset.label}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reset link */}
      <div className="mt-1 flex justify-end px-3">
        <button
          onClick={resetFilters}
          className="text-[10px] font-medium text-gray-400 hover:text-[#DAAA00]"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
