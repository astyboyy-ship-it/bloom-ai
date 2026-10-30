"use client";

import { createContext, useContext, useMemo } from "react";
import { keyHeaders, useDeskSettings } from "@/components/desk/settings";
import { useTelemetry } from "@/components/desk/use-telemetry";

type Telemetry = ReturnType<typeof useTelemetry>;
const TelemetryContext = createContext<Telemetry | null>(null);

/** One runtime probe for the whole OS: the header, home and diagnostics all read the same measurements. */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useDeskSettings();
  const headers = useMemo(() => keyHeaders(settings.keys), [settings.keys]);
  const t = useTelemetry(headers);
  return <TelemetryContext.Provider value={t}>{children}</TelemetryContext.Provider>;
}

export function useOsTelemetry(): Telemetry {
  const t = useContext(TelemetryContext);
  if (!t) throw new Error("useOsTelemetry must be used inside <TelemetryProvider>");
  return t;
}
