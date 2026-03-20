"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  api,
  type ReportResponseAPI,
  type MonthlyDataAPI,
  type YearlyDataAPI,
} from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Pause,
  Volume2,
  ChevronDown,
  Search,
  HelpCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

// ── Theme constants ──

const NAVY = "#1B2D4B";
const GOLD = "#DAAA00";
const CREAM = "#FAF9F7";
const DARK = "#181818";
const BODY = "#3A3A3A";
const META = "#8A9BB5";
const BORDER = "#D9D8D6";

// ── Tooltip definitions ──

const TERM_TOOLTIPS: Record<string, string> = {
  "YoY": "Year-over-Year: Compares the current period to the same period one year ago",
  "Trailing 12 Months": "The most recent 12-month period ending with the latest available data month (e.g., March 2025 through February 2026)",
  "SP/LP Ratio": "Sale Price to List Price Ratio: The percentage of the asking price that sellers actually received",
  "DOM": "Days on Market: The number of days from listing to contract",
  "Months Supply": "Months of Supply: How long it would take to sell all current inventory at the current sales pace. Under 6 months favors sellers, over 6 favors buyers",
  "Active Listings": "Properties currently available for sale",
  "Pending Sales": "Properties under contract but not yet closed",
  "Avg Days on Market": "Days on Market: The average number of days from listing to contract",
  "Dollar Volume": "The total dollar value of all closed transactions in the period",
  "Highest Sale": "The highest individual sale price recorded in the period",
  "Median Price": "The middle sale price when all sales are ranked from lowest to highest. Half sold for more, half for less",
  "Closed Sales": "The number of transactions that closed (settled) during the period",
  "Avg DOM": "Average Days on Market: The average number of days from listing to contract",
  "Avg Price": "The arithmetic mean of all sale prices in the period",
  "Median Price (table)": "The middle sale price when all sales are ranked from lowest to highest",
};

// ── Tooltip "?" icon component ──

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex cursor-help align-middle">
      <HelpCircle className="h-3 w-3 text-gray-400 transition-colors group-hover:text-gray-600" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-normal rounded bg-[#1B2D4B] px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        style={{ width: "max-content", maxWidth: 260 }}
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1B2D4B]" />
      </span>
    </span>
  );
}

// ── Helper to get tooltip for a KPI label ──

function getKPITooltip(label: string): string | null {
  if (TERM_TOOLTIPS[label]) return TERM_TOOLTIPS[label];
  // Fuzzy match for common labels
  const lower = label.toLowerCase();
  if (lower.includes("sp/lp") || lower.includes("sale price to list")) return TERM_TOOLTIPS["SP/LP Ratio"];
  if (lower.includes("dom") || lower.includes("days on market")) return TERM_TOOLTIPS["DOM"];
  if (lower.includes("months supply") || lower.includes("month supply")) return TERM_TOOLTIPS["Months Supply"];
  if (lower.includes("active listing")) return TERM_TOOLTIPS["Active Listings"];
  if (lower.includes("pending")) return TERM_TOOLTIPS["Pending Sales"];
  if (lower.includes("dollar volume")) return TERM_TOOLTIPS["Dollar Volume"];
  if (lower.includes("highest sale")) return TERM_TOOLTIPS["Highest Sale"];
  if (lower.includes("median")) return TERM_TOOLTIPS["Median Price"];
  if (lower.includes("closed sale")) return TERM_TOOLTIPS["Closed Sales"];
  return null;
}

const PRICE_SEGMENTS: Record<string, number> = {
  "All Prices": 0,
  "$500K+": 500_000,
  "$750K+": 750_000,
  "$1M+": 1_000_000,
  "$1.5M+": 1_500_000,
  "$2M+": 2_000_000,
};

// ── SVG icons for share buttons ──

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

// ── Share bar component ──

