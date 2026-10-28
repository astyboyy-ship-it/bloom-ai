import { InfraApp } from "@/components/bloom/studio/infra/store";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <InfraApp>{children}</InfraApp>;
}