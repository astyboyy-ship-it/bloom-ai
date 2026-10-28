import { FoundryApp } from "@/components/bloom/studio/foundry/store";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <FoundryApp>{children}</FoundryApp>;
}