function ShareBar({
  share,
  centered = false,
}: {
  share: ReportResponseAPI["share"];
  centered?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${centered ? "justify-center" : ""}`}>
      <a
        href={share.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-white transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-md"
        style={{ background: NAVY }}
      >
        <LinkedInIcon /> LinkedIn
      </a>
      <a
        href={share.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-white transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-md"
        style={{ background: NAVY }}
      >
        <TwitterIcon /> Twitter/X
      </a>
      <a
        href={share.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-white transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-md"
        style={{ background: NAVY }}
      >
        <FacebookIcon /> Facebook
      </a>
      <a
        href={share.email}
        className="inline-flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-white transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-md"
        style={{ background: "#53555A" }}
      >
        <EmailIcon /> Email
      </a>
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

  const tooltip = getKPITooltip(label);

  return (
    <div className="rounded-none border border-[#D9D8D6] bg-white p-4 shadow-sm">
      <p
        className="flex items-center text-[0.65rem] font-semibold uppercase tracking-widest"
        style={{ color: META, fontFamily: "'Inter', sans-serif" }}
      >
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </p>
      <p
        className="mt-1.5 text-xl font-bold"
        style={{ color: DARK, fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {value}
      </p>
      {change && change !== "N/A" && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {dirIcon}
          <span className={`text-xs font-medium ${changeColor}`}>{change}</span>
          <span className="text-[0.65rem]" style={{ color: META }}>
            YoY
            <InfoTooltip text={TERM_TOOLTIPS["YoY"]} />
          </span>
        </div>
      )}
    </div>
  );
}

// ── Podcast player with brewing animation ──

function PodcastPlayer({
  podcastUrl,
  generateText,
}: {
  podcastUrl: string;
  generateText: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "brewing" | "ready" | "error">("idle");
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const PODCASTFY_URL = "https://podcastfy.certihomes.com";

  // Check cache on mount
  useEffect(() => {
    const checkCache = async () => {
      try {
        const resp = await fetch(`${PODCASTFY_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: generateText,
            tts_model: "edge",
            roles_person1: "Host",
            roles_person2: "Market Analyst",
            word_count: 1500,
          }),
        });
        const result = await resp.json();
        if (result.status === "completed" && result.audio_url) {
          setAudioSrc(`${PODCASTFY_URL}${result.audio_url}`);
          setStatus("ready");
        } else if (result.job_id) {
          jobIdRef.current = result.job_id;
          setStatus("brewing");
        }
      } catch {
        // Podcast service not available, stay idle
      }
    };
    checkCache();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [generateText]);

  // Poll for brewing status
  useEffect(() => {
    if (status !== "brewing" || !jobIdRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`${PODCASTFY_URL}/status/${jobIdRef.current}`);
        const data = await resp.json();
        if (data.status === "completed" && data.audio_url) {
          setAudioSrc(`${PODCASTFY_URL}${data.audio_url}`);
          setStatus("ready");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "failed") {
          setStatus("error");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // keep polling
      }
    }, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status]);

  const handleGenerate = async () => {
    setStatus("brewing");
    try {
      const resp = await fetch(`${PODCASTFY_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: generateText,
          tts_model: "edge",
          roles_person1: "Host",
          roles_person2: "Market Analyst",
          word_count: 1500,
        }),
      });
      const result = await resp.json();
      if (result.status === "completed" && result.audio_url) {
        setAudioSrc(`${PODCASTFY_URL}${result.audio_url}`);
        setStatus("ready");
      } else if (result.job_id) {
        jobIdRef.current = result.job_id;
      }
    } catch {
      setStatus("error");
    }
  };

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => setStatus("error"));
    }
    setPlaying(!playing);
  }, [playing]);

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  // Brewing animation
  if (status === "brewing") {
    return (
      <div className="flex flex-col items-center py-6">
        <style>{`
          @keyframes pourCoffee { 0% { height: 0%; } 80% { height: 75%; } 100% { height: 75%; } }
          @keyframes steam { 0% { opacity: 0; transform: translateY(0) scaleX(1); } 50% { opacity: 0.6; transform: translateY(-12px) scaleX(1.2); } 100% { opacity: 0; transform: translateY(-24px) scaleX(0.8); } }
        `}</style>
        <div className="flex gap-1.5">
          {[0, 0.4, 0.8].map((delay) => (
            <span
              key={delay}
              className="inline-block h-4 w-2 rounded-full border border-gray-400"
              style={{ animation: `steam 2s ease-in-out ${delay}s infinite` }}
            />
          ))}
        </div>
        <div className="relative mt-1 inline-block">
          <div
            className="relative h-14 w-16 overflow-hidden border-b-[3px] border-l-[3px] border-r-[3px]"
            style={{
              borderColor: GOLD,
              borderRadius: "0 0 12px 12px",
              background: "#FAF8F5",
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                background: `linear-gradient(180deg, #E5C33A 0%, ${GOLD} 100%)`,
                animation: "pourCoffee 4s ease-in-out infinite",
              }}
            />
          </div>
          <div
            className="absolute right-[-14px] top-[10px] h-6 w-3.5 border-b-[3px] border-r-[3px] border-t-[3px]"
            style={{
              borderColor: GOLD,
              borderRadius: "0 8px 8px 0",
              borderLeft: "none",
            }}
          />
        </div>
        <p
          className="mt-2.5 text-[15px] font-semibold tracking-wide"
          style={{ color: NAVY, fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Podcast Brewing...
        </p>
        <p className="mt-1 text-xs" style={{ color: META }}>
          Refresh in a minute to check progress.
        </p>
      </div>
    );
  }

  // Ready state - audio player
  if (status === "ready" && audioSrc) {
    return (
      <div className="border border-[#D9D8D6] bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={GOLD}>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
            <span
              className="text-[13px] font-semibold tracking-wide"
              style={{ color: DARK, fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Podcast
            </span>
          </div>
          <button
            onClick={toggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105"
            style={{ background: GOLD }}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: BORDER }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: GOLD }}
              />
            </div>
          </div>
        </div>
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => setPlaying(false)}
          onError={() => setStatus("error")}
          preload="none"
        />
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="border border-[#D9D8D6] p-4 text-center text-sm" style={{ background: CREAM, color: META }}>
        Podcast audio is not available for this city.
      </div>
    );
  }

  // Idle - generate button
  return (
    <div className="border border-[#D9D8D6] bg-white p-4">
      <button
        onClick={handleGenerate}
        className="inline-flex items-center gap-2 rounded-none px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ background: NAVY }}
      >
        <Volume2 className="h-4 w-4" />
        Generate Podcast
      </button>
    </div>
  );
}

