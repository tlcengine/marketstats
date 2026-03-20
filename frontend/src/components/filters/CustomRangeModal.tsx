"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDashboardStore } from "@/lib/store";
import type { CustomRangeRow } from "@/lib/types";

// ── Presets for the dropdown ──

const PRICE_RANGE_PRESETS: { label: string; rows: CustomRangeRow[] }[] = [
  {
    label: "Default Quartiles",
    rows: [
      { min: "", max: "208999" },
      { min: "209000", max: "288999" },
      { min: "289000", max: "409999" },
      { min: "410000", max: "599999" },
      { min: "600000", max: "" },
    ],
  },
  {
    label: "Luxury Tiers",
    rows: [
      { min: "", max: "499999" },
      { min: "500000", max: "749999" },
      { min: "750000", max: "999999" },
      { min: "1000000", max: "1999999" },
      { min: "2000000", max: "" },
    ],
  },
];

const SQFT_RANGE_PRESETS: { label: string; rows: CustomRangeRow[] }[] = [
  {
    label: "Default Sizes",
    rows: [
      { min: "", max: "999" },
      { min: "1000", max: "1499" },
      { min: "1500", max: "1999" },
      { min: "2000", max: "2999" },
      { min: "3000", max: "" },
    ],
  },
  {
    label: "Large Home Tiers",
    rows: [
      { min: "", max: "1999" },
      { min: "2000", max: "2999" },
      { min: "3000", max: "3999" },
      { min: "4000", max: "5999" },
      { min: "6000", max: "" },
    ],
  },
];

// ── Helpers ──

function formatRangeLabel(min: string, max: string, type: "price" | "sqft"): string {
  const prefix = type === "price" ? "$" : "";
  const suffix = type === "sqft" ? " sqft" : "";

  const fmtNum = (n: string) => {
    const num = parseInt(n, 10);
    if (isNaN(num)) return "";
    if (type === "price" && num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (type === "price" && num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    if (type === "price") return `$${num.toLocaleString()}`;
    return `${num.toLocaleString()}${suffix}`;
  };

  if (!min && !max) return "All";
  if (!min) return `${fmtNum(max)} or Less`;
  if (!max) return `${fmtNum(min)}+`;
  return `${fmtNum(min)} - ${fmtNum(max)}`;
}

const EMPTY_ROW: CustomRangeRow = { min: "", max: "" };

// ── Component ──

interface CustomRangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "price" | "sqft";
}

export default function CustomRangeModal({ open, onOpenChange, type }: CustomRangeModalProps) {
  const customRanges = useDashboardStore((s) => s.customRanges);
  const setCustomRanges = useDashboardStore((s) => s.setCustomRanges);
  const setFilters = useDashboardStore((s) => s.setFilters);

  const presets = type === "price" ? PRICE_RANGE_PRESETS : SQFT_RANGE_PRESETS;
  const storeKey = type === "price" ? "price" : "sqft";

  // Local editing state — initialized from store
  const [rows, setRows] = useState<CustomRangeRow[]>(() => {
    const existing = customRanges[storeKey];
    if (existing.length > 0) return [...existing];
    return presets[0].rows.map((r) => ({ ...r }));
  });

  // Reset local state when dialog opens
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        const existing = customRanges[storeKey];
        if (existing.length > 0) {
          setRows(existing.map((r) => ({ ...r })));
        } else {
          setRows(presets[0].rows.map((r) => ({ ...r })));
        }
      }
      onOpenChange(nextOpen);
    },
    [customRanges, storeKey, presets, onOpenChange]
  );

  const updateRow = (idx: number, field: "min" | "max", value: string) => {
    // Only allow digits
    const cleaned = value.replace(/[^0-9]/g, "");
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: cleaned };
      return next;
    });
  };

  const addRow = () => {
    if (rows.length >= 8) return;
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePreset = (presetIdx: number) => {
    setRows(presets[presetIdx].rows.map((r) => ({ ...r })));
  };

  const handleClear = () => {
    setRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  };

  const handleDone = () => {
    // Filter out completely empty rows
    const validRows = rows.filter((r) => r.min !== "" || r.max !== "");
    setCustomRanges({ [storeKey]: validRows });

    // If rows were set, also clear the preset filter so custom takes effect
    if (validRows.length > 0) {
      if (type === "price") {
        setFilters({ priceRange: null });
      } else {
        setFilters({ sqftRange: null });
      }
    }

    onOpenChange(false);
  };

  const title = type === "price" ? "Custom Price Ranges" : "Custom Sq Footage Ranges";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wider">
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Preset dropdown */}
        <div className="mb-3">
          <label className="mb-1 block text-xs text-gray-500">Load preset:</label>
          <select
            className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
            onChange={(e) => handlePreset(parseInt(e.target.value, 10))}
            defaultValue=""
          >
            <option value="" disabled>
              Select a preset...
            </option>
            {presets.map((p, i) => (
              <option key={i} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Editable rows */}
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={row.min}
                onChange={(e) => updateRow(idx, "min", e.target.value)}
                placeholder="Min"
                className="w-24 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-[#DAAA00] focus:outline-none focus:ring-1 focus:ring-[#DAAA00]"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="text"
                inputMode="numeric"
                value={row.max}
                onChange={(e) => updateRow(idx, "max", e.target.value)}
                placeholder="Max"
                className="w-24 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-[#DAAA00] focus:outline-none focus:ring-1 focus:ring-[#DAAA00]"
              />
              <span className="min-w-[80px] text-[10px] text-gray-400">
                {formatRangeLabel(row.min, row.max, type)}
              </span>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(idx)}
                  className="text-gray-300 hover:text-red-400"
                  title="Remove row"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add row */}
        {rows.length < 8 && (
          <button
            onClick={addRow}
            className="mt-1 text-xs font-medium text-[#1B2D4B] hover:text-[#DAAA00]"
          >
            + Add range
          </button>
        )}

        {/* Hint */}
        <p className="mt-2 text-[10px] italic text-gray-400">
          Leave start or end blank to represent positive or negative infinity.
        </p>

        <DialogFooter className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={handleClear}
            className="text-xs font-medium text-gray-400 hover:text-[#DAAA00]"
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDone}
              className="rounded bg-[#1B2D4B] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#162440]"
            >
              Done
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
