import { OrganisationPage } from "@/features/organisation/components/OrganisationPage";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("organisation.metadata");
  return { title: t("ngo") };
}

export default function NgoOrganisation() {
  return <OrganisationPage kind="ngo" />;
}
