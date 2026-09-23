"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { FileText, Info, Save, ArrowRight, ArrowLeft, Folder, IdCard, Eye, Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from "@/components/ui/FieldError";
import { MIN_DESCRIPTION_LENGTH } from "@/lib/validation/fieldRules";
import { focusFirstError, useFieldErrors, type FieldErrors } from "@/lib/validation/useFieldErrors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchChildAreasThunk,
  fetchGrievanceOptionsThunk,
  fetchRegionsThunk,
  fetchSubmitterOptionsThunk,
  findFilingArea,
  selectGrievanceTypeOptions,
  selectRegionOptions,
  selectServiceCategoryOptions,
  selectSubmissionChannelOptions,
  selectSubmitterTypeOptions,
  selectZoneOptions,
  selectZoneStatus,
  selectWoredaOptions,
  selectWoredaStatus,
  selectKebeleOptions,
  selectKebeleStatus,
  findZoneNode,
  findWoredaNode,
} from "@/features/metadata";
import { AnimatedSelect } from "@/components/submitter-identity/SI-Dropdown";
import { getAttachments, uploadAttachment, SCAN_STATUS, type ScanStatus } from "@/lib/attachments";
import { saveDraft } from "@/lib/drafts";
import { buildSaveDraftPayload } from "../draftPayload";
import { logger } from "@/lib/logger";
import type { RootState } from "@/store";

function labelFor(options: { value: string; label: string }[], value: string): string {
  return (
    options.find((o) => o.value.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.label.toLowerCase() === value.toLowerCase())?.label ||
    options.find((o) => o.value === value)?.label ||
    value
  );
}

interface GrievanceDetailsCardProps {
  onNext: () => void;
  onBack: () => void;
  clientUuid: string;
  /** Step 1's fields — read-only here, folded into this step's own Save Draft payload so it can't overwrite them (drafts.ts's `saveDraft` replaces the whole payload). */
  submitterType: string;
  submissionChannel: string;
  identityValues: Record<string, string>;
  /** The signed-in account's own profile — the fallback `buildSaveDraftPayload` uses when `identityValues` doesn't have a name/mobile/email of its own. */
  userFullName?: string | null;
  userMobile?: string | null;
  userEmail?: string | null;
  serviceCategory: string;
  setServiceCategory: (value: string) => void;
  grievanceType: string;
  setGrievanceType: (value: string) => void;
  region: string;
  setRegion: (value: string) => void;
  zone: string;
  setZone: (value: string) => void;
  woreda: string;
  setWoreda: (value: string) => void;
  kebele: string;
  setKebele: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  /** What the submitter would like done about it — optional. Sent as `desired_outcome`. */
  desiredOutcome: string;
  setDesiredOutcome: (value: string) => void;
  /** The store, cooperative, bank or market the grievance is about — optional. Sent as `associated_service_provider`. */
  serviceProvider: string;
  setServiceProvider: (value: string) => void;
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  // The attachment's backend identity — owned by page.tsx, not local state
  // here, so it survives this component unmounting on every Step 1<->2
  // navigation and so Step 3's review card can see it too. See page.tsx's
  // doc comment on its `attachmentId` state for why: `draft.load`'s own
  // attachment list can't see an attachment uploaded through this wizard
  // (files attach to the Grievance Attachment doc, not directly to the
  // Grievance Draft), so a resumed draft's attachment comes back through
  // this same `payload`-persisted metadata instead, with no local `File`
  // blob to read a name off or preview.
  attachmentId: string | null;
  setAttachmentId: (id: string | null) => void;
  scanStatus: ScanStatus | null;
  setScanStatus: (status: ScanStatus | null) => void;
  attachmentFileName: string | null;
  setAttachmentFileName: (name: string | null) => void;
}

/** The required fields on this step, in form order — where "focus the first invalid field" looks. */
type DetailsField = "serviceCategory" | "grievanceType" | "region" | "zone" | "woreda" | "description";

const DETAILS_FIELD_ORDER: ReadonlyArray<{ key: DetailsField; id: string }> = [
  { key: "serviceCategory", id: "service-category" },
  { key: "grievanceType", id: "grievance-type" },
  { key: "region", id: "grievance-region" },
  { key: "zone", id: "grievance-zone" },
  { key: "woreda", id: "grievance-woreda" },
  { key: "description", id: "grievance-description" },
];

