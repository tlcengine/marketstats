"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useDashboardStore } from "@/lib/store";
import { AREA_COLORS } from "@/lib/constants";

/**
 * Leaflet-based map for visualizing selected areas.
 * Uses OpenStreetMap tiles (no API key required).
 * Dynamically imports Leaflet to avoid SSR issues in Next.js.
 */

// Approximate center coords for states
const STATE_CENTERS: Record<string, [number, number]> = {
  "New Jersey": [40.22, -74.76],
  Georgia: [33.75, -84.39],
  "New York": [41.1, -73.77],
};

// Approximate coords for counties/cities (demo subset)
const GEO_COORDS: Record<string, [number, number]> = {
  // NJ Counties
  Middlesex: [40.44, -74.38],
  Somerset: [40.56, -74.62],
  Monmouth: [40.29, -74.16],
  Union: [40.66, -74.31],
  Morris: [40.82, -74.48],
  Bergen: [40.96, -74.08],
  Essex: [40.79, -74.25],
  Hudson: [40.73, -74.08],
  Mercer: [40.28, -74.71],
  Ocean: [39.87, -74.24],
  // NJ Cities
  Edison: [40.52, -74.35],
  Princeton: [40.35, -74.66],
  "Monroe Township": [40.33, -74.43],
  "New Brunswick": [40.49, -74.45],
  Woodbridge: [40.56, -74.28],
  Piscataway: [40.55, -74.46],
  "South Brunswick": [40.38, -74.53],
  "East Brunswick": [40.43, -74.42],
  "North Brunswick": [40.46, -74.48],
  Hillsborough: [40.50, -74.63],
  // GA
  Atlanta: [33.75, -84.39],
  Marietta: [33.95, -84.55],
  Roswell: [34.02, -84.36],
  Alpharetta: [34.08, -84.29],
  "Johns Creek": [34.03, -84.20],
  Decatur: [33.77, -84.30],
  Fulton: [33.80, -84.47],
  DeKalb: [33.77, -84.23],
  Gwinnett: [33.96, -84.02],
  Cobb: [33.94, -84.58],
  Cherokee: [34.24, -84.48],
  Forsyth: [34.23, -84.13],
  // NY
  Westchester: [41.12, -73.76],
  Nassau: [40.74, -73.59],
  Suffolk: [40.94, -72.68],
  "White Plains": [41.03, -73.77],
  Yonkers: [40.93, -73.90],
  "New Rochelle": [40.91, -73.78],
  Scarsdale: [41.01, -73.78],
};

// NJ zip coords
const ZIP_COORDS: Record<string, [number, number]> = {
  "08817": [40.52, -74.35],
  "08540": [40.35, -74.66],
  "08831": [40.33, -74.43],
  "08816": [40.43, -74.42],
  "08820": [40.58, -74.34],
  "08854": [40.55, -74.46],
  "08852": [40.38, -74.53],
  "08536": [40.32, -74.58],
  "08901": [40.49, -74.45],
  "08873": [40.50, -74.53],
};

function getCoords(geo: string): [number, number] | null {
  return GEO_COORDS[geo] ?? ZIP_COORDS[geo] ?? null;
}

interface AreaMapProps {
  height?: number;
}

export default function AreaMap({ height = 350 }: AreaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").CircleMarker[]>([]);
  const areas = useDashboardStore((s) => s.areas);
  const [ready, setReady] = useState(false);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (leafletRef.current) {
        setReady(true);
        return;
      }
      try {
        const L = await import("leaflet");
        leafletRef.current = L.default ?? L;

        // Inject Leaflet CSS if not already present
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!cancelled) setReady(true);
      } catch {
        console.warn("Could not load Leaflet");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Create map once Leaflet is ready
  useEffect(() => {
    if (!ready || !leafletRef.current || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already created

    const L = leafletRef.current;
    const map = L.map(mapContainerRef.current, {
      center: [39.83, -74.87],
      zoom: 8,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [ready]);

  // Update markers when areas change
  const updateMarkers = useCallback(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Remove old markers
    for (const m of markersRef.current) {
      map.removeLayer(m);
    }
    markersRef.current = [];

    const bounds: [number, number][] = [];

    areas.forEach((area, idx) => {
      const color = AREA_COLORS[idx % AREA_COLORS.length];

      if (area.geoValues.length > 0) {
        area.geoValues.forEach((geo) => {
          const coords = getCoords(geo);
          if (coords) {
            bounds.push(coords);
            const marker = L.circleMarker(coords, {
              radius: 10,
              fillColor: color,
              color: color,
              weight: 2,
              opacity: 0.9,
              fillOpacity: 0.35,
            })
              .bindPopup(
                `<div style="font-family:Inter,sans-serif;font-size:12px;">` +
                  `<strong style="color:${color};">${geo}</strong><br/>` +
                  `<span style="color:#53555A;">${area.name}</span></div>`
              )
              .addTo(map);
            markersRef.current.push(marker);
          }
        });
      } else if (area.state) {
        const coords = STATE_CENTERS[area.state];
        if (coords) {
          bounds.push(coords);
          const marker = L.circleMarker(coords, {
            radius: 14,
            fillColor: color,
            color: color,
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.2,
          })
            .bindPopup(
              `<div style="font-family:Inter,sans-serif;font-size:12px;">` +
                `<strong style="color:${color};">${area.state}</strong><br/>` +
                `<span style="color:#53555A;">Entire MLS</span></div>`
            )
            .addTo(map);
          markersRef.current.push(marker);
        }
      }
    });

    // Fit bounds
    if (bounds.length === 1) {
      map.setView(bounds[0], 10);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [areas]);

  useEffect(() => {
    if (ready && mapInstanceRef.current) {
      // Small delay to ensure map is fully initialized
      const timer = setTimeout(updateMarkers, 100);
      return () => clearTimeout(timer);
    }
  }, [ready, updateMarkers]);

  // Placeholder while loading
  if (!ready) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-gray-200 bg-[#f0f4f8]"
        style={{ height }}
      >
        <div className="text-center">
          <svg
            className="mx-auto mb-2 h-8 w-8 text-gray-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <p className="text-xs text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="rounded-lg border border-gray-200 overflow-hidden"
      style={{ height, width: "100%" }}
    />
  );
}
