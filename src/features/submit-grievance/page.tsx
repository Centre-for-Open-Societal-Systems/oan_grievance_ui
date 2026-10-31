"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchAdministrativeAreaAncestors } from "@/features/metadata/api/metadataApi";
import { selectUser } from "@/features/auth/store/authSlice";
import {
  selectServiceCategoryOptions,
  selectSubmissionChannelOptions,
  selectSubmitterTypeOptions,
  type AreaRef,
} from "@/features/metadata";
import { useTranslations } from "next-intl";
import {
  buildInitialIdentityValues,
  identityAfterReset,
  isIndividualFarmer,
  isSubmitterTypeLocked,
  resolveInitialSubmissionChannel,
  resolveInitialSubmitterType,
} from "./initialIdentity";
import { buildSubmitFields } from "./submitPayload";
import { firstIncompleteStep, type WizardStep } from "./wizardSteps";
import { loadSubmitterProfile } from "@/lib/submitterProfile";
import { organisationKindOf } from "@/lib/organisationKind";
import type { WizardAttachment } from "@/lib/attachments";
import { useAppSelector } from "@/store/hooks";
import type { SubmitGrievanceResult } from "./api/submitGrievanceApi";
import { Stepper } from "./components/Stepper";
import { SubmitterIdentityCard } from "./components/SubmitterIdentityCard";
import { GrievanceDetailsCard } from "./components/GrievanceDetailsCard";
import { ReviewAndSubmitCard } from "./components/ReviewAndSubmitCard";
import { GrievanceSubmittedCard } from "./components/GrievanceSubmittedCard";
import { OrganisationVerificationNotice } from "./components/OrganisationVerificationNotice";
import { SubmitGrievanceHeader } from "./components/TopHeader";
import type { ServiceProviderRef } from "./api/serviceProviderApi";

function labelFor(options: { value: string; label: string }[], value: string): string {
  return (
    options.find((o) => o.value.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.label.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.value === value)?.label ||
    value
  );
}

