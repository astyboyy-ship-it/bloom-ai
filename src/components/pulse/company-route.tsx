"use client";

import { companyById } from "./companies";
import { CompanyPageView } from "./company-page";

/** Client entry for /desk/feed/[company]: looks the company up and renders its page. */
export function CompanyRoute({ id }: { id: string }) {
  const company = companyById(id);
  if (!company) return null;
  return <CompanyPageView company={company} />;
}
