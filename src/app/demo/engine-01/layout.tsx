import { MarketingApp } from "@/components/bloom/studio/marketing/store";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MarketingApp>{children}</MarketingApp>;
}