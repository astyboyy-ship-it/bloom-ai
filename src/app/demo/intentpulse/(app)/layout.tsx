import { IntentPulseApp } from "@/components/bloom/command-center/command-center";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <IntentPulseApp>{children}</IntentPulseApp>;
}