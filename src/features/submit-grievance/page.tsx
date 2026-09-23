"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
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
  // What the backend returned once the grievance has been filed (ticket
  // number, status, SLA date, ...). Its presence is what puts the page into
  // the "submitted" state.
  const [submitted, setSubmitted] = useState<SubmitGrievanceResult | null>(null);

  // Identifies this wizard session's Grievance Draft on the backend — needed
  // before any attachment can be uploaded, since `submit_document` requires
  // the draft to already exist for whichever `client_uuid` it's given.
  // Starts as a fresh id for a brand-new wizard; the effect below swaps it
  // for a resumed draft's real `client_uuid` if one comes back, so later
  // saves/uploads keep landing on the SAME draft rather than orphaning it.
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID());
  const [resumedDraft, setResumedDraft] = useState(false);
  // "Discard draft" is destructive (the backend deletes the draft and its
  // uploads), so it takes a second click to confirm rather than firing at once.
  const [discardState, setDiscardState] = useState<"idle" | "confirming" | "discarding">("idle");
  const [discardError, setDiscardError] = useState<string | null>(null);

  // Step 1 — Submitter Identity
  const [submitterType, setSubmitterType] = useState(() => resolveInitialSubmitterType(user, savedProfile));
  const [submissionChannel, setSubmissionChannel] = useState(() => (user ? "web" : ""));
  // Nothing is prefilled for a Development Agent — see `buildInitialIdentityValues`.
  const [identityValues, setIdentityValues] = useState<Record<string, string>>(() =>
    buildInitialIdentityValues(user, savedProfile, resolveInitialSubmitterType(user, savedProfile))
  );

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
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
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

  // Resume the caller's saved draft, if one exists, once on mount. A draft is
  // a Grievance document itself (`workflow_state="Draft"`), flat fields, not
  // a separate JSON blob — so this reads the same field set Step 1/2/3's own
  // Save Draft buttons write via `buildSaveDraftPayload`. A 404 here just
  // means there's no draft yet, the ordinary case for anyone starting fresh;
  // only unexpected failures are logged.
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
        if (h?.region || h?.woreda) setCurrentStep(2);
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

  const handleSubmitted = (result: SubmitGrievanceResult) => {
    setSubmitted(result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2's fields, the attachment, and the draft identity — everything a
  // saved draft carries. Shared by the two ways of starting over (after a
  // submit, or after discarding a resumed draft) so they can't drift apart.
  // Step 1 is deliberately not in here: discarding a draft shouldn't wipe the
  // identity fields prefilled from the user's profile.
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
    // A fresh draft for the next grievance — reusing the old clientUuid
    // would let the new, supposedly-empty wizard resume the previous
    // grievance's already-submitted draft.
    setClientUuid(crypto.randomUUID());
    setResumedDraft(false);
  };

  // Starting over for the next grievance keeps Step 1 (type, channel and, for
  // most types, identity) — see `identityAfterReset` for the one exception.
  const handleReset = () => {
    setSubmitted(null);
    setCurrentStep(1);
    setIdentityValues((prev) => identityAfterReset(submitterType, prev));
    resetDraftFields();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Deletes the saved draft (and anything uploaded against it) server-side,
  // then starts Step 2 over. Only offered on a resumed draft. On failure the
  // wizard is left exactly as it was — clearing the screen while the draft
  // still exists would show an empty form that resumes full again on reload.
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
    setCurrentStep((prev) => Math.min(prev, 2));
    setDiscardState("idle");
  };

  const submitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const submissionChannels = useAppSelector(selectSubmissionChannelOptions);
  const serviceCategories = useAppSelector(selectServiceCategoryOptions);
  // What the case is actually filed against — see `findFilingArea` for why this
  // is a resolved node and not the display names held in region/woreda/kebele.
  const metadata = useAppSelector((state) => state.metadata);
  const filingArea = useMemo(
    () => findFilingArea({ metadata } as RootState, { region, zone, woreda, kebele }),
    [metadata, region, zone, woreda, kebele]
  );

  // The wizard's state, shaped for `POST /api/v1/drafts` — every Save Draft
  // button (Step 1, 2, and 3) sends this same full snapshot, so a save from
  // one step doesn't leave an earlier step's fields behind. `GrievanceDetailsCard`
  // builds its own copy (it needs a same-render-fresh snapshot for its async
  // post-upload auto-save — see its `currentDraftPayload`) but folds these
  // same identity fields in via props rather than keeping a second version.
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
      <Stepper currentStep={currentStep} />

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
