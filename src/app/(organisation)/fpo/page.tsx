import { OrganisationPage } from "@/features/organisation/components/OrganisationPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FPO Registration | Grievance Management Dashboard",
};

export default function FpoOrganisation() {
  return <OrganisationPage kind="fpo" />;
}
