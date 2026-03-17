"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  X,
  Home,
  MapPin,
  DollarSign,
  Calendar,
  Ruler,
  BedDouble,
  Bath,
  Clock,
  Building2,
} from "lucide-react";
import { useStates, useCities, useListings, useListingDetail } from "@/lib/hooks";
import type { ListingSummaryAPI } from "@/lib/api";
import { COLORS } from "@/lib/constants";

// ── Formatters ──

function formatPrice(val: number | null | undefined): string {
  if (val == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatNumber(val: number | null | undefined): string {
  if (val == null) return "--";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "--";
  try {
    return new Date(val + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return val;
  }
}

// ── Sort types ──

type SortField =
  | "CloseDate"
  | "ListPrice"
  | "ClosePrice"
  | "City"
  | "DaysOnMarket"
  | "BedroomsTotal"
  | "BuildingAreaTotal";
type SortOrder = "asc" | "desc";

// ── Detail Panel ──

function ListingDetailPanel({
  listing,
  state,
  onClose,
}: {
  listing: ListingSummaryAPI;
  state: string;
  onClose: () => void;
}) {
  const { data: detailData, isLoading } = useListingDetail(listing.id, state);
  const detail = detailData?.listing;

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-white p-0">
        <SheetHeader className="border-b border-gray-100 px-6 py-4">
          <SheetTitle className="font-serif text-lg text-[#181818]">
            Listing Details
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Address header */}
          <div>
            <h2
              className="text-xl font-bold"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "#181818",
              }}
            >
              {listing.address || "Address Not Available"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {[listing.city, listing.state, listing.zip_code]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>

          {/* Price cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 bg-[#FAF9F7] p-3">
              <p className="text-xs text-gray-500 mb-1">List Price</p>
              <p
                className="text-lg font-bold"
                style={{ color: COLORS.navy }}
              >
                {formatPrice(listing.list_price)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-[#FAF9F7] p-3">
              <p className="text-xs text-gray-500 mb-1">Close Price</p>
              <p
                className="text-lg font-bold"
                style={{ color: COLORS.gold }}
              >
                {formatPrice(listing.close_price)}
              </p>
            </div>
          </div>

          {/* Key details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Property Details
            </h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <DetailRow
                icon={BedDouble}
                label="Bedrooms"
                value={
                  listing.bedrooms != null ? String(listing.bedrooms) : "--"
                }
              />
              <DetailRow
                icon={Bath}
                label="Bathrooms"
                value={
                  listing.bathrooms != null ? String(listing.bathrooms) : "--"
                }
              />
              <DetailRow
                icon={Ruler}
                label="Sq Ft"
                value={formatNumber(listing.sqft)}
              />
              <DetailRow
                icon={Clock}
                label="Days on Market"
                value={
                  listing.days_on_market != null
                    ? String(listing.days_on_market)
                    : "--"
                }
              />
              <DetailRow
                icon={Calendar}
                label="Close Date"
                value={formatDate(listing.close_date)}
              />
              <DetailRow
                icon={Calendar}
                label="On Market"
                value={formatDate(listing.on_market_date)}
              />
              <DetailRow
                icon={Building2}
                label="Property Type"
                value={listing.property_type || "--"}
              />
              <DetailRow
                icon={MapPin}
                label="Zip Code"
                value={listing.zip_code || "--"}
              />
            </div>
          </div>

          {/* Loading spinner for full doc */}
          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#DAAA00]" />
              <p className="text-xs text-gray-400 mt-2">
                Loading full details...
              </p>
            </div>
          )}

          {/* Additional fields from full doc */}
          {detail && !isLoading && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Additional Information
              </h3>
              <div className="rounded-lg border border-gray-100 bg-[#FAF9F7] p-3">
                <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  {detail.YearBuilt ? (
                    <>
                      <dt className="text-gray-500">Year Built</dt>
                      <dd className="font-medium text-gray-700">
                        {String(detail.YearBuilt).slice(0, 4)}
                      </dd>
                    </>
                  ) : null}
                  {detail.LotSizeSquareFeet ? (
                    <>
                      <dt className="text-gray-500">Lot Size (sqft)</dt>
                      <dd className="font-medium text-gray-700">
                        {formatNumber(Number(detail.LotSizeSquareFeet))}
                      </dd>
                    </>
                  ) : null}
                  {detail.OriginalListPrice ? (
                    <>
                      <dt className="text-gray-500">Orig. List Price</dt>
                      <dd className="font-medium text-gray-700">
                        {formatPrice(Number(detail.OriginalListPrice))}
                      </dd>
                    </>
                  ) : null}
                  {listing.latitude && listing.longitude && (
                    <>
                      <dt className="text-gray-500">Coordinates</dt>
                      <dd className="font-medium text-gray-700">
                        {listing.latitude.toFixed(4)},{" "}
                        {listing.longitude.toFixed(4)}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      <div>
        <p className="text-[10px] text-gray-400 leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-700">{value}</p>
      </div>
    </div>
  );
}

// ── Sort Header ──

function SortableHead({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;
  return (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap hover:bg-gray-50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span className={isActive ? "text-[#181818] font-semibold" : ""}>
          {label}
        </span>
        {isActive ? (
          currentOrder === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-gray-300" />
        )}
      </div>
    </TableHead>
  );
}

// ── Main Page ──

export default function BrowseListingsPage() {
  // Geography selectors
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const { data: statesData } = useStates();
  const { data: citiesData } = useCities(selectedState || undefined);

  // Filters
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [propertyType, setPropertyType] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Sort + pagination
  const [sortBy, setSortBy] = useState<SortField>("CloseDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Detail panel
  const [selectedListing, setSelectedListing] =
    useState<ListingSummaryAPI | null>(null);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortBy) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortOrder("desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  // Build params
  const listingsParams = useMemo(() => {
    if (!selectedState || !selectedCity) return null;
    return {
      state: selectedState,
      geoType: "city" as const,
      geoValues: [selectedCity],
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      propertyType: propertyType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
  }, [
    selectedState,
    selectedCity,
    minPrice,
    maxPrice,
    propertyType,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    page,
    pageSize,
  ]);

  const { data: listingsData, isLoading } = useListings(listingsParams);

  const listings = listingsData?.listings ?? [];
  const total = listingsData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const hasFilters = Boolean(
    minPrice || maxPrice || propertyType || dateFrom || dateTo
  );

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setPropertyType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const states = statesData?.states ?? [];
  const cities = citiesData?.cities ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "#181818",
          }}
        >
          Browse Listings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Search and explore individual property records from our MLS database.
        </p>
      </div>

      {/* Geography Selection */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#DAAA00]" />
            Select Location
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-48">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                State
              </label>
              <Select
                value={selectedState}
                onValueChange={(val) => {
                  setSelectedState(val ?? "");
                  setSelectedCity("");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-56">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                City
              </label>
              <Select
                value={selectedCity}
                onValueChange={(val) => {
                  setSelectedCity(val ?? "");
                  setPage(1);
                }}
                disabled={!selectedState}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      selectedState ? "Select city" : "Select state first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                      {c.count ? ` (${c.count.toLocaleString()})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#DAAA00]" />
              Filters
            </span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-32">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Min Price
              </label>
              <Input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-32">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Max Price
              </label>
              <Input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="w-44">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Property Type
              </label>
              <Select
                value={propertyType}
                onValueChange={(val) => {
                  setPropertyType(val ?? "");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-36">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                From Date
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                To Date
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!selectedState || !selectedCity ? (
        <div className="rounded-lg border border-dashed border-[#DAAA00]/40 bg-[#FAF9F7] px-6 py-12 text-center">
          <MapPin className="h-8 w-8 text-[#DAAA00]/50 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Select a state and city above to browse listing records.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>
                {isLoading
                  ? "Loading..."
                  : `${total.toLocaleString()} listing${total !== 1 ? "s" : ""} found`}
              </span>
              {totalPages > 1 && (
                <span className="text-xs text-gray-400 font-normal">
                  Page {page} of {totalPages}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#DAAA00]" />
                <p className="text-xs text-gray-400 mt-3">
                  Fetching listings...
                </p>
              </div>
            ) : listings.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">
                  No listings match your criteria.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#FAF9F7]">
                      <TableHead className="whitespace-nowrap">
                        Address
                      </TableHead>
                      <SortableHead
                        label="City"
                        field="City"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <TableHead className="whitespace-nowrap">Zip</TableHead>
                      <SortableHead
                        label="List Price"
                        field="ListPrice"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHead
                        label="Close Price"
                        field="ClosePrice"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHead
                        label="Beds"
                        field="BedroomsTotal"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <TableHead className="whitespace-nowrap">Baths</TableHead>
                      <SortableHead
                        label="Sq Ft"
                        field="BuildingAreaTotal"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHead
                        label="Close Date"
                        field="CloseDate"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHead
                        label="DOM"
                        field="DaysOnMarket"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.map((listing) => (
                      <TableRow
                        key={listing.id}
                        className="cursor-pointer hover:bg-[#FAF9F7] transition-colors"
                        onClick={() => setSelectedListing(listing)}
                      >
                        <TableCell className="font-medium text-[#181818] max-w-[200px] truncate">
                          {listing.address || "--"}
                        </TableCell>
                        <TableCell>{listing.city || "--"}</TableCell>
                        <TableCell className="text-gray-500">
                          {listing.zip_code || "--"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatPrice(listing.list_price)}
                        </TableCell>
                        <TableCell
                          className="tabular-nums font-medium"
                          style={{ color: COLORS.navy }}
                        >
                          {formatPrice(listing.close_price)}
                        </TableCell>
                        <TableCell className="text-center">
                          {listing.bedrooms ?? "--"}
                        </TableCell>
                        <TableCell className="text-center">
                          {listing.bathrooms ?? "--"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatNumber(listing.sqft)}
                        </TableCell>
                        <TableCell className="text-gray-500 whitespace-nowrap">
                          {formatDate(listing.close_date)}
                        </TableCell>
                        <TableCell className="text-center">
                          {listing.days_on_market ?? "--"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                    <p className="text-xs text-gray-400">
                      Showing {(page - 1) * pageSize + 1}&ndash;
                      {Math.min(page * pageSize, total)} of{" "}
                      {total.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={
                                pageNum === page ? "default" : "outline"
                              }
                              size="icon-sm"
                              onClick={() => setPage(pageNum)}
                              className={
                                pageNum === page
                                  ? "bg-[#1B2D4B] text-white"
                                  : ""
                              }
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail slide-out */}
      {selectedListing && (
        <ListingDetailPanel
          listing={selectedListing}
          state={selectedState}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  );
}
