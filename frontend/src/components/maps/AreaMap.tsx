"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useDashboardStore } from "@/lib/store";
import { AREA_COLORS } from "@/lib/constants";
import type { DrawnShape } from "@/lib/types";

/**
 * Leaflet-based map with draw tools (polygon, circle, rectangle).
 * Uses OpenStreetMap tiles (no API key required).
 * Dynamically imports Leaflet + leaflet-draw to avoid SSR issues.
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

let shapeCounter = 0;
function nextShapeId(): string {
  shapeCounter += 1;
  return `drawn_${Date.now()}_${shapeCounter}`;
}

interface AreaMapProps {
  height?: number;
}

/** Panel showing drawn shapes with save/delete actions */
function DrawnShapesPanel() {
  const drawnShapes = useDashboardStore((s) => s.drawnShapes);
  const removeDrawnShape = useDashboardStore((s) => s.removeDrawnShape);
  const saveDrawnShapeAsArea = useDashboardStore((s) => s.saveDrawnShapeAsArea);
  const clearDrawnShapes = useDashboardStore((s) => s.clearDrawnShapes);
  const savedCustomAreas = useDashboardStore((s) => s.savedCustomAreas);
  const removeSavedCustomArea = useDashboardStore((s) => s.removeSavedCustomArea);
  const areas = useDashboardStore((s) => s.areas);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [areaName, setAreaName] = useState("");

  if (drawnShapes.length === 0 && savedCustomAreas.length === 0) return null;

  const canAddMore = areas.length < 4;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
      {/* Unsaved drawn shapes */}
      {drawnShapes.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-700">
              Drawn Shapes ({drawnShapes.length})
            </h4>
            <button
              onClick={clearDrawnShapes}
              className="text-[10px] text-red-500 hover:text-red-700"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-1.5">
            {drawnShapes.map((shape) => (
              <div
                key={shape.id}
                className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <ShapeIcon type={shape.type} />
                  <span className="text-xs text-gray-600">{shape.label}</span>
                </div>

                <div className="flex items-center gap-1">
                  {editingId === shape.id ? (
                    <>
                      <input
                        type="text"
                        value={areaName}
                        onChange={(e) => setAreaName(e.target.value)}
                        placeholder="Area name..."
                        className="w-24 rounded border border-gray-300 px-1.5 py-0.5 text-[10px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveDrawnShapeAsArea(shape, areaName);
                            setEditingId(null);
                            setAreaName("");
                          }
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setAreaName("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          saveDrawnShapeAsArea(shape, areaName);
                          setEditingId(null);
                          setAreaName("");
                        }}
                        className="rounded bg-[#1a4b7f] px-1.5 py-0.5 text-[10px] text-white hover:bg-[#153d67]"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      {canAddMore && (
                        <button
                          onClick={() => {
                            setEditingId(shape.id);
                            setAreaName(shape.label);
                          }}
                          className="rounded bg-[#1a4b7f] px-2 py-0.5 text-[10px] font-medium text-white hover:bg-[#153d67]"
                        >
                          Save Area
                        </button>
                      )}
                      <button
                        onClick={() => removeDrawnShape(shape.id)}
                        className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-red-500"
                        title="Delete shape"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Saved custom areas */}
      {savedCustomAreas.length > 0 && (
        <>
          <div className="mb-2 mt-3 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4b7f" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <h4 className="text-xs font-semibold text-gray-700">
              Saved Custom Areas
            </h4>
          </div>
          <div className="space-y-1.5">
            {savedCustomAreas.map((area) => (
              <div
                key={area.shape.id}
                className="flex items-center justify-between rounded border border-[#1a4b7f]/20 bg-[#1a4b7f]/5 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <ShapeIcon type={area.shape.type} />
                  <span className="text-xs font-medium text-gray-700">
                    {area.name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({area.shape.type})
                  </span>
                </div>
                <button
                  onClick={() => removeSavedCustomArea(area.shape.id)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-red-500"
                  title="Remove custom area"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ShapeIcon({ type }: { type: string }) {
  switch (type) {
    case "polygon":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4b7f" strokeWidth="2">
          <polygon points="12 2 22 8.5 18 20 6 20 2 8.5" />
        </svg>
      );
    case "circle":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4b7f" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    case "rectangle":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4b7f" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="1" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AreaMap({ height = 350 }: AreaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").CircleMarker[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawControlRef = useRef<any>(null);
  const drawnItemsRef = useRef<import("leaflet").FeatureGroup | null>(null);
  const areas = useDashboardStore((s) => s.areas);
  const drawMode = useDashboardStore((s) => s.drawMode);
  const addDrawnShape = useDashboardStore((s) => s.addDrawnShape);
  const [ready, setReady] = useState(false);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  // Load Leaflet + leaflet-draw dynamically
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

        // Import leaflet-draw (side-effect: extends L)
        await import("leaflet-draw");

        // Inject Leaflet CSS if not already present
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        // Inject leaflet-draw CSS
        if (!document.querySelector('link[href*="leaflet.draw.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css";
          document.head.appendChild(link);
        }

        if (!cancelled) setReady(true);
      } catch (err) {
        console.warn("Could not load Leaflet / leaflet-draw", err);
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
    if (mapInstanceRef.current) return;

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

    // Create a feature group to hold drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      drawnItemsRef.current = null;
      drawControlRef.current = null;
    };
  }, [ready]);

  // Add/remove draw controls based on drawMode
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !leafletRef.current || !drawnItemsRef.current) return;

    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    // Remove existing draw control
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    if (!drawMode) return;

    // Add draw control with polygon, circle, rectangle
    const drawControl = new (L as any).Control.Draw({
      position: "topright",
      draw: {
        polyline: false,
        marker: false,
        circlemarker: false,
        polygon: {
          allowIntersection: false,
          drawError: {
            color: "#e74c3c",
            message: "Edges cannot cross!",
          },
          shapeOptions: {
            color: "#1a4b7f",
            weight: 2,
            fillOpacity: 0.15,
          },
        },
        circle: {
          shapeOptions: {
            color: "#1a4b7f",
            weight: 2,
            fillOpacity: 0.15,
          },
        },
        rectangle: {
          shapeOptions: {
            color: "#1a4b7f",
            weight: 2,
            fillOpacity: 0.15,
          },
        },
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true,
      },
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onCreated = (e: any) => {
      const layer = e.layer;
      drawnItemsRef.current?.addLayer(layer);

      let shapeType: DrawnShape["type"] = "polygon";
      let geoJSON: GeoJSON.Geometry;
      let radiusMeters: number | undefined;
      let label = "";

      if (e.layerType === "circle") {
        shapeType = "circle";
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        radiusMeters = radius;
        // Store circle center as a Point + radius
        geoJSON = {
          type: "Point",
          coordinates: [center.lng, center.lat],
        };
        label = `Circle (${(radius / 1000).toFixed(1)} km radius)`;
      } else if (e.layerType === "rectangle") {
        shapeType = "rectangle";
        geoJSON = layer.toGeoJSON().geometry;
        const bounds = layer.getBounds();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        label = `Rectangle (${sw.lat.toFixed(3)}, ${sw.lng.toFixed(3)} to ${ne.lat.toFixed(3)}, ${ne.lng.toFixed(3)})`;
      } else {
        shapeType = "polygon";
        geoJSON = layer.toGeoJSON().geometry;
        const coords = (geoJSON as GeoJSON.Polygon).coordinates[0];
        label = `Polygon (${coords.length - 1} points)`;
      }

      const shape: DrawnShape = {
        id: nextShapeId(),
        type: shapeType,
        geoJSON,
        radiusMeters,
        label,
      };

      addDrawnShape(shape);
    };

    map.on((L as any).Draw.Event.CREATED, onCreated);

    return () => {
      map.off((L as any).Draw.Event.CREATED, onCreated);
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    };
  }, [ready, drawMode, addDrawnShape]);

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

      // Render saved custom shapes on the map
      if (area.geoType === "custom" && area.drawnShape) {
        const shape = area.drawnShape;
        if (shape.type === "circle" && shape.radiusMeters) {
          const coords = shape.geoJSON.type === "Point"
            ? shape.geoJSON.coordinates
            : [0, 0];
          const center: [number, number] = [coords[1], coords[0]];
          bounds.push(center);
          const circle = L.circle(center, {
            radius: shape.radiusMeters,
            color,
            weight: 2,
            fillOpacity: 0.15,
          })
            .bindPopup(
              `<div style="font-family:Inter,sans-serif;font-size:12px;">` +
                `<strong style="color:${color};">${area.name}</strong><br/>` +
                `<span style="color:#53555A;">${shape.label}</span></div>`
            )
            .addTo(map);
          markersRef.current.push(circle as unknown as import("leaflet").CircleMarker);
        } else {
          const geoLayer = L.geoJSON(shape.geoJSON as any, {
            style: {
              color,
              weight: 2,
              fillOpacity: 0.15,
            },
          })
            .bindPopup(
              `<div style="font-family:Inter,sans-serif;font-size:12px;">` +
                `<strong style="color:${color};">${area.name}</strong><br/>` +
                `<span style="color:#53555A;">${shape.label}</span></div>`
            )
            .addTo(map);
          const layerBounds = geoLayer.getBounds();
          if (layerBounds.isValid()) {
            bounds.push([layerBounds.getCenter().lat, layerBounds.getCenter().lng]);
          }
          // Store reference for cleanup (using any layer in the group)
          geoLayer.eachLayer((l) => {
            markersRef.current.push(l as unknown as import("leaflet").CircleMarker);
          });
        }
        return;
      }

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
    <div>
      <div
        ref={mapContainerRef}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height, width: "100%" }}
      />
      <DrawnShapesPanel />
    </div>
  );
}
