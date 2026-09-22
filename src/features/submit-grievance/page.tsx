"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { selectUser } from "@/features/auth/store/authSlice";
import {
  normalizeSubmissionChannel,
  normalizeSubmitterType,
  selectSubmissionChannelOptions,
  selectSubmitterTypeOptions,
} from "@/features/metadata";
import { loadSubmitterProfile, saveSubmitterProfile } from "@/lib/submitterProfile";
import { loadDraft, saveDraft, submitDraft, type SaveDraftPayload } from "@/lib/drafts";
import { SCAN_STATUS, type ScanStatus } from "@/lib/attachments";
import { ApiError } from "@/lib/api/fetchApi";
import { logger } from "@/lib/logger";
import { useAppSelector } from "@/store/hooks";
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

  const user = useAppSelector(selectUser);
  const submitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const submissionChannels = useAppSelector(selectSubmissionChannelOptions);

  const savedProfile = useMemo(
    () => (user?.email ? loadSubmitterProfile(user.email) : null),
    [user]
  );

  // Derive wizard step from URL query parameters (default: 1)
  const stepParam = searchParams.get("step");
  const parsedStep = stepParam ? parseInt(stepParam, 10) : 1;
  const currentStep = [1, 2, 3].includes(parsedStep) ? parsedStep : 1;

  const goToStep = useCallback(
    (step: number, replace = false) => {
      const targetStep = Math.max(1, Math.min(3, step));
      const params = new URLSearchParams(searchParams.toString());
      if (targetStep <= 1) {
        params.delete("step");
      } else {
        params.set("step", String(targetStep));
      }
      const qs = params.toString();
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      if (replace) {
        router.replace(targetUrl, { scroll: false });
      } else {
        router.push(targetUrl, { scroll: false });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pathname, router, searchParams]
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID());
  const [resumedDraft, setResumedDraft] = useState(false);

  // Step 1 — Submitter Identity
  const [submitterType, setSubmitterType] = useState(() => {
    const normalized = user?.type ? normalizeSubmitterType(user.type) : "";
    const KNOWN_TYPES = ["individual", "cooperative", "ngo", "woreda_kebele", "development_agent"];
    if (KNOWN_TYPES.includes(normalized)) return normalized;
    return savedProfile?.submitterType ?? "";
  });
  const [submissionChannel, setSubmissionChannel] = useState(() => (user ? "web" : ""));
  const [identityValues, setIdentityValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = { ...savedProfile?.identityValues };
    if (user) {
      if (user.full_name) initial.fullName = user.full_name;
      if (user.fayda_id) initial.faydaId = user.fayda_id;
      if (user.mobile_no) initial.phoneNumber = user.mobile_no;
      if (user.email) initial.email = user.email;
    }
    return initial;
  });

  const handleSubmitterTypeChange = (value: string) => {
    setSubmitterType(value);
    setIdentityValues({});
  };

  const setIdentityValue = (key: string, value: string) => {
    setIdentityValues((prev) => {
      const next = { ...prev, [key]: value };
      if (user?.email) {
        saveSubmitterProfile(user.email, {
          submitterType,
          identityValues: next,
        });
      }
      return next;
    });
  };

  // Step 2 — Grievance Details
  const [serviceCategory, setServiceCategory] = useState("");
  const [grievanceType, setGrievanceType] = useState("");
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [woreda, setWoreda] = useState("");
  const [kebele, setKebele] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);

  const [draftCheckDone, setDraftCheckDone] = useState(false);

  // Resume saved draft on mount
  useEffect(() => {
    let cancelled = false;
    loadDraft()
      .then((draft) => {
        if (cancelled || !draft) return;
        if (draft.client_submission_uuid) setClientUuid(draft.client_submission_uuid);
        else if (draft.client_uuid) setClientUuid(draft.client_uuid);

        const payload = draft.payload ?? {};
        const cat = draft.service_category || (typeof payload.serviceCategory === "string" ? payload.serviceCategory : "");
        const type = draft.grievance_type || (typeof payload.grievanceType === "string" ? payload.grievanceType : "");
        const desc = draft.description || (typeof payload.description === "string" ? payload.description : "");
        const area = draft.administrative_area || (typeof payload.region === "string" ? payload.region : "");

        if (cat) setServiceCategory(cat);
        if (type) setGrievanceType(type);
        if (desc) setDescription(desc);
        if (area) setRegion(area);

        if (typeof payload.zone === "string") setZone(payload.zone);
        if (typeof payload.woreda === "string") setWoreda(payload.woreda);
        if (typeof payload.kebele === "string") setKebele(payload.kebele);
        if (draft.administrative_unit && !payload.woreda) setWoreda(draft.administrative_unit);

        if (draft.submitter_type) {
          const norm = normalizeSubmitterType(draft.submitter_type);
          setSubmitterType(norm);
        }
        if (draft.submission_channel) {
          setSubmissionChannel(normalizeSubmissionChannel(draft.submission_channel));
        }

        if (payload.identityValues && typeof payload.identityValues === "object") {
          setIdentityValues((prev) => ({
            ...prev,
            ...(payload.identityValues as Record<string, string>),
          }));
        } else if (draft.submitter_name || draft.contact_mobile || draft.contact_email) {
          setIdentityValues((prev) => ({
            ...prev,
            fullName: draft.submitter_name || prev.fullName || '',
            phoneNumber: draft.contact_mobile || prev.phoneNumber || '',
            email: draft.contact_email || prev.email || '',
          }));
        }

        if (draft.attachments && draft.attachments.length > 0) {
          const first = draft.attachments[0];
          if (first) {
            setAttachmentId(first.name);
            setAttachmentFileName(first.file_name);
            setScanStatus(SCAN_STATUS.CLEAN);
          }
        } else if (
          typeof payload.attachmentId === "string" &&
          typeof payload.attachmentFileName === "string"
        ) {
          setAttachmentId(payload.attachmentId);
          setAttachmentFileName(payload.attachmentFileName);
          const validScanStatuses: string[] = Object.values(SCAN_STATUS);
          if (typeof payload.scanStatus === "string" && validScanStatuses.includes(payload.scanStatus)) {
            setScanStatus(payload.scanStatus as ScanStatus);
          }
        }

        setResumedDraft(true);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) return;
        logger.error("Failed to load saved draft:", error);
      })
      .finally(() => {
        if (!cancelled) setDraftCheckDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getFullDraftPayload = (): SaveDraftPayload => {
    const submitterName =
      identityValues.fullName ||
      identityValues.representativeName ||
      identityValues.cooperativeName ||
      identityValues.ngoName ||
      identityValues.bodyName ||
      identityValues.agentName ||
      user?.full_name ||
      "";
    const contactMobile = identityValues.phoneNumber || user?.mobile_no || "";
    const contactEmail = identityValues.email || user?.email || "";
    const area = kebele || woreda || zone || region || "";

    return {
      client_submission_uuid: clientUuid,
      submitter_type: submitterType ? (labelFor(submitterTypes, submitterType) || submitterType) : undefined,
      submission_channel: submissionChannel ? (labelFor(submissionChannels, submissionChannel) || submissionChannel) : "Web Portal",
      submitter_name: submitterName || undefined,
      contact_mobile: contactMobile || undefined,
      contact_email: contactEmail || undefined,
      administrative_area: area || undefined,
      service_category: serviceCategory || undefined,
      grievance_type: grievanceType || undefined,
      description: description || undefined,
    };
  };

  const persistSubmitterProfile = () => {
    if (user?.email) {
      saveSubmitterProfile(user.email, {
        submitterType,
        identityValues,
      });
    }
  };

  const handleSaveDraft = async () => {
    setDraftSaveState("saving");
    persistSubmitterProfile();
    try {
      await saveDraft(getFullDraftPayload());
      setDraftSaveState("saved");
    } catch (saveError) {
      setDraftSaveState("error");
      logger.error("Failed to save draft:", saveError);
    }
  };

  const handleStep1Next = () => {
    persistSubmitterProfile();
    try {
      void saveDraft(getFullDraftPayload());
    } catch {
      // background best-effort save
    }
    goToStep(2);
  };

  const handleStep2Next = () => {
    persistSubmitterProfile();
    try {
      void saveDraft(getFullDraftPayload());
    } catch {
      // background best-effort save
    }
    goToStep(3);
  };

  const handleBack = () => {
    goToStep(Math.max(currentStep - 1, 1));
  };

  // Guard: if user opens step 2 or 3 directly before step 1 is filled, return to step 1
  useEffect(() => {
    if (draftCheckDone && currentStep > 1 && !submitterType) {
      goToStep(1, true);
    }
  }, [draftCheckDone, currentStep, submitterType, goToStep]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    persistSubmitterProfile();
    try {
      const payload = {
        ...getFullDraftPayload(),
        consent_given: 1,
      };
      const result = await submitDraft(payload);
      setSubmittedTicketNumber(result.ticket_number);
      setIsSubmitted(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("step");
      const targetUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(targetUrl, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      logger.error("Failed to submit grievance:", err);
      const msg = err instanceof Error ? err.message : "Failed to submit grievance. Please check required fields.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSubmittedTicketNumber(null);
    setSubmitError(null);
    goToStep(1, true);
    setSubmitterType("");
    setSubmissionChannel("");
    setIdentityValues({});
    setServiceCategory("");
    setGrievanceType("");
    setRegion("");
    setZone("");
    setWoreda("");
    setKebele("");
    setDescription("");
    setUploadedFile(null);
    setAttachmentId(null);
    setScanStatus(null);
    setAttachmentFileName(null);
    setClientUuid(crypto.randomUUID());
    setResumedDraft(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isSubmitted) {
    return (
      <div className="font-sans pb-2">
        <GrievanceSubmittedCard onReset={handleReset} ticketNumber={submittedTicketNumber} />
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

      {resumedDraft && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-[#0b8535]">
          <span>Resumed your saved draft — your grievance details are filled back in.</span>
          <button
            onClick={() => setResumedDraft(false)}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 hover:bg-green-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stepper */}
      <Stepper currentStep={currentStep} />

      {/* Main Content Area */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <SubmitterIdentityCard
            onNext={handleStep1Next}
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
            onNext={handleStep2Next}
            onBack={handleBack}
            clientUuid={clientUuid}
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
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            draftSaveState={draftSaveState}
            isSubmitting={isSubmitting}
            submitError={submitError}
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
            uploadedFile={uploadedFile}
            attachmentFileName={attachmentFileName}
          />
        )}
      </div>
    </div>
  );
}
