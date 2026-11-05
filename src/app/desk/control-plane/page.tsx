import type { Metadata } from "next";
import { ControlPlane } from "@/components/control-plane/control-plane";

export const metadata: Metadata = { title: "Neural Control Plane" };

/** Locked: src/middleware.ts verifies the access key and its accessNeuralControlPlane grant before this renders. */
export default function Page() {
  return <ControlPlane />;
}
