// Mock data generators for development before the FastAPI backend is wired up

import type { MetricDataPoint, QuickFactData } from "./types";
import type { MetricKey } from "./constants";

/**
 * Generate realistic mock metric data for charting.
 */
export function generateMockMetricData(
  metric: MetricKey,
  areaNames: string[],
  areaIds: string[],
  months: number = 36
): MetricDataPoint[] {
  const data: MetricDataPoint[] = [];
  const now = new Date();

  const baseValues: Record<string, number> = {
    MedianSalesPrice: 450000,
    NewListings: 320,
    Inventory: 1200,
    PendingSales: 250,
    ClosedSales: 280,
    DaysOnMarket: 32,
    MonthsSupply: 3.2,
    PctOfListPrice: 0.985,
    PricePerSqFt: 285,
    DollarVolume: 125000000,
    AbsorptionRate: 0.23,
    AverageSalesPrice: 520000,
    ListToSaleRatio: 1.05,
  };

  const base = baseValues[metric] ?? 100;

  for (let areaIdx = 0; areaIdx < areaNames.length; areaIdx++) {
    const areaOffset = 1 + areaIdx * 0.15; // Each area slightly different
    const trend = 0.003 + areaIdx * 0.001; // Slight upward trend

    for (let m = months - 1; m >= 0; m--) {
      const date = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const monthStr = date.toISOString().slice(0, 10);

      // Seasonal pattern + trend + noise
      const seasonality =
        Math.sin(((date.getMonth() - 3) / 12) * 2 * Math.PI) * 0.08;
      const trendFactor = 1 + trend * (months - m);
      const noise = (Math.random() - 0.5) * 0.06;

      const value =
        base * areaOffset * trendFactor * (1 + seasonality + noise);

      data.push({
        month: monthStr,
        value: Math.round(value * 100) / 100,
        areaName: areaNames[areaIdx],
        areaId: areaIds[areaIdx],
      });
    }
  }

  return data;
}

/**
 * Generate mock quick facts from metric data.
 */
export function generateMockQuickFacts(
  data: MetricDataPoint[],
  areaNames: string[],
  areaIds: string[]
): QuickFactData[] {
  const facts: QuickFactData[] = [];

  for (let i = 0; i < areaNames.length; i++) {
    const areaData = data
      .filter((d) => d.areaId === areaIds[i])
      .sort((a, b) => a.month.localeCompare(b.month));

    if (areaData.length === 0) continue;

    const latest = areaData[areaData.length - 1];
    const latestDate = new Date(latest.month + "T00:00:00");
    const prevYearMonth = new Date(
      latestDate.getFullYear() - 1,
      latestDate.getMonth(),
      1
    )
      .toISOString()
      .slice(0, 10);

    const prevYearPoint = areaData.find((d) => d.month === prevYearMonth);

    let yoyChange: number | null = null;
    if (prevYearPoint && prevYearPoint.value !== 0) {
      yoyChange =
        ((latest.value - prevYearPoint.value) / Math.abs(prevYearPoint.value)) *
        100;
    }

    facts.push({
      areaName: areaNames[i],
      areaId: areaIds[i],
      latestValue: latest.value,
      yoyChange,
      latestMonth: latest.month,
    });
  }

  return facts;
}

/**
 * Generate mock geography options.
 */
export function getMockStates(): string[] {
  return ["New Jersey", "Georgia", "New York"];
}

export function getMockCounties(state: string): string[] {
  const counties: Record<string, string[]> = {
    "New Jersey": [
      "Middlesex",
      "Somerset",
      "Monmouth",
      "Union",
      "Morris",
      "Bergen",
      "Essex",
      "Hudson",
      "Mercer",
      "Ocean",
    ],
    Georgia: [
      "Fulton",
      "DeKalb",
      "Gwinnett",
      "Cobb",
      "Cherokee",
      "Forsyth",
      "Hall",
      "Clayton",
      "Henry",
      "Douglas",
    ],
    "New York": [
      "Westchester",
      "Nassau",
      "Suffolk",
      "Rockland",
      "Dutchess",
      "Orange",
      "Putnam",
      "Ulster",
    ],
  };
  return counties[state] ?? [];
}

export function getMockCities(state: string): string[] {
  const cities: Record<string, string[]> = {
    "New Jersey": [
      "Edison",
      "Princeton",
      "Monroe Township",
      "New Brunswick",
      "Woodbridge",
      "Piscataway",
      "South Brunswick",
      "East Brunswick",
      "North Brunswick",
      "Hillsborough",
    ],
    Georgia: [
      "Atlanta",
      "Marietta",
      "Roswell",
      "Alpharetta",
      "Johns Creek",
      "Decatur",
      "Kennesaw",
      "Lawrenceville",
      "Duluth",
      "Suwanee",
    ],
    "New York": [
      "White Plains",
      "Yonkers",
      "New Rochelle",
      "Scarsdale",
      "Rye",
      "Mamaroneck",
      "Harrison",
      "Bronxville",
    ],
  };
  return cities[state] ?? [];
}

export function getMockZips(state: string): string[] {
  const zips: Record<string, string[]> = {
    "New Jersey": [
      "08817",
      "08540",
      "08831",
      "08816",
      "08820",
      "08854",
      "08852",
      "08536",
      "08901",
      "08873",
    ],
    Georgia: [
      "30301",
      "30305",
      "30309",
      "30318",
      "30324",
      "30327",
      "30338",
      "30342",
      "30350",
      "30360",
    ],
    "New York": [
      "10601",
      "10701",
      "10801",
      "10583",
      "10580",
      "10543",
      "10528",
      "10708",
    ],
  };
  return zips[state] ?? [];
}