export default function SubmitGrievancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current step from URL query parameter (?step=1, ?step=2, ?step=3)
  // so refreshing or sharing preserving current step without defaulting to step 1.
  const stepParam = searchParams.get("step");
  const parsedStep = stepParam ? parseInt(stepParam, 10) : NaN;
  const requestedStep = (!isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 3 ? parsedStep : 1) as WizardStep;

  const goToStep = useCallback(
    (targetStep: number, replace = false) => {
      const clamped = Math.min(Math.max(targetStep, 1), 3);
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(clamped));
      const newUrl = `${pathname}?${params.toString()}`;
      if (replace) {
        router.replace(newUrl, { scroll: false });
      } else {
        router.push(newUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams]
  );

  // Pre-fills Step 1 from the signed-in user's profile (name, Fayda ID,
  // phone, submitter type), so they aren't asked for the same details
  // twice.
  const user = useAppSelector(selectUser);
  const tOrganisation = useTranslations("submitGrievance.organisation");

  const savedProfile = useMemo(
    () => (user?.email ? loadSubmitterProfile(user.email) : null),
    [user]
  );

  // What the backend returned once the grievance has been filed (ticket
  // number, status, SLA date, ...). Its presence is what puts the page into
  // the "submitted" state.
  const [submitted, setSubmitted] = useState<SubmitGrievanceResult | null>(null);

  // Identifies this wizard session's submission — sent as
  // `client_submission_uuid` so a retried submit is recognised by the backend
  // rather than filed twice.
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID());

  // Step 1 — Submitter Identity
  const [submitterType, setSubmitterType] = useState(() => resolveInitialSubmitterType(user, savedProfile));
  const [submissionChannel, setSubmissionChannel] = useState(() => resolveInitialSubmissionChannel(user));
  const [identityValues, setIdentityValues] = useState<Record<string, string>>(() =>
    buildInitialIdentityValues(user, savedProfile, resolveInitialSubmitterType(user, savedProfile))
  );

  const handleSubmitterTypeChange = (value: string) => {
    setSubmitterType(value);
    setIdentityValues({});
  };

  const setIdentityValue = (key: string, value: string) => {
    setIdentityValues((prev) => ({ ...prev, [key]: value }));
  };

  // Step 2 — Grievance Details
  const [serviceCategory, setServiceCategory] = useState("");
  const [grievanceType, setGrievanceType] = useState("");
  const [region, setRegion] = useState<AreaRef | null>(null);
  const [zone, setZone] = useState<AreaRef | null>(null);
  const [woreda, setWoreda] = useState<AreaRef | null>(null);
  const [kebele, setKebele] = useState<AreaRef | null>(null);
  // Pre-fills the location from the account's own area (set from the identity
  // provider's address at sign-in), once — never over a choice already made.
  const profileArea = user?.administrative_area;
  const prefilledArea = useRef<string | null>(null);
  useEffect(() => {
    if (!profileArea || prefilledArea.current === profileArea) return;
    prefilledArea.current = profileArea;
    fetchAdministrativeAreaAncestors(profileArea)
      .then(({ current, breadcrumbs }) => {
        const chain = [...breadcrumbs, ...(current ? [current] : [])];
        const refFor = (level: string): AreaRef | null => {
          const node = chain.find((n) => n.level_name === level);
          return node ? { id: node.area_id, name: node.area_name, pathCode: node.path_code ?? "" } : null;
        };
        setRegion((prev) => prev ?? refFor("Region"));
        setZone((prev) => prev ?? refFor("Zone"));
        setWoreda((prev) => prev ?? refFor("Woreda"));
        setKebele((prev) => prev ?? refFor("Kebele"));
      })
      .catch(() => {
        // Best-effort: the dropdowns simply stay empty.
      });
  }, [profileArea]);
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [serviceProvider, setServiceProvider] = useState<ServiceProviderRef | null>(null);
  // The attachment list — lifted up here (not kept local to
  // GrievanceDetailsCard) for two reasons: page.tsx conditionally unmounts
  // that component on every Step 1<->2 navigation (`{currentStep === 2 &&
  // <GrievanceDetailsCard .../>}`), which would otherwise reset this on
  // every Back/Next; and Step 3's review card needs to know about it too.
  // The files upload once the grievance is filed.
  const [attachments, setAttachments] = useState<WizardAttachment[]>([]);

  const hasVoiceNote = attachments.some((a) => a.kind === "voice");

  // The step shown is the URL's, clamped to the furthest one the wizard's
  // data allows — opening `?step=3` directly, or reloading it once the
  // in-memory data is gone, lands on the first step that still needs work.
  const currentStep = Math.min(
    requestedStep,
    firstIncompleteStep({
      submitterType, submissionChannel, identityValues,
      serviceCategory, grievanceType, region, zone, woreda, description, hasVoiceNote,
    })
  ) as WizardStep;

  // Keeps the URL in step with the clamp above, so Back and reload agree with what's shown.
  useEffect(() => {
    if (!submitted && stepParam && requestedStep !== currentStep) {
      goToStep(currentStep, true);
    }
  }, [submitted, stepParam, requestedStep, currentStep, goToStep]);

  const handleNext = () => {
    goToStep(Math.min(currentStep + 1, 3));
  };

  const handleBack = () => {
    goToStep(Math.max(currentStep - 1, 1));
  };

  const handleSubmitted = (result: SubmitGrievanceResult) => {
    setSubmitted(result);
    // The wizard's data is gone once it's filed — drop `?step=` so a reload
    // starts a fresh Step 1 rather than an empty Review & Submit.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("step");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFields = () => {
    setServiceCategory("");
    setGrievanceType("");
    setRegion(null);
    setZone(null);
    setWoreda(null);
    setKebele(null);
    setDescription("");
    setDesiredOutcome("");
    setServiceProvider(null);
    setAttachments([]);
    // A fresh submission key for the next grievance — reusing the old one
    // would make the backend treat the next, different grievance as a retry
    // of the one just filed.
    setClientUuid(crypto.randomUUID());
  };

  const handleReset = () => {
    setSubmitted(null);
    goToStep(1, true);
    setIdentityValues((prev) => identityAfterReset(submitterType, prev));
    resetFields();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // A farmer signed in through the identity provider cannot edit what it supplied — only when it
  // did supply a value, so an empty field stays fillable. The Fayda ID is left editable.
  const providerOwnedFields = user?.id_source
    ? (["fullName", "phoneNumber"] as const).filter((key) => identityValues[key]?.trim())
    : undefined;

  const submitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const submissionChannels = useAppSelector(selectSubmissionChannelOptions);
  const serviceCategories = useAppSelector(selectServiceCategoryOptions);

  const submitFields = buildSubmitFields({
    clientSubmissionUuid: clientUuid,
    submissionChannelLabel: submissionChannel ? labelFor(submissionChannels, submissionChannel) : undefined,
    submitterType,
    submitterTypeLabel: submitterType ? labelFor(submitterTypes, submitterType) : undefined,
    identityValues,
    userFullName: user?.full_name,
    userMobile: user?.mobile_no,
    userEmail: user?.email,
    administrativeAreaId: (kebele ?? woreda)?.id,
    kebele: kebele?.name,
    serviceCategoryLabel: serviceCategory ? labelFor(serviceCategories, serviceCategory) : undefined,
    grievanceType,
    associatedServiceProvider: serviceProvider?.id,
    description,
    hasVoiceNote,
    desiredOutcome,
  });

  // An NGO / FPO may only file once its organisation is verified — see OrganisationVerificationNotice.
  // An NGO / FPO account (by its type) with no organisation at all has not even registered it yet,
  // and is held back the same way: the backend only checks an account that has an organisation,
  // so without this it could file as a plain, unverified NGO.
  const unregisteredKind = user?.organisation ? null : organisationKindOf(user);
  const submissionBlockedMessage = user?.organisation
    ? user.organisation.canFile
      ? undefined
      : tOrganisation("submitBlocked")
    : unregisteredKind
      ? tOrganisation("unregisteredSubmitBlocked")
      : undefined;

  if (submitted) {
    return (
      <div className="font-sans pb-2">
        <GrievanceSubmittedCard result={submitted} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans pb-2">
      {/* Back Button */}
      {currentStep > 1 && (
        <div className="flex items-center -mb-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-[15px] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
            Back
          </button>
        </div>
      )}

      {/* Page Header */}
      <SubmitGrievanceHeader />

      <OrganisationVerificationNotice organisation={user?.organisation} unregisteredKind={unregisteredKind} />

      {/* Stepper */}
      <Stepper currentStep={currentStep} onStepClick={(step) => goToStep(step)} />

      {/* Main Content Area */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <SubmitterIdentityCard
            onNext={handleNext}
            submitterType={submitterType}
            setSubmitterType={handleSubmitterTypeChange}
            submissionChannel={submissionChannel}
            setSubmissionChannel={setSubmissionChannel}
            identityValues={identityValues}
            setIdentityValue={setIdentityValue}
            submitterTypeLocked={isSubmitterTypeLocked(user) || isIndividualFarmer(user)}
            submissionChannelLocked={isIndividualFarmer(user)}
            readOnlyFields={providerOwnedFields}
            profileSubmitterType={user?.submitter_type || user?.type}
            profileSubmissionChannel={user?.submission_channel}
          />
        )}
        {currentStep === 2 && (
          <GrievanceDetailsCard
            onNext={handleNext}
            onBack={handleBack}
            serviceCategory={serviceCategory}
            setServiceCategory={setServiceCategory}
            grievanceType={grievanceType}
            setGrievanceType={setGrievanceType}
            region={region}
            setRegion={setRegion}
            zone={zone}
            setZone={setZone}
            woreda={woreda}
            setWoreda={setWoreda}
            kebele={kebele}
            setKebele={setKebele}
            description={description}
            setDescription={setDescription}
            desiredOutcome={desiredOutcome}
            setDesiredOutcome={setDesiredOutcome}
            serviceProvider={serviceProvider}
            setServiceProvider={setServiceProvider}
            attachments={attachments}
            setAttachments={setAttachments}
          />
        )}
        {currentStep === 3 && (
          <ReviewAndSubmitCard
            onBack={handleBack}
            onSubmitted={handleSubmitted}
            submitFields={submitFields}
            submitterType={submitterType}
            submissionChannel={submissionChannel}
            identityValues={identityValues}
            serviceCategory={serviceCategory}
            grievanceType={grievanceType}
            region={region}
            zone={zone}
            woreda={woreda}
            kebele={kebele}
            description={description}
            desiredOutcome={desiredOutcome}
            serviceProvider={serviceProvider?.name}
            attachments={attachments}
            submissionBlockedMessage={submissionBlockedMessage}
          />
        )}
      </div>
    </div>
  );
}
