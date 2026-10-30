import type { Metadata } from "next";
import { DownloadPage } from "@/components/desktop/download-page";

export const metadata: Metadata = {
  title: "Download Bloom AI Desktop",
  description: "Bloom AI Desktop for Windows and macOS: BLOOM AI // OPERATING DESK as a native app.",
};

export default function Page() {
  return <DownloadPage />;
}
