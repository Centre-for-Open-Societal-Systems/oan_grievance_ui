"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, PauseCircle } from "lucide-react";
import type { UserOrganisation } from "@/features/auth/store/authSlice";
import { ORGANISATION_ROUTE, type OrganisationKind } from "@/lib/organisationKind";

interface OrganisationVerificationNoticeProps {
  organisation: UserOrganisation | undefined;
  /** Set for an NGO / FPO account (by its type) that has not registered its organisation yet. */
  unregisteredKind?: OrganisationKind | null;
}

/**
 * Why an NGO / FPO representative cannot submit yet: the organisation
 * is still In Review (an administrator has not verified it), has been
 * Suspended, or has not been registered at all. The wizard stays usable —
 * they can fill in and save a grievance — but the final submit is blocked
 * until the organisation is Active (`ReviewAndSubmitCard` blocks it up front,
 * and the backend refuses an organisation that is not Active).
 *
 * Renders nothing for an organisation that may file.
 */
export function OrganisationVerificationNotice({ organisation, unregisteredKind }: OrganisationVerificationNoticeProps) {
  const t = useTranslations("submitGrievance.organisation");

  if (!organisation) {
    if (!unregisteredKind) return null;
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{t("unregisteredTitle")}</p>
          <p className="mt-0.5">{t("unregisteredBody")}</p>
          <Link href={ORGANISATION_ROUTE[unregisteredKind]} className="mt-1 inline-block font-semibold underline">
            {t("unregisteredAction")}
          </Link>
        </div>
      </div>
    );
  }
  if (organisation.canFile) return null;

  const suspended = organisation.status === "Suspended";
  const Icon = suspended ? PauseCircle : Clock;
  const tone = suspended ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{suspended ? t("suspendedTitle") : t("inReviewTitle")}</p>
        <p className="mt-0.5">
          {suspended ? t("suspendedBody", { name: organisation.legalName }) : t("inReviewBody", { name: organisation.legalName })}
        </p>
        {organisation.statusReason && (
          <p className="mt-1 font-medium">{t("reason", { reason: organisation.statusReason })}</p>
        )}
      </div>
    </div>
  );
}
