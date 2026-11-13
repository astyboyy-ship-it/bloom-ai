import { notFound } from "next/navigation";
import { COMPANY_IDS } from "@/components/pulse/companies";
import { CompanyRoute } from "@/components/pulse/company-route";

export function generateStaticParams() {
  return COMPANY_IDS.map((company) => ({ company }));
}

/** /desk/feed/[company]: a company's page in the architecture feed (illustrative blueprint). */
export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  if (!(COMPANY_IDS as string[]).includes(company)) notFound();
  return <CompanyRoute id={company} />;
}
