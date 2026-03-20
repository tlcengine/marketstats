"use client";

import React, { useRef, useState, useEffect } from "react";
import { useDashboardStore } from "@/lib/store";
import type { BreakoutField } from "@/lib/types";
import CustomRangeModal from "./CustomRangeModal";

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
  { label: "All Price Ranges", min: 0, max: 999_999_999 },
  { label: "$188,999 or Less", min: 0, max: 188_999 },
  { label: "$189,000 to $333,999", min: 189_000, max: 333_999 },
  { label: "$334,000 to $464,999", min: 334_000, max: 464_999 },
  { label: "$465,000 or More", min: 465_000, max: 999_999_999 },
];

const PROPERTY_TYPES = [
  "Single Family Residence",
  "Condo/TH",
  "Townhouse",
  "Stock Cooperative",
  "Mobile Home",
];

const BEDROOM_OPTIONS = [
  { label: "All Bedrooms", value: "all" },
  { label: "1 Bedroom or Fewer", value: "1" },
  { label: "2 Bedrooms", value: "2" },
  { label: "3 Bedrooms", value: "3" },
  { label: "4 Bedrooms or More", value: "4+" },
];

const BATHROOM_OPTIONS = [
  { label: "All Bathrooms", value: "all" },
  { label: "1 Bathroom or Fewer", value: "1" },
  { label: "2 Bathrooms", value: "2" },
  { label: "3 Bathrooms", value: "3" },
  { label: "4 Bathrooms or More", value: "4+" },
];

const CONSTRUCTION_OPTIONS = [
  { label: "All Construction Types", value: "all" },
  { label: "Previously Owned", value: "existing" },
  { label: "New Construction", value: "new" },
];

const SQFT_PRESETS = [
  { label: "All Sizes", min: 0, max: 999_999 },
  { label: "1,500 sq ft or Less", min: 0, max: 1_500 },
  { label: "1,501 to 2,000 sq ft", min: 1_501, max: 2_000 },
  { label: "2,001 to 3,000 sq ft", min: 2_001, max: 3_000 },
  { label: "3,001 sq ft or More", min: 3_001, max: 999_999 },
];

// ── Main component: horizontal filter columns ──

export default function FilterSidebar() {
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);
  const resetFilters = useDashboardStore((s) => s.resetFilters);
  const customRanges = useDashboardStore((s) => s.customRanges);

  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [sqftModalOpen, setSqftModalOpen] = useState(false);

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
          <FilterColumnHeader label={`Property Type (${filters.propertyTypes.length}/${PROPERTY_TYPES.length})`} breakoutKey="propertyType" />
          <CheckboxGroup
            options={PROPERTY_TYPES}
            selected={filters.propertyTypes}
            onChange={(vals) => setFilters({ propertyTypes: vals })}
          />
        </div>

        {/* PRICE RANGE */}
        <div className="min-w-[150px] shrink-0 border-r border-gray-100 px-3 py-2">
          <div className="mb-2 flex items-center gap-1.5">
            <FilterColumnHeader label="Price Range" breakoutKey="priceRange" />
            <button
              onClick={() => setPriceModalOpen(true)}
              className="ml-auto text-[10px] font-semibold uppercase text-[#DAAA00] hover:text-[#b88f00]"
            >
              Custom
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {PRICE_PRESETS.map((preset) => {
              const isActive =
                filters.priceRange?.min === preset.min &&
                filters.priceRange?.max === preset.max;
              const isAll = preset.min === 0 && preset.max === 999_999_999;
              const isActiveAll = isAll && filters.priceRange === null && customRanges.price.length === 0;

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
            {/* Show custom ranges indicator */}
            {customRanges.price.length > 0 && (
              <div className="mt-1 rounded bg-amber-50 px-1.5 py-1 text-[10px] text-amber-700">
                {customRanges.price.length} custom range{customRanges.price.length > 1 ? "s" : ""} active
              </div>
            )}
          </div>
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
        <div className="min-w-[140px] shrink-0 border-r border-gray-100 px-3 py-2">
          <div className="mb-2 flex items-center gap-1.5">
            <FilterColumnHeader label="Sq Footage" breakoutKey="sqft" />
            <button
              onClick={() => setSqftModalOpen(true)}
              className="ml-auto text-[10px] font-semibold uppercase text-[#DAAA00] hover:text-[#b88f00]"
            >
              Custom
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {SQFT_PRESETS.map((preset) => {
              const isActive =
                filters.sqftRange?.min === preset.min &&
                filters.sqftRange?.max === preset.max;
              const isAll = preset.min === 0 && preset.max === 999_999;
              const isActiveAll = isAll && filters.sqftRange === null && customRanges.sqft.length === 0;

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
            {/* Show custom ranges indicator */}
            {customRanges.sqft.length > 0 && (
              <div className="mt-1 rounded bg-amber-50 px-1.5 py-1 text-[10px] text-amber-700">
                {customRanges.sqft.length} custom range{customRanges.sqft.length > 1 ? "s" : ""} active
              </div>
            )}
          </div>
        </div>

        {/* BATHROOMS */}
        <div className="min-w-[150px] shrink-0 border-r border-gray-100 px-3 py-2">
          <FilterColumnHeader label="Bathrooms" breakoutKey="bathrooms" />
          <RadioGroup
            name="bathrooms"
            options={BATHROOM_OPTIONS}
            value={filters.bathrooms}
            onChange={(val) => setFilters({ bathrooms: val })}
          />
        </div>

        {/* CONSTRUCTION */}
        <div className="min-w-[140px] shrink-0 px-3 py-2">
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

      {/* Custom range modals */}
      <CustomRangeModal open={priceModalOpen} onOpenChange={setPriceModalOpen} type="price" />
      <CustomRangeModal open={sqftModalOpen} onOpenChange={setSqftModalOpen} type="sqft" />
    </div>
  );
}
