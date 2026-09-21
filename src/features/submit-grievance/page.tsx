"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { selectUser } from "@/features/auth/store/authSlice";
import { normalizeSubmitterType } from "@/features/metadata";
import { loadSubmitterProfile } from "@/lib/submitterProfile";
import { loadDraft } from "@/lib/drafts";
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

export default function SubmitGrievancePage() {
  // Pre-fills Step 1 from the signed-in user's profile (name, Fayda ID,
  // phone, submitter type), so they aren't asked for the same details
  // twice. Reading `user` straight into the `useState` initializers below
  // (rather than syncing it in via an effect once session restore resolves)
  // is safe for the case this guards against — `AuthBootstrapGate`
  // (src/app/providers.tsx) wraps the whole app and withholds every
  // protected route's subtree, this component included, while
  // `getMeThunk` is still in flight (`status` idle/loading), so this page
  // never mounts with `user` merely-not-yet-resolved. Verified live: this
  // shape prefills correctly on a direct navigation/refresh, no extra
  // re-sync-on-later-update effect needed. It does *not* cover a
  // `getMeThunk` that resolves to rejected (revoked session, invalid
  // refresh token) — `isRestoring` in AuthBootstrapGate only checks for
  // idle/loading, not failed, so this page can still mount with `user`
  // null in that case. Harmless here (every read below is optional-
  // chained, so it just renders unprefilled), and `store/index.ts`'s
  // `sessionExpiryMiddleware` redirects to /login shortly after — but
  // worth knowing this isn't an absolute guarantee against `user` being
  // null on mount, only against the ordinary restore-in-progress race.
  const user = useAppSelector(selectUser);

  // `user` only carries the fields the backend's own profile has (name,
  // Fayda ID, phone, email, type) — it has nothing for submitter-type-
  // specific fields RegisterForm.tsx's Profile step collects and persists
  // via `saveSubmitterProfile` (org name, registration number,
  // representative identity for cooperative/NGO/woreda_kebele/
  // development_agent types — see SI-CooperativeFPOForm.tsx etc.). Those
  // never reach the backend at all, so `loadSubmitterProfile` is the only
  // place they can come back from. `user`'s fields still win on overlap
  // (it's live/authoritative; this is a same-browser snapshot from
  // registration time that can go stale), this only fills in what `user`
  // doesn't have.
  const savedProfile = useMemo(
    () => (user?.email ? loadSubmitterProfile(user.email) : null),
    [user]
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Identifies this wizard session's Grievance Draft on the backend — needed
  // before any attachment can be uploaded, since `submit_document` requires
  // the draft to already exist for whichever `client_uuid` it's given.
  // Starts as a fresh id for a brand-new wizard; the effect below swaps it
  // for a resumed draft's real `client_uuid` if one comes back, so later
  // saves/uploads keep landing on the SAME draft rather than orphaning it.
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
    // Switching type mid-form invalidates whatever was entered for the
    // previous type's field set — carrying it over would show unrelated
    // stale values (or, worse, silently submit them) after the switch.
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  // The attachment's backend identity — lifted up here (not kept local to
  // GrievanceDetailsCard) for two reasons: page.tsx conditionally unmounts
  // that component on every Step 1<->2 navigation (`{currentStep === 2 &&
  // <GrievanceDetailsCard .../>}`), which would otherwise reset this on
  // every Back/Next; and Step 3's review card needs to know about it too,
  // including for a resumed draft's attachment, which has no local `File`
  // blob to read a name off.
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);

  // Guards every draft-dependent action (uploading, saving) until the
  // initial resume check below has settled. Without this, a fast typist on
  // a slow connection (the app's explicit target) could pick a file before
  // `loadDraft()` resolves — that upload would close over the original
  // throwaway `clientUuid`, then get orphaned the moment the resumed
  // draft's real one swaps in underneath it.
  const [draftCheckDone, setDraftCheckDone] = useState(false);

  // Resume the caller's saved draft, if one exists, once on mount. Only
  // `payload` (Step 2's fields, plus whichever attachment was last
  // uploaded) round-trips through the draft today — Step 1 stays prefilled
  // from the live user profile above, same as always. A 404 here just
  // means there's no draft yet, the ordinary case for anyone starting
  // fresh; only unexpected failures are logged.
  useEffect(() => {
    let cancelled = false;
    loadDraft()
      .then((draft) => {
        if (cancelled) return;
        setClientUuid(draft.client_uuid);
        const payload = draft.payload ?? {};
        if (typeof payload.serviceCategory === "string") setServiceCategory(payload.serviceCategory);
        if (typeof payload.grievanceType === "string") setGrievanceType(payload.grievanceType);
        if (typeof payload.region === "string") setRegion(payload.region);
        if (typeof payload.zone === "string") setZone(payload.zone);
        if (typeof payload.woreda === "string") setWoreda(payload.woreda);
        if (typeof payload.kebele === "string") setKebele(payload.kebele);
        if (typeof payload.description === "string") setDescription(payload.description);
        const validScanStatuses: string[] = Object.values(SCAN_STATUS);
        if (
          typeof payload.attachmentId === "string" &&
          typeof payload.attachmentFileName === "string" &&
          typeof payload.scanStatus === "string" &&
          validScanStatuses.includes(payload.scanStatus)
        ) {
          setAttachmentId(payload.attachmentId);
          setAttachmentFileName(payload.attachmentFileName);
          setScanStatus(payload.scanStatus as ScanStatus);
        }
        if (draft.step_reached >= 2) setCurrentStep(2);
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
  }, []);

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    // In a real application, you would scroll to top here or handle routing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setCurrentStep(1);
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
    // A fresh draft for the next grievance — reusing the old clientUuid
    // would let the new, supposedly-empty wizard resume the previous
    // grievance's already-submitted draft.
    setClientUuid(crypto.randomUUID());
    setResumedDraft(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isSubmitted) {
    return (
      <div className="font-sans pb-2">
        <GrievanceSubmittedCard onReset={handleReset} />
      </div>
    );
  }

  // Held back until the resume check above settles — see `draftCheckDone`'s
  // doc comment for the race this closes. One fast API call, so this is
  // never more than a brief flash in practice.
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
            onNext={handleNext}
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
