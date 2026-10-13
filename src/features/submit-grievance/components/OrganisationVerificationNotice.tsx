"use client";

import { useTranslations } from "next-intl";
import { Clock, PauseCircle } from "lucide-react";
import type { UserOrganisation } from "@/features/auth/store/authSlice";

/**
 * Why an NGO / FPO representative cannot submit yet: the organisation
 * is still In Review (an administrator has not verified it) or has been
 * Suspended. The wizard stays usable — they can fill in and save a grievance —
 * but the backend refuses the final submit until the organisation is Active,
 * which `ReviewAndSubmitCard` also blocks up front.
 *
 * Renders nothing for an organisation that may file.
 */
export function OrganisationVerificationNotice({ organisation }: { organisation: UserOrganisation | undefined }) {
  const t = useTranslations("submitGrievance.organisation");
  if (!organisation || organisation.canFile) return null;

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