// ── Narrative HTML renderer ──

function NarrativeSection({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className}
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontSize: "0.95rem",
        lineHeight: 1.75,
        color: BODY,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── Section title ──

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2.5 mt-4 border-b-2 pb-1.5 text-[0.95rem] font-semibold uppercase tracking-[1.5px]"
      style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        color: DARK,
        borderColor: GOLD,
      }}
    >
      {children}
    </p>
  );
}

// ── Divider ──

function Divider() {
  return <hr className="my-4 border-t" style={{ borderColor: BORDER }} />;
}

// ── Dollar formatter for charts ──

function fmtDollar(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function fmtDollarFull(val: number): string {
  return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ── Chart tabs ──

function ChartTabs({
  monthly,
  yearly,
}: {
  monthly: MonthlyDataAPI[];
  yearly: YearlyDataAPI[];
}) {
  const [tab, setTab] = useState<"monthly" | "avgmed" | "annual">("monthly");

  const tabStyle = (active: boolean) => ({
    background: active ? NAVY : "transparent",
    color: active ? "white" : BODY,
    borderColor: active ? NAVY : BORDER,
  });

  return (
    <div>
      <div className="mb-4 flex gap-1">
        {[
          { key: "monthly" as const, label: "Monthly Sales & Price" },
          { key: "avgmed" as const, label: "Avg vs Median Price" },
          { key: "annual" as const, label: "Annual Summary" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="border px-3 py-1.5 text-xs font-medium transition-colors"
            style={tabStyle(tab === key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "monthly" && monthly.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              label={{ value: "Closed Sales", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={fmtDollar}
              tick={{ fontSize: 11 }}
              label={{ value: "Avg Price ($)", angle: 90, position: "insideRight", style: { fontSize: 11 } }}
            />
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                const v = Number(value);
                const n = String(name);
                return n === "avg_price" || n === "total_volume" ? fmtDollarFull(v) : v.toLocaleString();
              }}
              labelFormatter={(label: unknown) => `Month: ${String(label)}`}
            />
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill={NAVY}
              name="Closed Sales"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avg_price"
              stroke={GOLD}
              strokeWidth={2}
              dot={{ fill: GOLD, r: 3 }}
              name="Avg Price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {tab === "avgmed" && monthly.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tickFormatter={fmtDollar} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: unknown) => fmtDollarFull(Number(value))}
              labelFormatter={(label: unknown) => `Month: ${String(label)}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avg_price"
              stroke={NAVY}
              strokeWidth={2.5}
              dot
              name="Average"
            />
            <Line
              type="monotone"
              dataKey="median_price"
              stroke={GOLD}
              strokeWidth={2.5}
              dot
              name="Median"
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {tab === "annual" && yearly.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={yearly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                const v = Number(value);
                const n = String(name);
                return n === "avg_price" || n === "total_volume" || n === "max_price"
                  ? fmtDollarFull(v)
                  : v.toLocaleString();
              }}
            />
            <Bar
              dataKey="sales"
              fill="#283593"
              name="Closed Sales"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Year-over-Year table ──

function YearlyTable({ data }: { data: YearlyDataAPI[] }) {
  if (!data.length) return null;
  return (
    <div className="overflow-x-auto border border-[#D9D8D6]">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: CREAM }}>
            {["Year", "Sales", "Avg Price", "Median Price", "Total Volume", "Avg DOM", "Max Sale"].map(
              (h) => {
                const headerTooltips: Record<string, string> = {
                  "Avg DOM": TERM_TOOLTIPS["Avg DOM"],
                  "Total Volume": TERM_TOOLTIPS["Dollar Volume"],
                };
                return (
                  <th
                    key={h}
                    className="border-b border-[#D9D8D6] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: META }}
                  >
                    <span className="inline-flex items-center">
                      {h}
                      {headerTooltips[h] && <InfoTooltip text={headerTooltips[h]} />}
                    </span>
                  </th>
                );
              }
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.year} className="border-b border-[#D9D8D6]/50 transition-colors hover:bg-[#FAF9F7]/50">
              <td className="px-3 py-2 font-medium" style={{ color: DARK }}>{row.year}</td>
              <td className="px-3 py-2" style={{ color: DARK }}>{row.sales.toLocaleString()}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{fmtDollarFull(row.avg_price)}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{fmtDollarFull(row.median_price)}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{fmtDollarFull(row.total_volume)}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{row.avg_dom.toFixed(0)}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{fmtDollarFull(row.max_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Recent notable sales table ──

function RecentSalesTable({
  sales,
}: {
  sales: ReportResponseAPI["recent_sales"];
}) {
  if (!sales.length) return null;

  const fmtPrice = (v: number | null) => {
    if (v == null) return "\u2014";
    return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="overflow-x-auto border border-[#D9D8D6]">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: CREAM }}>
            {["Address", "Sale Price", "List Price", "Close Date", "Beds", "Baths", "Sq Ft", "DOM"].map(
              (h) => (
                <th
                  key={h}
                  className="border-b border-[#D9D8D6] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: META }}
                >
                  <span className="inline-flex items-center">
                    {h}
                    {h === "DOM" && <InfoTooltip text={TERM_TOOLTIPS["DOM"]} />}
                  </span>
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {sales.map((s, i) => (
            <tr key={i} className="border-b border-[#D9D8D6]/50 transition-colors hover:bg-[#FAF9F7]/50">
              <td className="px-3 py-2 font-medium" style={{ color: DARK }}>{s.address}</td>
              <td className="px-3 py-2 font-medium" style={{ color: DARK }}>{fmtPrice(s.close_price)}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{fmtPrice(s.list_price)}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{s.close_date ?? "\u2014"}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{s.beds ?? "\u2014"}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{s.baths ?? "\u2014"}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{s.sqft ? s.sqft.toLocaleString() : "\u2014"}</td>
              <td className="px-3 py-2" style={{ color: BODY }}>{s.dom ?? "\u2014"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Price distribution histogram ──

function PriceDistributionChart({
  data,
}: {
  data: ReportResponseAPI["price_distribution"];
}) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 9 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill={NAVY} name="Number of Sales" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── City search/select sidebar ──

function CitySearchSelect({
  cities,
  selected,
  onSelect,
}: {
  cities: string[];
  selected: string;
  onSelect: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return cities;
    const lower = search.toLowerCase();
    return cities.filter((c) => c.toLowerCase().includes(lower));
  }, [cities, search]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 border bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-[#FAF9F7]"
        style={{ borderColor: BORDER, color: DARK }}
      >
        <span>{selected || "Select a city"}</span>
        <ChevronDown className="h-4 w-4" style={{ color: META }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full overflow-y-auto border bg-white shadow-lg"
          style={{ borderColor: BORDER }}
        >
          <div className="sticky top-0 border-b bg-white p-2" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2 border px-2 py-1" style={{ borderColor: BORDER }}>
              <Search className="h-3.5 w-3.5" style={{ color: META }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search cities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-none bg-transparent text-sm outline-none"
                style={{ color: DARK }}
              />
            </div>
          </div>
          {filtered.map((c) => (
            <button
              key={c}
              onClick={() => {
                onSelect(c);
                setOpen(false);
                setSearch("");
              }}
              className="flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-[#FAF9F7]"
              style={{ color: selected === c ? DARK : BODY, fontWeight: selected === c ? 600 : 400 }}
            >
              {c}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm" style={{ color: META }}>No cities found</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ──

function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-6" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="h-32 rounded bg-[#D9D8D6]" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded bg-[#D9D8D6]/50" />
        ))}
      </div>
      <div className="h-60 rounded bg-[#D9D8D6]/50" />
      <div className="h-40 rounded bg-[#D9D8D6]/50" />
    </div>
  );
}

// ── Main page ──

export default function MarketReportPage() {
  const [selectedCity, setSelectedCity] = useState("Edison");
  const [priceLabel, setPriceLabel] = useState("All Prices");

  // Fetch featured cities
  const { data: citiesData } = useSWR("report/featured-cities", () => api.getFeaturedCities(), {
    revalidateOnFocus: false,
  });
  const featured = citiesData?.cities ?? [];

  // Fetch all cities for sidebar selector
  const { data: allCitiesData } = useSWR("report/cities", () => api.getReportCities(), {
    revalidateOnFocus: false,
  });
  const allCities = allCitiesData?.cities ?? [];

  const minPrice = PRICE_SEGMENTS[priceLabel] ?? 0;

  // Fetch report data
  const {
    data: report,
    isLoading,
    error,
  } = useSWR(
    `report/${selectedCity}/${minPrice}/${priceLabel}`,
    () => api.getReport(selectedCity, "", minPrice, priceLabel),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  return (
    <div className="print:p-0">
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
      `}</style>

      {/* ── Featured city toggle buttons ── */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {featured.map((fc) => {
          const isActive = selectedCity === fc.city;
          return (
            <button
              key={fc.city}
              onClick={() => {
                setSelectedCity(fc.city);
                setPriceLabel("All Prices");
              }}
              className="border py-2.5 text-center text-sm font-semibold uppercase tracking-wider transition-all"
              style={{
                background: isActive ? NAVY : "white",
                color: isActive ? "white" : DARK,
                borderColor: isActive ? NAVY : BORDER,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              {fc.city}
              {fc.desc && (
                <span
                  className="block text-[0.6rem] font-normal normal-case tracking-normal"
                  style={{ color: isActive ? META : "#999", marginTop: 2 }}
                >
                  {fc.desc}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sidebar controls (inline for Next.js, no Streamlit sidebar) ── */}
      <div className="mb-4 flex flex-wrap items-end gap-4 border-b pb-4" style={{ borderColor: BORDER }}>
        <div className="min-w-[220px] flex-1">
          <label
            className="mb-1 block text-xs font-semibold uppercase tracking-wider"
            style={{ color: META }}
          >
            City
          </label>
          <CitySearchSelect
            cities={allCities}
            selected={selectedCity}
            onSelect={(city) => setSelectedCity(city)}
          />
        </div>
        <div className="min-w-[160px]">
          <label
            className="mb-1 block text-xs font-semibold uppercase tracking-wider"
            style={{ color: META }}
          >
            Price Segment
          </label>
          <select
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
            className="w-full border bg-white px-3 py-2 text-sm font-medium"
            style={{ borderColor: BORDER, color: DARK }}
          >
            {Object.keys(PRICE_SEGMENTS).map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading && <ReportSkeleton />}

      {error && !isLoading && (
        <div className="border border-dashed border-red-300 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Could not load report data. The API may be unavailable.</p>
        </div>
      )}

      {report && !isLoading && (
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {/* Fallback notice */}
          {report.fell_back && (
            <div
              className="mb-3 border px-4 py-2 text-sm"
              style={{ borderColor: "#b8daff", background: "#e8f4fd", color: "#004085" }}
            >
              Not enough recent data for {report.city} at {report.original_price_label}. Showing all price ranges instead.
            </div>
          )}

          {/* ── Navy banner ── */}
          <div
            className="mb-3 px-9 py-7"
            style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, #243B5C 50%, ${NAVY} 100%)`,
              borderBottom: `3px solid ${GOLD}`,
            }}
          >
            <h1
              className="mb-1 text-[1.45rem] font-semibold uppercase tracking-[2px] text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {report.city.toUpperCase()} MARKET UPDATE: {report.report_month.toUpperCase()}
            </h1>
            <p
              className="mb-1.5 text-[1.05rem] font-normal italic leading-tight"
              style={{ color: "#E5C33A", fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {report.headline}
            </p>
            <p className="text-[0.76rem] tracking-wide" style={{ color: META, fontFamily: "'Inter', sans-serif" }}>
              {report.report_date} &nbsp;|&nbsp; {report.price_segment} &nbsp;|&nbsp; {report.mls_label} Data
              through {report.data_through}
            </p>
          </div>

          {/* ── Share bar ── */}
          <ShareBar share={report.share} />

          {/* ── Podcast ── */}
          <div className="mt-3">
            <PodcastPlayer podcastUrl={report.podcast_url} generateText={report.podcast_generate_text} />
          </div>

          {/* ── KPI cards ── */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

          {/* ── Opening narrative ── */}
          <div className="mt-4">
            <NarrativeSection html={report.narrative.opening} />
          </div>

          {/* ── Supply section ── */}
          <SectionTitle>Supply</SectionTitle>
          <NarrativeSection html={report.narrative.supply} />

          {/* ── Demand & Pricing section ── */}
          <SectionTitle>Demand &amp; Pricing</SectionTitle>
          <NarrativeSection html={report.narrative.demand} />

          {/* ── Price segment breakdown ── */}
          {report.narrative.segment_breakdown && (
            <>
              <SectionTitle>Breaking It Down by Price Point</SectionTitle>
              <NarrativeSection html={report.narrative.segment_breakdown} />
            </>
          )}

          {/* ── Pull quote ── */}
          <div
            className="my-3.5 border-l-[3px] px-4 py-3 text-[0.95rem] italic leading-relaxed"
            style={{
              borderColor: GOLD,
              background: CREAM,
              color: DARK,
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            {report.narrative.pull_quote}
          </div>

          {/* ── Recommendations ── */}
          <SectionTitle>What This Means for Buyers &amp; Sellers</SectionTitle>
          <NarrativeSection html={report.narrative.recommendations} />

          {/* ── Charts ── */}
          <Divider />
          <SectionTitle>Market Trends</SectionTitle>
          <ChartTabs monthly={report.charts.monthly} yearly={report.charts.yearly} />

          {/* ── Year-over-Year table ── */}
          <Divider />
          <SectionTitle>Year-over-Year Data<InfoTooltip text={TERM_TOOLTIPS["YoY"]} /></SectionTitle>
          <YearlyTable data={report.charts.yearly} />

          {/* ── Recent notable sales ── */}
          <Divider />
          <SectionTitle>Recent Notable Sales</SectionTitle>
          <RecentSalesTable sales={report.recent_sales} />

          {/* ── Price distribution ── */}
          {report.price_distribution.length > 0 && (
            <>
              <Divider />
              <SectionTitle>Price Distribution (Last 12 Months)<InfoTooltip text={TERM_TOOLTIPS["Trailing 12 Months"]} /></SectionTitle>
              <PriceDistributionChart data={report.price_distribution} />
            </>
          )}

          {/* ── Closing CTA ── */}
          <Divider />
          <div className="text-center">
            <p
              className="text-[0.95rem] italic leading-relaxed"
              style={{ color: BODY, fontFamily: "'Inter', sans-serif" }}
              dangerouslySetInnerHTML={{ __html: report.narrative.closing }}
            />
          </div>

          {/* ── Second share bar ── */}
          <div className="mt-3 text-center">
            <p className="mb-1.5 text-[0.78rem]" style={{ color: "#999" }}>
              Share this report
            </p>
            <ShareBar share={report.share} centered />
          </div>

          {/* ── Data source footer ── */}
          <div
            className="mt-4 border px-4 py-3 text-[0.8rem]"
            style={{ background: CREAM, borderColor: BORDER, color: "#53555A", fontFamily: "'Inter', sans-serif" }}
          >
            <strong>Data Sources:</strong> Data in this report were sourced from {report.mls_label} via Bridge
            Interactive API. Report generated {report.report_date}. Data reflects recorded transactions and may not
            capture all market activity.
            <br />
            <span className="text-[0.78rem]" style={{ color: "#999" }}>
              MarketStats &mdash; marketstats.certihomes.com
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
