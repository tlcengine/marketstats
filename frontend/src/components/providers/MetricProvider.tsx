"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type MetricKey } from "@/lib/constants";

interface MetricContextValue {
  activeMetric: MetricKey;
  setActiveMetric: (metric: MetricKey) => void;
}

const MetricContext = createContext<MetricContextValue | null>(null);

export function MetricProvider({ children }: { children: ReactNode }) {
  const [activeMetric, setActiveMetricState] = useState<MetricKey>("MedianSalesPrice");

  const setActiveMetric = useCallback((metric: MetricKey) => {
    setActiveMetricState(metric);
  }, []);

  return (
    <MetricContext.Provider value={{ activeMetric, setActiveMetric }}>
      {children}
    </MetricContext.Provider>
  );
}

export function useMetric(): MetricContextValue {
  const context = useContext(MetricContext);
  if (!context) {
    throw new Error("useMetric must be used within a MetricProvider");
  }
  return context;
}
