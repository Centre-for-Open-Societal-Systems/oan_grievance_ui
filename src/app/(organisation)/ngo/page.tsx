import { OrganisationPage } from "@/features/organisation/components/OrganisationPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NGO Registration | Grievance Management Dashboard",
};

export default function NgoOrganisation() {
  return <OrganisationPage kind="ngo" />;
}