// The malware scan is asynchronous (queued for ClamAV, see scanning.py's
// `enqueue_scan_attachment`) — the upload response's "Pending" never updates
// itself, so something has to ask again. ClamAV's own scan is fast; this just
// needs to catch up with a background queue, not a slow external service.
const SCAN_POLL_INTERVAL_MS = 3000;
// ~2 minutes: long enough to ride out a busy queue, short enough that a
// truly stuck scan (a down/unconfigured scanner — see scanning.py's
// "fail closed" note) doesn't poll forever in an abandoned tab.
const SCAN_POLL_MAX_ATTEMPTS = 40;

export function GrievanceDetailsCard({
  onNext,
  onBack,
  clientUuid,
  submitterType,
  submissionChannel,
  identityValues,
  userFullName,
  userMobile,
  userEmail,
  serviceCategory,
  setServiceCategory,
  grievanceType,
  setGrievanceType,
  region,
  setRegion,
  zone,
  setZone,
  woreda,
  setWoreda,
  kebele,
  setKebele,
  description,
  setDescription,
  desiredOutcome,
  setDesiredOutcome,
  serviceProvider,
  setServiceProvider,
  uploadedFile,
  setUploadedFile,
  attachmentId,
  setAttachmentId,
  scanStatus,
  setScanStatus,
  attachmentFileName,
  setAttachmentFileName,
}: GrievanceDetailsCardProps) {
  const t = useTranslations("submitGrievance.detailsStep");
  const dispatch = useAppDispatch();
  const submitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const submissionChannels = useAppSelector(selectSubmissionChannelOptions);
  const dynamicServiceCategories = useAppSelector(selectServiceCategoryOptions);
  const dynamicGrievanceTypes = useAppSelector((state) =>
    selectGrievanceTypeOptions(state, serviceCategory)
  );
  const dynamicRegions = useAppSelector(selectRegionOptions);
  const dynamicZones = useAppSelector((state) => selectZoneOptions(state, region));
  const zoneStatus = useAppSelector((state) => selectZoneStatus(state, region));
  const dynamicWoredas = useAppSelector((state) => selectWoredaOptions(state, zone, region));
  const woredaStatus = useAppSelector((state) => selectWoredaStatus(state, zone, region));
  const dynamicKebeles = useAppSelector((state) => selectKebeleOptions(state, woreda, zone, region));
  const kebeleStatus = useAppSelector((state) => selectKebeleStatus(state, woreda, zone, region));
  const rawRegions = useAppSelector((state) => state.metadata.regions);
  const metadata = useAppSelector((state) => state.metadata);
  const zoneNode = useAppSelector((state) => findZoneNode(state, zone, region));
  const woredaNode = useAppSelector((state) => findWoredaNode(state, woreda, zone, region));
  const metadataStatus = useAppSelector((state) => state.metadata.submitterOptionsStatus);
  const grievanceOptionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  const regionsStatus = useAppSelector((state) => state.metadata.regionsStatus);

  const fetchedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (metadataStatus === "idle") {
      void dispatch(fetchSubmitterOptionsThunk());
    }
    if (grievanceOptionsStatus === "idle") {
      void dispatch(fetchGrievanceOptionsThunk());
    }
    if (regionsStatus === "idle") {
      void dispatch(fetchRegionsThunk());
    }
  }, [dispatch, metadataStatus, grievanceOptionsStatus, regionsStatus]);

  // Fetch Zones and Woredas when Region changes (called at most once per region parent)
  useEffect(() => {
    if (!region) return;
    const selectedRegionNode = rawRegions.find(
      (r) =>
        r.area_name.toLowerCase() === region.toLowerCase() ||
        r.area_id.toLowerCase() === region.toLowerCase() ||
        (r.code && r.code.toLowerCase() === region.toLowerCase())
    );
    const parentId = selectedRegionNode?.area_id || selectedRegionNode?.path_code;
    if (!parentId) return;

    const zoneKey = `${parentId}_Zone`;
    if (!fetchedKeysRef.current.has(zoneKey)) {
      fetchedKeysRef.current.add(zoneKey);
      void dispatch(fetchChildAreasThunk({ parent: parentId, level_name: "Zone" }));
    }

    const woredaKey = `${parentId}_Woreda`;
    if (!fetchedKeysRef.current.has(woredaKey)) {
      fetchedKeysRef.current.add(woredaKey);
      void dispatch(fetchChildAreasThunk({ parent: parentId, level_name: "Woreda" }));
    }
  }, [dispatch, region, rawRegions]);

  // Fetch Woredas when Zone changes (called at most once per zone parent)
  useEffect(() => {
    if (!zone) return;
    const parentId = zoneNode?.area_id || zoneNode?.path_code;
    if (!parentId) return;
    const woredaKey = `${parentId}_Woreda`;
    if (!fetchedKeysRef.current.has(woredaKey)) {
      fetchedKeysRef.current.add(woredaKey);
      void dispatch(fetchChildAreasThunk({ parent: parentId, level_name: "Woreda" }));
    }
  }, [dispatch, zone, zoneNode]);

  // Fetch Kebeles when Woreda changes (called at most once per woreda parent)
  useEffect(() => {
    if (!woreda) return;
    const parentId = woredaNode?.area_id || woredaNode?.path_code;
    if (!parentId) return;
    const kebeleKey = `${parentId}_Kebele`;
    if (!fetchedKeysRef.current.has(kebeleKey)) {
      fetchedKeysRef.current.add(kebeleKey);
      void dispatch(fetchChildAreasThunk({ parent: parentId, level_name: "Kebele" }));
    }
  }, [dispatch, woreda, woredaNode]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // `error` is for problems that aren't tied to one field (an upload failure,
  // an attachment that failed the malware scan). A missing or malformed field
  // is shown under that field instead — see `fieldErrors`.
  const [error, setError] = useState<string | null>(null);
  const fieldErrors = useFieldErrors<DetailsField>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // attachmentId/scanStatus/attachmentFileName are owned by page.tsx now —
  // see this component's props doc comment. `scanStatus` mirrors the
  // backend's verdict (Pending/Clean/Infected) rather than the earlier
  // hardcoded placeholder text, since the file isn't actually servable
  // until it comes back Clean.
  // "persisting" covers the brief extra window between the upload itself
  // finishing and its attachment-identity being saved onto the draft (see
  // handleFileChange) — kept distinct from "uploading" so Preview and the
  // "Uploaded · scan clean/pending" status, both already correct the
  // instant the upload itself resolves, don't sit showing "Uploading…" for
  // a round-trip they have no reason to wait on. Remove and Save & Continue
  // both still need to block on it too, same as "uploading" — an in-flight
  // persist-save losing a race against either would resurrect a removed
  // attachment or leave a draft record that doesn't yet know about it.
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "persisting" | "error">("idle");
  // `submit_document` with a `client_uuid` requires the Grievance Draft to
  // already exist server-side — this fires once, right before the first
  // upload, rather than on every file selection.
  const draftEnsuredRef = useRef(false);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // The post-upload auto-save (currentDraftPayload, below) fires from
  // inside an async handler that can outlive several renders — an upload
  // takes up to UPLOAD_TIMEOUT_MS (60s). Reading the Step 2 fields directly
  // (as plain closure variables) would capture whatever they were when that
  // upload *started*, silently discarding any edit made while it was still
  // in flight when the auto-save finally runs. Synced in an effect (not
  // mutated during render — the React Compiler here forbids that, since it
  // breaks the compiler's purity assumptions) so it always points at the
  // latest values regardless of when the callback holding it was created.
  const latestFieldsRef = useRef({
    serviceCategory, grievanceType, region, zone, woreda, kebele, description, desiredOutcome, serviceProvider,
  });
  useEffect(() => {
    latestFieldsRef.current = {
      serviceCategory, grievanceType, region, zone, woreda, kebele, description, desiredOutcome, serviceProvider,
    };
  });

  // One object URL per uploaded file, created once and released — not
  // regenerated (and leaked) on every unrelated re-render. This has to be an
  // effect, not state derived during render: `createObjectURL` allocates a
  // real browser resource that must be paired with `revokeObjectURL` in
  // cleanup, and render must stay side-effect-free (it can run more than
  // once, or get thrown away, per render). The lint rule below can't tell
  // this apart from the "derived state" anti-pattern it's guarding against.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!uploadedFile || !uploadedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // "Saved"/"Retry Save" is a snapshot of the save that already happened —
  // without this, editing a field right after a successful save leaves the
  // button reading "Saved" indefinitely while the new edit sits unsaved,
  // telling the user something true about the past and false about the
  // present. Adjusted during render rather than in an effect (React's own
  // recommended pattern for "reset state when an input changes" —
  // https://react.dev/learn/you-might-not-need-an-effect — an effect here
  // would just cause an extra render pass to do the same thing) by
  // comparing against a snapshot of the last render's tracked fields. Only
  // resets away from a settled state (saved/error); doesn't touch "saving"
  // itself. `attachmentFileName`, not `attachmentId`/`scanStatus`, is the
  // attachment signal here — it changes exactly when a file is picked,
  // removed, or the draft resumes one, without also firing mid-upload as
  // `scanStatus` transitioning Pending -> Clean would.
  const draftPayloadSnapshot = JSON.stringify([
    serviceCategory, grievanceType, region, zone, woreda, kebele, description, desiredOutcome, serviceProvider,
    attachmentFileName,
  ]);
  const [lastDraftPayloadSnapshot, setLastDraftPayloadSnapshot] = useState(draftPayloadSnapshot);
  if (draftPayloadSnapshot !== lastDraftPayloadSnapshot) {
    setLastDraftPayloadSnapshot(draftPayloadSnapshot);
    if (draftSaveState === "saved" || draftSaveState === "error") setDraftSaveState("idle");
  }

  // Shared by the explicit Save Draft button, the implicit ensure-before-
  // first-upload save, and the auto-save right after a successful upload —
  // all three need the same current-field snapshot, so whichever fires
  // doesn't overwrite one of the others' (or a resumed draft's) data with a
  // stale or empty payload. Reads `latestFieldsRef` rather than the render's
  // own closure — see that ref's doc comment for why. The attachment itself
  // is never part of this: the backend tracks it separately (Grievance
  // Attachment rows keyed by `client_uuid`), associated the moment
  // `uploadAttachment` succeeds, not through this draft-save payload.
  const currentDraftPayload = () => {
    const fields = latestFieldsRef.current;
    const filingArea = findFilingArea({ metadata } as RootState, {
      region: fields.region,
      zone: fields.zone,
      woreda: fields.woreda,
      kebele: fields.kebele,
    });
    return buildSaveDraftPayload({
      clientSubmissionUuid: clientUuid,
      submissionChannelLabel: submissionChannel ? labelFor(submissionChannels, submissionChannel) : undefined,
      submitterType,
      submitterTypeLabel: submitterType ? labelFor(submitterTypes, submitterType) : undefined,
      identityValues,
      userFullName,
      userMobile,
      userEmail,
      administrativeAreaId: filingArea?.area_id,
      kebele: fields.kebele,
      serviceCategoryLabel: fields.serviceCategory ? labelFor(dynamicServiceCategories, fields.serviceCategory) : undefined,
      grievanceType: fields.grievanceType,
      associatedServiceProvider: fields.serviceProvider,
      description: fields.description,
      desiredOutcome: fields.desiredOutcome,
    });
  };

  const handleSaveDraft = async () => {
    setDraftSaveState("saving");
    try {
      await saveDraft(currentDraftPayload());
      draftEnsuredRef.current = true;
      setDraftSaveState("saved");
    } catch (saveError) {
      setDraftSaveState("error");
      logger.error("Failed to save draft:", saveError);
    }
  };

  // The message for the description field, or null if it's fine. Also used
  // as the user types into a field that is already showing one.
  const descriptionErrorFor = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return t("fieldRequired");
    if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
      return t("descriptionTooShort", { min: MIN_DESCRIPTION_LENGTH, count: trimmed.length });
    }
    return null;
  };

  const handleNext = () => {
    const errors: FieldErrors<DetailsField> = {};
    if (!serviceCategory) errors.serviceCategory = t("fieldRequired");
    if (!grievanceType) errors.grievanceType = t("fieldRequired");
    if (!region) errors.region = t("fieldRequired");
    if (!zone.trim()) errors.zone = t("fieldRequired");
    if (!woreda.trim()) errors.woreda = t("fieldRequired");
    const descriptionError = descriptionErrorFor(description);
    if (descriptionError) errors.description = descriptionError;

    fieldErrors.setAll(errors);
    if (Object.keys(errors).length > 0) {
      setError(null);
      focusFirstError(DETAILS_FIELD_ORDER, errors);
      return;
    }
    if (scanStatus === SCAN_STATUS.INFECTED) {
      setError("Remove the attachment that failed the malware scan before continuing.");
      return;
    }
    if (scanStatus === SCAN_STATUS.FAILED) {
      setError("The attachment's malware scan couldn't complete. Remove it and try uploading again.");
      return;
    }
    if (scanStatus === SCAN_STATUS.PENDING) {
      setError("Still scanning the attachment for malware — this takes a few seconds, please wait.");
      return;
    }
    setError(null);
    // "Save & Continue" saves: without this a reload or a closed tab on the
    // next step lost everything typed here unless Save Draft had been clicked
    // or a file uploaded. Skipped when the draft is already known to be
    // persisted and unchanged since (`draftEnsuredRef` plus `draftSaveState`
    // "saved" — the same signal the snapshot check above resets to "idle" on
    // any edit): uploading a file already fires two of these saves back to
    // back, and clicking Save & Continue right after shouldn't add a third
    // near-identical one. Not awaited when it does run — a slow connection
    // (this app's explicit target) shouldn't hold up moving on, and a failed
    // save is logged the same way the upload path's auto-save is; the
    // explicit Save Draft button remains for anyone who wants to see it
    // confirmed.
    if (!draftEnsuredRef.current || draftSaveState !== "saved") {
      saveDraft(currentDraftPayload())
        .then(() => {
          draftEnsuredRef.current = true;
        })
        .catch((saveError) => logger.error("Failed to save draft on continue:", saveError));
    }
    onNext();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setAttachmentId(null);
    setScanStatus(null);
    setAttachmentFileName(file.name);
    setUploadState("uploading");
    setError(null);

    try {
      if (!draftEnsuredRef.current) {
        await saveDraft(currentDraftPayload());
        draftEnsuredRef.current = true;
      }

      const result = await uploadAttachment({ file, clientUuid });
      setAttachmentId(result.attachment);
      setScanStatus(result.scan_status);
      // The upload itself is done — Preview and the scan-status line are
      // already correct, so let them stop showing "Uploading…" now instead
      // of waiting on the persist-save below too.
      setUploadState("idle");

      // Persist the attachment's identity onto the draft right away, not
      // only when the user separately clicks Save Draft — otherwise
      // reloading right after an upload (the common case) would resume the
      // form fields but "forget" the file was ever attached. Awaited
      // (uploadState becomes "persisting", keeping Remove and Save &
      // Continue disabled) rather than fire-and-forget: Remove issues its
      // own saveDraft to clear the attachment, and if that resolved before
      // this one, this call's later-arriving response would silently
      // re-establish the pointer the user just removed. Sequencing the two
      // removes the race instead of trying to win it.
      draftEnsuredRef.current = true;
      setUploadState("persisting");
      try {
        await saveDraft(currentDraftPayload());
      } catch (saveError) {
        logger.error("Failed to persist the attachment onto the draft:", saveError);
      } finally {
        setUploadState("idle");
      }
    } catch (uploadError) {
      setUploadState("error");
      setUploadedFile(null);
      setAttachmentFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload the file. Please try again."
      );
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    const hadAttachment = attachmentId !== null;
    setUploadedFile(null);
    setAttachmentId(null);
    setScanStatus(null);
    setAttachmentFileName(null);
    setUploadState("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (!hadAttachment) return;

    // NOT calling deleteAttachment here — needs its own verification pass
    // against the current backend (the doctype consolidation that made a
    // draft a Grievance document itself, done in this same change, may have
    // already fixed the 404 this used to hit; not confirmed). The file is
    // orphaned server-side until the draft expires and gets purged,
    // acceptable for now, same as any other abandoned draft. Nothing to
    // clear on the draft record itself either: unlike the old JSON-payload
    // draft, a resumed draft's attachment list now always comes straight
    // from the backend's own Grievance Attachment rows, not from anything
    // this component saves.
  };

  // `attachmentFileName` (page.tsx's lifted state) is kept in sync with
  // `uploadedFile` by this component at every point that changes either —
  // pick, upload, remove — so it alone is what the "already uploaded" card
  // needs, whether the name came from a just-picked file or a resumed
  // draft with no local blob to read one off.
  const displayFileName = attachmentFileName;
  const hasLocalPreview = uploadedFile !== null;

  // Polls while the scan is still in flight — see SCAN_POLL_INTERVAL_MS's
  // doc comment for why this can't just wait for a push. Stops itself once
  // the status leaves Pending (Clean/Infected/Failed), the attachment is
  // removed, or this step unmounts; a resumed draft's already-scanned
  // attachment never starts this at all, since its scanStatus arrives
  // non-Pending from page.tsx's draft-load in the first place.
  useEffect(() => {
    if (scanStatus !== SCAN_STATUS.PENDING || !attachmentId) return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const rows = await getAttachments(clientUuid);
        if (cancelled) return;
        const row = rows.find((r) => r.name === attachmentId);
        if (row && row.scan_status !== SCAN_STATUS.PENDING) {
          setScanStatus(row.scan_status);
          return;
        }
      } catch (pollError) {
        logger.error("Failed to check attachment scan status:", pollError);
      }
      if (!cancelled && attempts >= SCAN_POLL_MAX_ATTEMPTS) {
        logger.error(`Scan status still Pending for ${attachmentId} after ${attempts} checks — giving up.`);
      }
    };

    const intervalId = setInterval(() => {
      if (attempts >= SCAN_POLL_MAX_ATTEMPTS) {
        clearInterval(intervalId);
        return;
      }
      void poll();
    }, SCAN_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [scanStatus, attachmentId, clientUuid, setScanStatus]);

  return (
    <>
      <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
        {/* Card Header */}
        <div className="p-6 pb-4 border-b border-gray-200 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#078930]/10 flex items-center justify-center border border-[#078930]/20 flex-shrink-0">
              <FileText className="w-6 h-6 text-[#0b8535]" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-gray-900">Grievance Details</h3>
              <p className="text-sm text-gray-500 mt-0">Provide essential details about your grievance</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-[#0b8535] border border-green-200">
              Step 2 of 3
            </span>
          </div>
        </div>

        {/* Card Body - Form Fields */}
        <div className="p-6 pb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Service Category */}
            <div>
              <label htmlFor="service-category" className="block text-sm font-semibold text-gray-800 mb-2">
                Service Category <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="service-category"
                options={dynamicServiceCategories}
                placeholder="Select category"
                value={serviceCategory}
                onChange={(cat) => {
                  setServiceCategory(cat);
                  setGrievanceType("");
                  fieldErrors.setError("serviceCategory", null);
                }}
                invalid={!!fieldErrors.errors.serviceCategory}
                describedBy={fieldErrors.errors.serviceCategory ? errorIdFor("service-category") : undefined}
              />
              {fieldErrors.errors.serviceCategory && (
                <FieldError id={errorIdFor("service-category")}>{fieldErrors.errors.serviceCategory}</FieldError>
              )}
            </div>

            {/* Grievance Type */}
            <div>
              <label htmlFor="grievance-type" className="block text-sm font-semibold text-gray-800 mb-2">
                Grievance Type <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="grievance-type"
                options={dynamicGrievanceTypes}
                placeholder="Select grievance type"
                value={grievanceType}
                onChange={(type) => {
                  setGrievanceType(type);
                  fieldErrors.setError("grievanceType", null);
                }}
                invalid={!!fieldErrors.errors.grievanceType}
                describedBy={fieldErrors.errors.grievanceType ? errorIdFor("grievance-type") : undefined}
              />
              {fieldErrors.errors.grievanceType && (
                <FieldError id={errorIdFor("grievance-type")}>{fieldErrors.errors.grievanceType}</FieldError>
              )}
            </div>

            {/* Region */}
            <div>
              <label htmlFor="grievance-region" className="block text-sm font-semibold text-gray-800 mb-2">
                Region <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="grievance-region"
                options={dynamicRegions}
                placeholder="Select region"
                value={region}
                onChange={(newRegion) => {
                  setRegion(newRegion);
                  setZone("");
                  setWoreda("");
                  setKebele("");
                  fieldErrors.setError("region", null);
                }}
                invalid={!!fieldErrors.errors.region}
                describedBy={fieldErrors.errors.region ? errorIdFor("grievance-region") : undefined}
              />
              {fieldErrors.errors.region && (
                <FieldError id={errorIdFor("grievance-region")}>{fieldErrors.errors.region}</FieldError>
              )}
            </div>

            {/* Zone / Sub-city */}
            <div>
              <label htmlFor="grievance-zone" className="block text-sm font-semibold text-gray-800 mb-2">
                Zone / Sub-city <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="grievance-zone"
                options={dynamicZones}
                placeholder={
                  !region
                    ? "Select region first"
                    : zoneStatus === "loading"
                    ? "Loading zones..."
                    : dynamicZones.length === 0
                    ? "No zones available"
                    : "Select Zone / Sub-city"
                }
                value={zone}
                onChange={(newZone) => {
                  setZone(newZone);
                  setWoreda("");
                  setKebele("");
                  fieldErrors.setError("zone", null);
                }}
                disabled={!region || zoneStatus === "loading"}
                invalid={!!fieldErrors.errors.zone}
                describedBy={fieldErrors.errors.zone ? errorIdFor("grievance-zone") : undefined}
              />
              {fieldErrors.errors.zone && (
                <FieldError id={errorIdFor("grievance-zone")}>{fieldErrors.errors.zone}</FieldError>
              )}
            </div>

            {/* Woreda */}
            <div>
              <label htmlFor="grievance-woreda" className="block text-sm font-semibold text-gray-800 mb-2">
                Woreda <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                id="grievance-woreda"
                options={dynamicWoredas}
                placeholder={
                  !region
                    ? "Select region first"
                    : woredaStatus === "loading" || Boolean(zone && !zoneNode)
                    ? "Loading woredas..."
                    : dynamicWoredas.length === 0
                    ? (zone ? "No woredas available" : "Select zone or region first")
                    : "Select Woreda"
                }
                value={woreda}
                onChange={(newWoreda) => {
                  setWoreda(newWoreda);
                  setKebele("");
                  fieldErrors.setError("woreda", null);
                }}
                disabled={!region || woredaStatus === "loading" || Boolean(zone && !zoneNode)}
                invalid={!!fieldErrors.errors.woreda}
                describedBy={fieldErrors.errors.woreda ? errorIdFor("grievance-woreda") : undefined}
              />
              {fieldErrors.errors.woreda && (
                <FieldError id={errorIdFor("grievance-woreda")}>{fieldErrors.errors.woreda}</FieldError>
              )}
            </div>

            {/* Kebele / Village */}
            <div>
              <label htmlFor="grievance-kebele" className="block text-sm font-semibold text-gray-800 mb-2">
                Kebele / Village
              </label>
              <AnimatedSelect
                id="grievance-kebele"
                options={dynamicKebeles}
                placeholder={
                  !woreda
                    ? "Select woreda first"
                    : kebeleStatus === "loading" || Boolean(woreda && !woredaNode)
                    ? "Loading kebeles..."
                    : dynamicKebeles.length === 0
                    ? "No kebeles available"
                    : "Select Kebele / Village"
                }
                value={kebele}
                onChange={setKebele}
                disabled={!woreda || kebeleStatus === "loading" || Boolean(woreda && !woredaNode)}
              />
            </div>
          </div>

          {/* Service Provider / Branch / Office Name */}
          <div>
            <label htmlFor="grievance-service-provider" className="block text-sm font-semibold text-gray-800 mb-2">
              Service Provider / Branch / Office Name
            </label>
            <input
              id="grievance-service-provider"
              type="text"
              // The backend stores this in a 140-character field.
              maxLength={140}
              value={serviceProvider}
              onChange={(e) => setServiceProvider(e.target.value)}
              placeholder="Enter Input store, cooperative, bank, or market name (if applicable)"
              className="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="grievance-description" className="block text-sm font-semibold text-gray-800 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="grievance-description"
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                // Re-check as they type while it's showing an error, so it clears the moment it's long enough.
                if (fieldErrors.errors.description) {
                  fieldErrors.setError("description", descriptionErrorFor(e.target.value));
                }
              }}
              onBlur={() => fieldErrors.setError("description", descriptionErrorFor(description))}
              aria-invalid={fieldErrors.errors.description ? true : undefined}
              aria-describedby={fieldErrors.errors.description ? errorIdFor("grievance-description") : undefined}
              placeholder="Describe the issue clearly — what happened, when, where, and who was involved. Include dates, amounts, and reference numbers where available."
              className={`w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm resize-y ${INVALID_INPUT_STYLES}`}
            />
            {fieldErrors.errors.description && (
              <FieldError id={errorIdFor("grievance-description")}>{fieldErrors.errors.description}</FieldError>
            )}
          </div>

          {/* Desired Outcome */}
          <div>
            <label htmlFor="grievance-desired-outcome" className="block text-sm font-semibold text-gray-800 mb-2">
              Desired Outcome
            </label>
            <textarea
              id="grievance-desired-outcome"
              rows={3}
              value={desiredOutcome}
              onChange={(e) => setDesiredOutcome(e.target.value)}
              placeholder="What is the expected resolution for this grievance?"
              className="w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm resize-y"
            />
          </div>

          {/* Supporting Documents / Evidence */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Supporting Documents / Evidence
            </label>
            {!displayFileName && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[#F9FAFB] border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#f0fcf3] transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-gray-100">
                  <Folder className="w-6 h-6 text-slate-400" fill="currentColor" />
                </div>
                <p className="text-[14px] font-semibold text-[#1e293b] mb-1">
                  Attach photos, voice recordings, or documents
                </p>
                <p className="text-[13px] text-slate-500 mb-4 font-medium">
                  Max 10 MB · JPG, PNG, PDF, MP3
                </p>
                <button className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F0FDF4] text-[#16A34A] rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors border border-green-300 hover:border-green-300">
                  + Browse Files
                </button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf,.mp3"
            />

            {/* Uploaded File */}
            {displayFileName && (
              <div className="flex items-center justify-between bg-[#F0FDF4] hover:bg-[#e5fbeb] border border-green-300 p-4 rounded-xl mt-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#D1FAE5] rounded-xl flex items-center justify-center">
                    {uploadState === "uploading" ? (
                      <Loader2 className="w-6 h-6 text-[#16A34A] animate-spin" />
                    ) : (
                      <IdCard className="w-6 h-6 text-[#16A34A]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 leading-snug">
                      {displayFileName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[13px] font-medium">
                      {uploadState === "uploading" ? (
                        <span className="text-gray-500">Uploading…</span>
                      ) : scanStatus === SCAN_STATUS.CLEAN ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-[#16A34A]"></div>
                          <span className="text-[#16A34A]">Uploaded · scan clean</span>
                        </>
                      ) : scanStatus === SCAN_STATUS.INFECTED ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-red-600">Failed malware scan · not usable as evidence</span>
                        </>
                      ) : scanStatus === SCAN_STATUS.FAILED ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-red-600">Scan didn&apos;t complete · remove and try again</span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                          <span className="text-amber-600">Scanning for malware…</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPreviewOpen(true);
                    }}
                    disabled={uploadState === "uploading" || !hasLocalPreview}
                    title={!hasLocalPreview ? "Preview isn't available after a reload — only for a file you just picked" : undefined}
                    className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-5 h-5 text-blue-500" />
                  </button>
                  <button
                    onClick={handleRemoveFile}
                    disabled={uploadState === "uploading" || uploadState === "persisting"}
                    aria-label="Remove attachment"
                    title={
                      uploadState === "uploading" || uploadState === "persisting"
                        ? "Wait for the upload to finish before removing it"
                        : undefined
                    }
                    className="p-2.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-[#F3F4F8]/50 p-4 border-t border-[#E5E7EB] rounded-b-xl">
          {error && <ErrorAlert id="grievance-details-error" className="mb-4">{error}</ErrorAlert>}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-5 py-3 mr-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
                Back
              </button>
              <Info className="w-4 h-4 text-blue-600 mr-1.5" />
              <span>All fields marked <span className="text-red-500">*</span> are required</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={draftSaveState === "saving"}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {draftSaveState === "saving" ? (
                  <Loader2 className="w-4 h-4 text-[#0b8535] animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-[#0b8535]" />
                )}
                {draftSaveState === "saved" ? "Saved" : draftSaveState === "error" ? "Retry Save" : "Save Draft"}
              </button>
              <button
                onClick={handleNext}
                disabled={
                  uploadState === "uploading" ||
                  uploadState === "persisting" ||
                  scanStatus === SCAN_STATUS.INFECTED ||
                  scanStatus === SCAN_STATUS.FAILED ||
                  scanStatus === SCAN_STATUS.PENDING
                }
                className="flex items-center gap-2 px-5 py-3 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#10883c] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b8535]/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {isPreviewOpen && uploadedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 truncate pr-4">
                {uploadedFile.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(false);
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content - Image */}
            <div className="p-4 bg-gray-50/50 flex justify-center items-center overflow-auto max-h-[70vh]">
              {previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"
                />
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p>Preview not available for this file type.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
