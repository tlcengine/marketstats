"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useDashboardStore } from "@/lib/store";
import { AREA_COLORS, AREA_TAB_BG } from "@/lib/constants";
import type { GeoType, AreaConfig } from "@/lib/types";
import { useStates, useCounties, useCities, useZips } from "@/lib/hooks";

// ── Searchable geography dropdown ──

function GeoDropdown({
  area,
  index,
}: {
  area: AreaConfig;
  index: number;
}) {
  const updateArea = useDashboardStore((s) => s.updateArea);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  // Fetch states from API
  const { data: statesData, isLoading: statesLoading } = useStates();
  const states = useMemo(
    () => (statesData?.states ?? []).map((s) => s.value),
    [statesData]
  );

  // Fetch geo options from API for current state
  const { data: countiesData, isLoading: countiesLoading } = useCounties(
    area.state || undefined
  );
  const { data: citiesData, isLoading: citiesLoading } = useCities(
    area.state || undefined
  );
  const { data: zipsData, isLoading: zipsLoading } = useZips(
    area.state || undefined
  );

  const countyOptions = useMemo(
    () => (countiesData?.counties ?? []).map((c) => c.value),
    [countiesData]
  );
  const cityOptions = useMemo(
    () => (citiesData?.cities ?? []).map((c) => c.value),
    [citiesData]
  );
  const zipOptions = useMemo(
    () => (zipsData?.zips ?? []).map((z) => z.value),
    [zipsData]
  );

  const geoLoading = countiesLoading || citiesLoading || zipsLoading;

  // Build categorized options
  const allOptions = useMemo(
    () => [
      ...countyOptions.map((o) => ({
        label: o,
        value: o,
        category: "County",
        geoType: "county" as GeoType,
      })),
      ...cityOptions.map((o) => ({
        label: o,
        value: o,
        category: "City",
        geoType: "city" as GeoType,
      })),
      ...zipOptions.map((o) => ({
        label: o,
        value: o,
        category: "Zip Code",
        geoType: "zip" as GeoType,
      })),
    ],
    [countyOptions, cityOptions, zipOptions]
  );

  const filtered = search
    ? allOptions.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : allOptions;

  // Group by category
  const grouped: Record<string, typeof allOptions> = {};
  for (const opt of filtered) {
    if (!grouped[opt.category]) grouped[opt.category] = [];
    grouped[opt.category].push(opt);
  }

  const color = AREA_COLORS[index % AREA_COLORS.length];

  // Display name for the current selection
  const displayLabel =
    area.geoValues.length > 0
      ? area.geoValues.join(", ")
      : area.state
        ? "Select geography..."
        : "Entire MLS";

  const handleSelect = (opt: (typeof allOptions)[0]) => {
    updateArea(area.id, {
      geoType: opt.geoType,
      geoValues: [opt.value],
      name: opt.value,
    });
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} className="relative">
      {/* State selector (small) */}
      {!area.state && (
        <select
          value={area.state}
          onChange={(e) => {
            updateArea(area.id, {
              state: e.target.value,
              geoValues: [],
              name: index === 0 ? "Entire MLS" : `Area ${index + 1}`,
            });
          }}
          className="mb-1 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none focus:border-[#DAAA00]"
          disabled={statesLoading}
        >
          <option value="">
            {statesLoading ? "Loading states..." : "Select state first..."}
          </option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {area.state && (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs text-gray-700 hover:border-gray-300"
          >
            <span className="truncate">
              {geoLoading && allOptions.length === 0
                ? "Loading geographies..."
                : displayLabel}
            </span>
            <svg
              className={`ml-1 h-3 w-3 shrink-0 transform transition-transform ${open ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-64 overflow-auto rounded-md border border-gray-200 bg-white shadow-xl">
              {/* Search */}
              <div className="sticky top-0 border-b border-gray-100 bg-white p-2">
                <input
                  type="text"
                  placeholder="Search county, city, or zip..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#DAAA00]"
                  autoFocus
                />
                {/* State switcher */}
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">State:</span>
                  <select
                    value={area.state}
                    onChange={(e) => {
                      updateArea(area.id, {
                        state: e.target.value,
                        geoValues: [],
                      });
                    }}
                    className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 outline-none"
                    disabled={statesLoading}
                  >
                    {states.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* "Entire MLS" option */}
              <button
                onClick={() => {
                  updateArea(area.id, { geoValues: [], name: "Entire MLS" });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                Entire MLS
              </button>

              {/* Loading indicator */}
              {geoLoading && allOptions.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#1a4b7f]" />
                  <p className="mt-1 text-[10px] text-gray-400">
                    Loading geographies...
                  </p>
                </div>
              )}

              {/* Categorized options */}
              {Object.entries(grouped).map(([category, opts]) => (
                <div key={category}>
                  <div className="sticky top-[82px] bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {category}
                  </div>
                  {opts.map((opt) => (
                    <button
                      key={`${opt.category}-${opt.value}`}
                      onClick={() => handleSelect(opt)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${
                        area.geoValues.includes(opt.value)
                          ? "font-medium text-gray-900 bg-gray-50"
                          : "text-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ))}

              {!geoLoading && Object.keys(grouped).length === 0 && (
                <p className="px-3 py-3 text-xs text-gray-400">No results</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Area Tab ──

function AreaTab({
  area,
  index,
  isActive,
  onClick,
  canRemove,
}: {
  area: AreaConfig;
  index: number;
  isActive: boolean;
  onClick: () => void;
  canRemove: boolean;
}) {
  const removeArea = useDashboardStore((s) => s.removeArea);
  const color = AREA_COLORS[index % AREA_COLORS.length];
  // AREA_TAB_BG is imported but used only for reference; style via borderTopColor
  void AREA_TAB_BG;

  return (
    <div
      className={`relative flex min-w-[180px] max-w-[260px] cursor-pointer items-center gap-2 rounded-t-md border border-b-0 px-3 py-2 transition-colors ${
        isActive ? "z-10 -mb-px bg-white" : "bg-gray-50 hover:bg-gray-100"
      }`}
      style={{
        borderColor: isActive ? color : "#D9D8D6",
        borderTopWidth: 3,
        borderTopColor: color,
      }}
      onClick={onClick}
    >
      {/* Color dot */}
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Area name / dropdown */}
      <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
        <GeoDropdown area={area} index={index} />
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeArea(area.id);
          }}
          className="ml-1 shrink-0 rounded-full p-0.5 text-gray-300 transition-colors hover:bg-gray-200 hover:text-red-500"
          aria-label={`Remove ${area.name}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Main component ──

export default function AreaSelector() {
  const areas = useDashboardStore((s) => s.areas);
  const addArea = useDashboardStore((s) => s.addArea);
  const combineAreas = useDashboardStore((s) => s.combineAreas);
  const toggleCombineAreas = useDashboardStore((s) => s.toggleCombineAreas);
  const filtersVisible = useDashboardStore((s) => s.filtersVisible);
  const toggleFiltersVisible = useDashboardStore((s) => s.toggleFiltersVisible);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      {/* Tab row */}
      <div className="flex items-end gap-1 border-b border-[#D9D8D6]">
        {areas.map((area, idx) => (
          <AreaTab
            key={area.id}
            area={area}
            index={idx}
            isActive={idx === activeTab}
            onClick={() => setActiveTab(idx)}
            canRemove={areas.length > 1}
          />
        ))}

        {/* Add area link */}
        {areas.length < 4 && (
          <button
            onClick={() => {
              addArea();
              setActiveTab(areas.length);
            }}
            className="mb-0.5 flex items-center gap-1 whitespace-nowrap px-3 py-2 text-xs font-medium text-[#1a4b7f] transition-colors hover:text-[#DAAA00]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            ADD AN AREA
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Combine button */}
        {areas.length > 1 && (
          <button
            onClick={toggleCombineAreas}
            className={`mb-0.5 flex items-center gap-1 whitespace-nowrap rounded px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              combineAreas
                ? "bg-[#3d6b5e] text-white"
                : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
            title="Combine all selected areas into one dataset"
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
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
            Combine
          </button>
        )}

        {/* Filters toggle button */}
        <button
          onClick={toggleFiltersVisible}
          className={`mb-0.5 flex items-center gap-1 whitespace-nowrap rounded px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
            filtersVisible
              ? "bg-[#3d6b5e] text-white"
              : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          }`}
          title="Toggle filter panel visibility"
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
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
        </button>
      </div>
    </div>
  );
}
