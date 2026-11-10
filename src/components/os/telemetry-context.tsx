"use client";

import { createContext, useContext, useMemo } from "react";
import { keyHeaders, useDeskSettings } from "@/components/desk/settings";
import { useTelemetry } from "@/components/desk/use-telemetry";

type Telemetry = ReturnType<typeof useTelemetry>;
const TelemetryContext = createContext<Telemetry | null>(null);

/** One runtime probe for the whole OS: the header, home and diagnostics all read the same measurements. */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useDeskSettings();
  // The license rides along so the manifest reports the mode this workspace's runs actually get (live or simulation).
  const headers = useMemo(() => ({ ...keyHeaders(settings.keys), ...(settings.licenseKey && { "x-bloom-license": settings.licenseKey }) }), [settings.keys, settings.licenseKey]);
  const t = useTelemetry(headers);
  return <TelemetryContext.Provider value={t}>{children}</TelemetryContext.Provider>;
}

export function useOsTelemetry(): Telemetry {
  const t = useContext(TelemetryContext);
  if (!t) throw new Error("useOsTelemetry must be used inside <TelemetryProvider>");
  return t;
}
