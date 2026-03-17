"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import useSWR from "swr";
import {
  api,
  type ReportResponseAPI,
  type FeaturedCitiesResponseAPI,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Share2,
  Printer,
  Play,
  Pause,
  Volume2,
  Check,
  ChevronDown,
} from "lucide-react";

// ── City selector ──

function CitySelector({
  cities,
  selected,
  onSelect,
}: {
  cities: Array<{ city: string; state: string }>;
  selected: { city: string; state: string } | null;
  onSelect: (c: { city: string; state: string }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border-warm bg-white px-4 py-2.5 text-sm font-medium text-dark-gray shadow-sm transition-colors hover:bg-cream"
      >
        <span>{selected ? `${selected.city}, ${selected.state}` : "Select a city"}</span>
        <ChevronDown className="h-4 w-4 text-body-gray" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-border-warm bg-white py-1 shadow-lg">
          {cities.map((c) => (
            <button
              key={`${c.city}-${c.state}`}
              onClick={() => {
                onSelect(c);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-cream ${
                selected?.city === c.city ? "font-medium text-dark-gray" : "text-body-gray"
              }`}
            >
              {selected?.city === c.city && <Check className="h-3.5 w-3.5 text-gold" />}
              <span>{c.city}, {c.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──

function KPICard({
  label,
  value,
  change,
  direction,
}: {
  label: string;
  value: string;
  change: string | null;
  direction: string | null;
}) {
  const dirIcon =
    direction === "up" ? (
      <TrendingUp className="h-4 w-4 text-emerald-600" />
    ) : direction === "down" ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : (
      <Minus className="h-4 w-4 text-body-gray" />
    );

  const changeColor =
    direction === "up"
      ? "text-emerald-600"
      : direction === "down"
        ? "text-red-500"
        : "text-body-gray";

  return (
    <div className="rounded-xl border border-border-warm bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-body-gray">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-bold text-dark-gray">{value}</p>
      {change && change !== "N/A" && (
        <div className="mt-2 flex items-center gap-1.5">
          {dirIcon}
          <span className={`text-sm font-medium ${changeColor}`}>{change}</span>
          <span className="text-xs text-body-gray">YoY</span>
        </div>
      )}
    </div>
  );
}

// ── Simple bar chart (price trend) ──

function PriceTrendChart({
  data,
}: {
  data: Array<{ Month: string; "Sales Price": number }>;
}) {
  if (!data.length) return <EmptyChart label="No price data available" />;

  const values = data.map((d) => d["Sales Price"]);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  return (
    <div className="rounded-xl border border-border-warm bg-white p-5">
      <h3 className="mb-4 font-serif text-lg font-semibold text-dark-gray">
        Median Sales Price Trend
      </h3>
      <div className="flex items-end gap-1" style={{ height: 200 }}>
        {data.map((d, i) => {
          const pct = ((d["Sales Price"] - minVal) / range) * 80 + 20;
          const isLast = i === data.length - 1;
          return (
            <div
              key={d.Month}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-dark-gray px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {d.Month}: ${(d["Sales Price"] / 1000).toFixed(0)}K
              </div>
              <div
                className={`w-full rounded-t transition-colors ${
                  isLast ? "bg-gold" : "bg-gold/40"
                } group-hover:bg-gold`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-body-gray">
        <span>{data[0]?.Month}</span>
        <span>{data[data.length - 1]?.Month}</span>
      </div>
    </div>
  );
}

// ── Price distribution chart ──

function PriceDistributionChart({
  data,
}: {
  data: Array<{ range: string; count: number }>;
}) {
  if (!data.length) return <EmptyChart label="No distribution data" />;

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="rounded-xl border border-border-warm bg-white p-5">
      <h3 className="mb-4 font-serif text-lg font-semibold text-dark-gray">
        Price Distribution
      </h3>
      <div className="space-y-2">
        {data.map((d) => {
          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          return (
            <div key={d.range} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-right text-xs text-body-gray">
                {d.range}
              </span>
              <div className="flex-1">
                <div
                  className="h-5 rounded bg-gold/60 transition-all hover:bg-gold"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium text-dark-gray">
                {d.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty chart placeholder ──

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border-warm bg-cream">
      <p className="text-sm text-body-gray">{label}</p>
    </div>
  );
}

// ── Recent sales table ──

function RecentSalesTable({
  sales,
}: {
  sales: Array<{
    address: string;
    close_price: number | null;
    list_price: number | null;
    close_date: string | null;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    dom: number | null;
  }>;
}) {
  if (!sales.length) return null;

  const fmtPrice = (v: number | null) => {
    if (v == null) return "--";
    return `$${(v / 1000).toFixed(0)}K`;
  };

  return (
    <div className="rounded-xl border border-border-warm bg-white">
      <div className="border-b border-border-warm px-5 py-4">
        <h3 className="font-serif text-lg font-semibold text-dark-gray">
          Recent Sales
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body-gray">
                Address
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body-gray">
                Close Price
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body-gray md:table-cell">
                List Price
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body-gray sm:table-cell">
                Date
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body-gray lg:table-cell">
                Beds
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body-gray lg:table-cell">
                Baths
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body-gray lg:table-cell">
                Sq Ft
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-body-gray md:table-cell">
                DOM
              </th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s, i) => (
              <tr
                key={i}
                className="border-b border-border-warm/50 transition-colors hover:bg-cream/50"
              >
                <td className="px-4 py-3 font-medium text-dark-gray">
                  {s.address}
                </td>
                <td className="px-4 py-3 font-medium text-dark-gray">
                  {fmtPrice(s.close_price)}
                </td>
                <td className="hidden px-4 py-3 text-body-gray md:table-cell">
                  {fmtPrice(s.list_price)}
                </td>
                <td className="hidden px-4 py-3 text-body-gray sm:table-cell">
                  {s.close_date ?? "--"}
                </td>
                <td className="hidden px-4 py-3 text-body-gray lg:table-cell">
                  {s.beds ?? "--"}
                </td>
                <td className="hidden px-4 py-3 text-body-gray lg:table-cell">
                  {s.baths ?? "--"}
                </td>
                <td className="hidden px-4 py-3 text-body-gray lg:table-cell">
                  {s.sqft ? s.sqft.toLocaleString() : "--"}
                </td>
                <td className="hidden px-4 py-3 text-body-gray md:table-cell">
                  {s.dom ?? "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Audio player ──

function PodcastPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => setError(true));
    }
    setPlaying(!playing);
  }, [playing]);

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-border-warm bg-cream p-4 text-center text-sm text-body-gray">
        Podcast audio is not available for this city.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-warm bg-white p-5">
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-white shadow-md transition-transform hover:scale-105"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-body-gray" />
            <span className="text-sm font-medium text-dark-gray">Market Report Podcast</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-warm">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
        onError={() => setError(true)}
        preload="none"
      />
    </div>
  );
}

// ── Narrative renderer ──

function Narrative({ text }: { text: string }) {
  // Convert **bold** markdown to <strong>
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-dark-gray">$1</strong>')
    .replace(/\n\n/g, '</p><p class="mt-4 text-body-gray leading-relaxed text-[15px]">');

  return (
    <div className="rounded-xl border border-border-warm bg-white p-6">
      <p
        className="text-body-gray leading-relaxed text-[15px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ── Loading skeleton ──

function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-2/3 rounded bg-border-warm" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-border-warm/50" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-border-warm/50" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-52 rounded-xl bg-border-warm/50" />
        <div className="h-52 rounded-xl bg-border-warm/50" />
      </div>
    </div>
  );
}

// ── Main page ──

export default function MarketReportPage() {
  const [selectedCity, setSelectedCity] = useState<{
    city: string;
    state: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch featured cities
  const { data: citiesData } = useSWR(
    "report/featured-cities",
    () => api.getFeaturedCities(),
    { revalidateOnFocus: false }
  );

  const cities = citiesData?.cities ?? [];

  // Auto-select first city
  React.useEffect(() => {
    if (!selectedCity && cities.length > 0) {
      setSelectedCity(cities[0]);
    }
  }, [cities, selectedCity]);

  // Fetch report data
  const { data: report, isLoading, error } = useSWR(
    selectedCity
      ? `report/${selectedCity.city}/${selectedCity.state}`
      : null,
    () => api.getReport(selectedCity!.city, selectedCity!.state),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="print:p-0">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-dark-gray">
            Market Report
          </h1>
          <p className="mt-1 text-sm text-body-gray">
            LinkedIn newsletter-style narrative market analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CitySelector
            cities={cities}
            selected={selectedCity}
            onSelect={setSelectedCity}
          />
          <div className="hidden gap-2 sm:flex print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Share"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading && <ReportSkeleton />}

      {error && !isLoading && (
        <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">
            Could not load report data. The API may be unavailable.
          </p>
        </div>
      )}

      {report && !isLoading && (
        <div className="space-y-6">
          {/* Date banner */}
          <div className="flex items-center gap-3 rounded-lg bg-cream px-4 py-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-gold" />
            <span className="text-xs text-body-gray">
              Report generated {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-body-gray">|</span>
            <span className="text-xs text-body-gray">
              Data through {report.data_through}
            </span>
          </div>

          {/* Headline */}
          <h2 className="font-serif text-3xl font-bold leading-tight text-dark-gray lg:text-4xl">
            {report.headline}
          </h2>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {report.kpis.map((kpi) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                change={kpi.change}
                direction={kpi.direction}
              />
            ))}
          </div>

          {/* Narrative */}
          <Narrative text={report.narrative} />

          {/* Podcast */}
          <PodcastPlayer url={report.podcast_url} />

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PriceTrendChart data={report.charts.sales_price} />
            <PriceDistributionChart data={report.price_distribution} />
          </div>

          {/* Recent sales */}
          <RecentSalesTable sales={report.recent_sales} />

          {/* Footer */}
          <div className="rounded-lg border-t-2 border-gold bg-cream px-6 py-4 text-center print:break-before-avoid">
            <p className="font-serif text-sm font-medium text-dark-gray">
              MarketStats by CertiHomes
            </p>
            <p className="mt-1 text-xs text-body-gray">
              Data sourced from CJMLS/FMLS. For informational purposes only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
