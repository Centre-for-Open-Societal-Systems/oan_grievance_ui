"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { selectUser } from "@/features/auth/store/authSlice";
import {
  findFilingArea,
  normalizeSubmissionChannel,
  normalizeSubmitterType,
  selectServiceCategoryOptions,
  selectSubmissionChannelOptions,
  selectSubmitterTypeOptions,
} from "@/features/metadata";
import { buildInitialIdentityValues, identityAfterReset, resolveInitialSubmitterType } from "./initialIdentity";
import { buildSaveDraftPayload } from "./draftPayload";
import { loadSubmitterProfile } from "@/lib/submitterProfile";
import { discardDraft, loadDraft } from "@/lib/drafts";
import { SCAN_STATUS, type ScanStatus } from "@/lib/attachments";
import { ApiError } from "@/lib/api/fetchApi";
import { logger } from "@/lib/logger";
import type { RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import type { SubmitGrievanceResult } from "./api/submitGrievanceApi";
import { Stepper } from "./components/Stepper";
import { SubmitterIdentityCard } from "./components/SubmitterIdentityCard";
import { GrievanceDetailsCard } from "./components/GrievanceDetailsCard";
import { ReviewAndSubmitCard } from "./components/ReviewAndSubmitCard";
import { GrievanceSubmittedCard } from "./components/GrievanceSubmittedCard";
import { SubmitGrievanceHeader } from "./components/TopHeader";

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
  const currentStep = !isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 3 ? parsedStep : 1;

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

  const savedProfile = useMemo(
    () => (user?.email ? loadSubmitterProfile(user.email) : null),
    [user]
  );

  // What the backend returned once the grievance has been filed (ticket
  // number, status, SLA date, ...). Its presence is what puts the page into
  // the "submitted" state.
  const [submitted, setSubmitted] = useState<SubmitGrievanceResult | null>(null);

  // Identifies this wizard session's Grievance Draft on the backend — needed
  // before any attachment can be uploaded, since `submit_document` requires
  // the draft to already exist for whichever `client_uuid` it's given.
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID());
  const [resumedDraft, setResumedDraft] = useState(false);
  // "Discard draft" is destructive (the backend deletes the draft and its
  // uploads), so it takes a second click to confirm rather than firing at once.
  const [discardState, setDiscardState] = useState<"idle" | "confirming" | "discarding">("idle");
  const [discardError, setDiscardError] = useState<string | null>(null);

  // Step 1 — Submitter Identity
  const [submitterType, setSubmitterType] = useState(() => resolveInitialSubmitterType(user, savedProfile));
  const [submissionChannel, setSubmissionChannel] = useState(() => (user ? "web" : ""));
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
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [woreda, setWoreda] = useState("");
  const [kebele, setKebele] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);

  // Guards every draft-dependent action (uploading, saving) until the
  // initial resume check below has settled.
  const [draftCheckDone, setDraftCheckDone] = useState(false);

  // Resume the caller's saved draft, if one exists, once on mount.
  useEffect(() => {
    let cancelled = false;
    loadDraft()
      .then((draft) => {
        if (cancelled) return;
        setClientUuid(draft.client_submission_uuid);
        if (draft.submitter_type) setSubmitterType(normalizeSubmitterType(draft.submitter_type));
        if (draft.submission_channel) setSubmissionChannel(normalizeSubmissionChannel(draft.submission_channel));
        setIdentityValues((prev) => {
          if (!draft.submitter_name && !draft.contact_mobile && !draft.contact_email) return prev;
          const next = { ...prev };
          if (draft.submitter_name) next.fullName = draft.submitter_name;
          if (draft.contact_mobile) {
            next.phoneCode = prev.phoneCode || "+251";
            next.phoneNumber = draft.contact_mobile;
          }
          if (draft.contact_email) next.email = draft.contact_email;
          return next;
        });
        if (draft.service_category) setServiceCategory(draft.service_category);
        if (draft.grievance_type) setGrievanceType(draft.grievance_type);
        const h = draft.administrative_hierarchy;
        if (h?.region) setRegion(h.region);
        if (h?.zone) setZone(h.zone);
        if (h?.woreda) setWoreda(h.woreda);
        if (h?.kebele) setKebele(h.kebele);
        else if (draft.administrative_unit) setKebele(draft.administrative_unit);
        if (draft.description) setDescription(draft.description);
        if (draft.desired_outcome) setDesiredOutcome(draft.desired_outcome);
        if (draft.associated_service_provider) setServiceProvider(draft.associated_service_provider);
        if (draft.attachments && draft.attachments.length > 0) {
          const first = draft.attachments[0];
          const validScanStatuses: string[] = Object.values(SCAN_STATUS);
          if (first && validScanStatuses.includes(first.scan_status)) {
            setAttachmentId(first.name);
            setAttachmentFileName(first.file_name);
            setScanStatus(first.scan_status as ScanStatus);
          }
        }
        if (!stepParam && (h?.region || h?.woreda || draft.service_category || draft.description)) {
          goToStep(2, true);
        }
        setResumedDraft(true);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) return; // no saved draft — the normal case
        logger.error("Failed to load saved draft:", error);
      })
      .finally(() => {
        if (!cancelled) setDraftCheckDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [goToStep, stepParam]);

  const handleNext = () => {
    goToStep(Math.min(currentStep + 1, 3));
  };

  const handleBack = () => {
    goToStep(Math.max(currentStep - 1, 1));
  };

  const handleSubmitted = (result: SubmitGrievanceResult) => {
    setSubmitted(result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetDraftFields = () => {
    setServiceCategory("");
    setGrievanceType("");
    setRegion("");
    setZone("");
    setWoreda("");
    setKebele("");
    setDescription("");
    setDesiredOutcome("");
    setServiceProvider("");
    setUploadedFile(null);
    setAttachmentId(null);
    setScanStatus(null);
    setAttachmentFileName(null);
    setClientUuid(crypto.randomUUID());
    setResumedDraft(false);
  };

  const handleReset = () => {
    setSubmitted(null);
    goToStep(1, true);
    setIdentityValues((prev) => identityAfterReset(submitterType, prev));
    resetDraftFields();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDiscardDraft = async () => {
    setDiscardState("discarding");
    setDiscardError(null);
    try {
      await discardDraft(clientUuid);
    } catch (error) {
      logger.error("Failed to discard draft:", error);
      setDiscardError("We could not discard your draft. Please try again.");
      setDiscardState("idle");
      return;
    }
    resetDraftFields();
    if (currentStep > 2) {
      goToStep(2, true);
    }
    setDiscardState("idle");
  };

  const submitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const submissionChannels = useAppSelector(selectSubmissionChannelOptions);
  const serviceCategories = useAppSelector(selectServiceCategoryOptions);
  const metadata = useAppSelector((state) => state.metadata);
  const filingArea = useMemo(
    () => findFilingArea({ metadata } as RootState, { region, zone, woreda, kebele }),
    [metadata, region, zone, woreda, kebele]
  );

  const draftPayload = buildSaveDraftPayload({
    clientSubmissionUuid: clientUuid,
    submissionChannelLabel: submissionChannel ? labelFor(submissionChannels, submissionChannel) : undefined,
    submitterType,
    submitterTypeLabel: submitterType ? labelFor(submitterTypes, submitterType) : undefined,
    identityValues,
    userFullName: user?.full_name,
    userMobile: user?.mobile_no,
    userEmail: user?.email,
    administrativeAreaId: filingArea?.area_id,
    kebele,
    serviceCategoryLabel: serviceCategory ? labelFor(serviceCategories, serviceCategory) : undefined,
    grievanceType,
    associatedServiceProvider: serviceProvider,
    description,
    desiredOutcome,
  });

  if (submitted) {
    return (
      <div className="font-sans pb-2">
        <GrievanceSubmittedCard result={submitted} onReset={handleReset} />
      </div>
    );
  }

  if (!draftCheckDone) {
    return (
      <div className="flex flex-col gap-6 font-sans pb-2">
        <SubmitGrievanceHeader />
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans pb-2">
      {/* Back Button */}
      {currentStep > 1 && (
        <div className="flex items-center -mb-2">
          <button 
            onClick={() => {
               if (currentStep > 1) {
                  handleBack();
               }
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-[15px] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
            Back
          </button>
        </div>
      )}

      {/* Page Header */}
      <SubmitGrievanceHeader />

      {resumedDraft && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-[#0b8535]">
          <div className="flex items-center justify-between gap-3">
            <span>Resumed your saved draft — your grievance details are filled back in.</span>
            <div className="flex shrink-0 items-center gap-2">
              {discardState === "idle" ? (
                <button
                  onClick={() => setDiscardState("confirming")}
                  className="rounded-lg px-2 py-1 font-semibold hover:bg-green-100"
                >
                  Discard draft
                </button>
              ) : (
                <>
                  <span className="font-semibold">Delete this draft?</span>
                  <button
                    onClick={handleDiscardDraft}
                    disabled={discardState === "discarding"}
                    className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {discardState === "discarding" ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setDiscardState("idle")}
                    disabled={discardState === "discarding"}
                    className="rounded-lg px-2 py-1 font-semibold hover:bg-green-100 disabled:opacity-60"
                  >
                    Keep
                  </button>
                </>
              )}
              <button
                onClick={() => setResumedDraft(false)}
                aria-label="Dismiss"
                className="rounded-lg p-1 hover:bg-green-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {discardError && (
            <p role="alert" className="mt-2 font-medium text-red-700">
              {discardError}
            </p>
          )}
        </div>
      )}

      {/* Stepper */}
      <Stepper currentStep={currentStep} onStepClick={(step) => goToStep(step)} />

      {/* Main Content Area */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <SubmitterIdentityCard
            onNext={handleNext}
            draftPayload={draftPayload}
            submitterType={submitterType}
            setSubmitterType={handleSubmitterTypeChange}
            submissionChannel={submissionChannel}
            setSubmissionChannel={setSubmissionChannel}
            identityValues={identityValues}
            setIdentityValue={setIdentityValue}
          />
        )}
        {currentStep === 2 && (
          <GrievanceDetailsCard
            onNext={handleNext}
            onBack={handleBack}
            clientUuid={clientUuid}
            submitterType={submitterType}
            submissionChannel={submissionChannel}
            identityValues={identityValues}
            userFullName={user?.full_name}
            userMobile={user?.mobile_no}
            userEmail={user?.email}
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
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
            attachmentId={attachmentId}
            setAttachmentId={setAttachmentId}
            scanStatus={scanStatus}
            setScanStatus={setScanStatus}
            attachmentFileName={attachmentFileName}
            setAttachmentFileName={setAttachmentFileName}
          />
        )}
        {currentStep === 3 && (
          <ReviewAndSubmitCard
            onBack={handleBack}
            onSubmitted={handleSubmitted}
            draftPayload={draftPayload}
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
            serviceProvider={serviceProvider}
            uploadedFile={uploadedFile}
            attachmentFileName={attachmentFileName}
          />
        )}
      </div>
    </div>
  );
}
