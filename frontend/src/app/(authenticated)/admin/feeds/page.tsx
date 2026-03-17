"use client";

import React, { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { api, type FeedsResponseAPI, type FeedStatusAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Database,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Server,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";

// ── Status badge ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { bg: string; text: string; icon: React.ReactNode; label: string }
  > = {
    active: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Active",
    },
    stale: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Stale",
    },
    broken: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-600",
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Broken",
    },
  };

  const c = config[status] ?? config.broken;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ── Summary card ──

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border-warm bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-body-gray">
            {label}
          </p>
          <p className="mt-2 font-serif text-2xl font-bold text-dark-gray">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <p className="mt-1 text-xs text-body-gray">{sub}</p>}
        </div>
        <div className="rounded-lg bg-cream p-2">
          <Icon className="h-5 w-5 text-gold" />
        </div>
      </div>
    </div>
  );
}

// ── Feed row ──

function FeedRow({
  feed,
  onSync,
  syncing,
}: {
  feed: FeedStatusAPI;
  onSync: (key: string) => void;
  syncing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border-warm/50 last:border-b-0">
      {/* Main row */}
      <div
        className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-cream/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-body-gray">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>

        {/* Name & provider */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-dark-gray">{feed.name}</p>
          <p className="text-xs text-body-gray">
            {feed.provider} - {feed.method}
          </p>
        </div>

        {/* State */}
        <div className="hidden w-16 text-center sm:block">
          <span className="rounded bg-cream px-2 py-0.5 text-xs font-medium text-dark-gray">
            {feed.state}
          </span>
        </div>

        {/* Doc count */}
        <div className="hidden w-24 text-right md:block">
          <p className="text-sm font-medium text-dark-gray">
            {feed.doc_count != null ? feed.doc_count.toLocaleString() : "--"}
          </p>
          <p className="text-[10px] text-body-gray">documents</p>
        </div>

        {/* Last sync */}
        <div className="hidden w-40 text-right lg:block">
          <p className="text-xs text-body-gray">
            {feed.last_sync || "Unknown"}
          </p>
        </div>

        {/* Status */}
        <div className="w-24">
          <StatusBadge status={feed.status} />
        </div>

        {/* Sync button */}
        <div className="w-24" onClick={(e) => e.stopPropagation()}>
          {feed.enabled ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => onSync(feed.key)}
              disabled={syncing}
              className="gap-1"
            >
              <RefreshCw
                className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing" : "Sync"}
            </Button>
          ) : (
            <Button variant="outline" size="xs" disabled className="gap-1">
              <XCircle className="h-3 w-3" />
              Disabled
            </Button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border-warm/30 bg-cream/30 px-5 py-4 pl-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-body-gray">
                Provider
              </p>
              <p className="mt-1 text-sm text-dark-gray">{feed.provider}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-body-gray">
                Method
              </p>
              <p className="mt-1 text-sm text-dark-gray">{feed.method}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-body-gray">
                Documents
              </p>
              <p className="mt-1 text-sm text-dark-gray">
                {feed.doc_count != null
                  ? feed.doc_count.toLocaleString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-body-gray">
                Last Sync
              </p>
              <p className="mt-1 text-sm text-dark-gray">
                {feed.last_sync || "Unknown"}
              </p>
            </div>
          </div>

          {feed.disabled_reason && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-xs font-medium text-red-700">
                  Disabled Reason
                </p>
                <p className="mt-0.5 text-xs text-red-600">
                  {feed.disabled_reason}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ──

function FeedsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-border-warm/50" />
        ))}
      </div>
      <div className="rounded-xl border border-border-warm bg-white">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border-warm/50 px-5 py-5"
          >
            <div className="h-4 w-4 rounded bg-border-warm/50" />
            <div className="h-5 flex-1 rounded bg-border-warm/50" />
            <div className="h-5 w-20 rounded bg-border-warm/50" />
            <div className="h-5 w-16 rounded bg-border-warm/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──

export default function FeedManagerPage() {
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Fetch feeds
  const { data, isLoading, error } = useSWR(
    "feeds/list",
    () => api.getFeeds(),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const handleSync = useCallback(async (feedKey: string) => {
    setSyncingKey(feedKey);
    setSyncMessage(null);
    try {
      const result = await api.triggerSync(feedKey);
      setSyncMessage(result.message);
      // Refresh feed data after a delay
      setTimeout(() => {
        mutate("feeds/list");
        setSyncingKey(null);
      }, 2000);
    } catch (err) {
      setSyncMessage("Sync failed. Check server logs for details.");
      setSyncingKey(null);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    mutate("feeds/list");
  }, []);

  const feeds = data?.feeds ?? [];
  const summary = data?.summary ?? {
    total_feeds: 0,
    active_feeds: 0,
    total_documents: 0,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-dark-gray">
            Feed Manager
          </h1>
          <p className="mt-1 text-sm text-body-gray">
            Monitor and manage MLS data feed connections.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 self-start"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {isLoading && <FeedsSkeleton />}

      {error && !isLoading && (
        <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">
            Could not load feed data. The backend API may be unavailable.
          </p>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={Activity}
              label="Active Feeds"
              value={`${summary.active_feeds}/${summary.total_feeds}`}
              sub="Enabled and syncing"
            />
            <SummaryCard
              icon={Database}
              label="Total Records"
              value={summary.total_documents}
              sub="Across all collections"
            />
            <SummaryCard
              icon={Server}
              label="MongoDB"
              value="Connected"
              sub="172.26.1.151:27017"
            />
          </div>

          {/* Sync status banner */}
          {syncMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
              <Zap className="h-4 w-4 text-gold" />
              <p className="text-sm text-dark-gray">{syncMessage}</p>
              <button
                onClick={() => setSyncMessage(null)}
                className="ml-auto text-body-gray hover:text-dark-gray"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Feed table */}
          <div className="overflow-hidden rounded-xl border border-border-warm bg-white">
            {/* Table header */}
            <div className="flex items-center gap-4 border-b border-border-warm bg-cream px-5 py-3">
              <div className="w-4" />
              <div className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-body-gray">
                Feed
              </div>
              <div className="hidden w-16 text-center text-xs font-semibold uppercase tracking-wider text-body-gray sm:block">
                State
              </div>
              <div className="hidden w-24 text-right text-xs font-semibold uppercase tracking-wider text-body-gray md:block">
                Records
              </div>
              <div className="hidden w-40 text-right text-xs font-semibold uppercase tracking-wider text-body-gray lg:block">
                Last Sync
              </div>
              <div className="w-24 text-xs font-semibold uppercase tracking-wider text-body-gray">
                Status
              </div>
              <div className="w-24 text-xs font-semibold uppercase tracking-wider text-body-gray">
                Action
              </div>
            </div>

            {/* Feed rows */}
            {feeds.map((feed) => (
              <FeedRow
                key={feed.key}
                feed={feed}
                onSync={handleSync}
                syncing={syncingKey === feed.key}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-6 rounded-lg bg-cream px-5 py-3">
            <div className="flex items-center gap-2">
              <StatusBadge status="active" />
              <span className="text-xs text-body-gray">
                Syncing and receiving data
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="stale" />
              <span className="text-xs text-body-gray">
                Data available but no longer syncing
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="broken" />
              <span className="text-xs text-body-gray">
                Authentication or connection failed
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
