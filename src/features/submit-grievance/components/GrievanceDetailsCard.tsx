"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Info, ArrowRight, ArrowLeft, Eye, Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { FileDropzone, FileRow } from "@/components/ui/FileDropzone";
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from "@/components/ui/FieldError";
import { MIN_DESCRIPTION_LENGTH } from "@/lib/validation/fieldRules";
import { focusFirstError, useFieldErrors, type FieldErrors } from "@/lib/validation/useFieldErrors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSubmitterOptionsThunk,
  selectGrievanceTypeOptions,
  selectServiceCategoryOptions,
  toAreaRef,
  useAreas,
  type AdministrativeArea,
  type AreaRef,
} from "@/features/metadata";
import { AnimatedSelect } from "@/components/submitter-identity/SI-Dropdown";
import {
  MAX_ATTACHMENTS_PER_CASE,
  type WizardAttachment,
} from "@/lib/attachments";
import { VoiceRecorder } from "./VoiceRecorder";
import { getDescriptionError, getDetailsErrors, type DetailsField } from "../wizardSteps";

function isPdf(item: WizardAttachment): boolean {
  return item.file?.type === "application/pdf" || /\.pdf$/i.test(item.fileName);
}

function isAudio(item: WizardAttachment): boolean {
  return Boolean(item.file?.type.startsWith("audio/")) || /\.(mp3|wav|ogg|m4a)$/i.test(item.fileName);
}

function areaOptions(areas: AdministrativeArea[]): Array<{ value: string; label: string }> {
  return areas.map((a) => ({ value: a.area_id, label: a.area_name }));
}

function findAreaRef(areas: AdministrativeArea[], id: string): AreaRef | null {
  const area = areas.find((a) => a.area_id === id);
  return area ? toAreaRef(area) : null;
}

interface GrievanceDetailsCardProps {
  onNext: () => void;
  onBack: () => void;
  serviceCategory: string;
  setServiceCategory: (value: string) => void;
  grievanceType: string;
  setGrievanceType: (value: string) => void;
  region: AreaRef | null;
  setRegion: (value: AreaRef | null) => void;
  zone: AreaRef | null;
  setZone: (value: AreaRef | null) => void;
  woreda: AreaRef | null;
  setWoreda: (value: AreaRef | null) => void;
  kebele: AreaRef | null;
  setKebele: (value: AreaRef | null) => void;
  description: string;
  setDescription: (value: string) => void;
  /** What the submitter would like done about it — optional. Sent as `desired_outcome`. */
  desiredOutcome: string;
  setDesiredOutcome: (value: string) => void;
  /** The store, cooperative, bank or market the grievance is about — optional. Sent as `associated_service_provider`. */
  serviceProvider: string;
  setServiceProvider: (value: string) => void;
  // The staged attachment list — owned by page.tsx, not local state here, so
  // it survives this component unmounting on every Step 1<->2 navigation and
  // so Step 3's review card can see it too. The files upload only once the
  // grievance is filed.
  attachments: WizardAttachment[];
  setAttachments: (updater: WizardAttachment[] | ((prev: WizardAttachment[]) => WizardAttachment[])) => void;
}

/** Where "focus the first invalid field" looks, in form order. */
const DETAILS_FIELD_ORDER: ReadonlyArray<{ key: DetailsField; id: string }> = [
  { key: "serviceCategory", id: "service-category" },
  { key: "grievanceType", id: "grievance-type" },
  { key: "region", id: "grievance-region" },
  { key: "zone", id: "grievance-zone" },
  { key: "woreda", id: "grievance-woreda" },
  { key: "description", id: "grievance-description" },
];

export function GrievanceDetailsCard({
  onNext,
  onBack,
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
  attachments,
  setAttachments,
}: GrievanceDetailsCardProps) {
  const t = useTranslations("submitGrievance.detailsStep");
  const tDocs = useTranslations("supportingDocuments");
  const tVoice = useTranslations("submitGrievance.voice");
  const dispatch = useAppDispatch();
  const dynamicServiceCategories = useAppSelector(selectServiceCategoryOptions);
  const dynamicGrievanceTypes = useAppSelector((state) =>
    selectGrievanceTypeOptions(state, serviceCategory)
  );
  // A voice recording is filed under the catch-all "Other" category and type, which routes to manual triage.
  const otherCategory = dynamicServiceCategories.find((o) => o.label.toLowerCase() === "other")?.value;
  const otherTypes = useAppSelector((state) => selectGrievanceTypeOptions(state, otherCategory ?? ""));
  const metadataStatus = useAppSelector((state) => state.metadata.submitterOptionsStatus);

  const regions = useAreas({ level: "Region" });
  const zones = useAreas({ level: "Zone", parents: region ? [region.id] : [] });
  const woredas = useAreas({ level: "Woreda", parents: zone ? [zone.id] : [] });
  const kebeles = useAreas({ level: "Kebele", parents: woreda ? [woreda.id] : [] });

  useEffect(() => {
    if (metadataStatus === "idle") {
      void dispatch(fetchSubmitterOptionsThunk());
    }
  }, [dispatch, metadataStatus]);

  const voiceNote = attachments.find((a) => a.kind === "voice") ?? null;
  const hasVoiceNote = voiceNote !== null;

  // Which attachment's preview modal is open, if any — null when closed.
  const [previewItem, setPreviewItem] = useState<WizardAttachment | null>(null);
  // `error` is for problems that aren't tied to one field (too many files
  // picked at once, a whole-batch upload failure). A missing or malformed
  // field is shown under that field instead — see `fieldErrors`; a single
  // file's own upload/scan problem is shown on that file's row instead — see
  // `attachmentStatusIndicator`.
  const [error, setError] = useState<string | null>(null);
  const fieldErrors = useFieldErrors<DetailsField>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Generates an object URL for previewing the selected attachment from its
  // in-memory File.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!previewItem) {
      setPreviewUrl(null);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let activeUrl: string | null = null;

    setPreviewLoading(true);
    setPreviewError(null);

    const url = URL.createObjectURL(previewItem.file);
    activeUrl = url;
    setPreviewUrl(url);
    setPreviewLoading(false);

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [previewItem]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The message for the description field, or null if it's fine. Also used
  // as the user types into a field that is already showing one.
  const detailsMessages = {
    required: t("fieldRequired"),
    descriptionTooShort: (count: number) => t("descriptionTooShort", { min: MIN_DESCRIPTION_LENGTH, count }),
  };
  const descriptionErrorFor = (value: string): string | null =>
    hasVoiceNote ? null : getDescriptionError(value, detailsMessages);

  const handleNext = () => {
    const errors: FieldErrors<DetailsField> = getDetailsErrors(
      { serviceCategory, grievanceType, region, zone, woreda, description },
      detailsMessages,
      hasVoiceNote
    );

    fieldErrors.setAll(errors);
    if (Object.keys(errors).length > 0) {
      setError(null);
      focusFirstError(DETAILS_FIELD_ORDER, errors);
      return;
    }
    setError(null);
    onNext();
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;

    // The backend caps a case at MAX_ATTACHMENTS_PER_CASE total — trim a
    // bulk selection that would blow past it rather than sending it and
    // letting the whole batch 400 after submit.
    const remainingSlots = MAX_ATTACHMENTS_PER_CASE - attachments.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS_PER_CASE} files per grievance. Remove one before adding another.`);
      return;
    }
    const filesToStage = files.slice(0, remainingSlots);
    setError(
      files.length > filesToStage.length
        ? `Only ${remainingSlots} more file(s) could be added (max ${MAX_ATTACHMENTS_PER_CASE} per grievance) — the rest were skipped.`
        : null
    );

    setAttachments((prev) => [
      ...prev,
      ...filesToStage.map((file) => ({ key: crypto.randomUUID(), file, fileName: file.name })),
    ]);
  };

  // The case is at its attachment limit once the non-voice files fill it; a replacement recording swaps the old
  // one out, so only a first recording is blocked.
  const otherAttachmentCount = attachments.filter((item) => item.kind !== "voice").length;
  const voiceBlockedByLimit = !hasVoiceNote && otherAttachmentCount >= MAX_ATTACHMENTS_PER_CASE;

  // Whether the category/type now showing were filled in by a recording (not picked by the user), so deleting
  // the recording can take them back out again.
  const filledByVoice = useRef(false);
  // Set when a recording is made with no category chosen: "Other" is filled in as soon as the options it comes
  // from have loaded (a recording can finish before they do), then this is cleared.
  const wantsOtherFill = useRef(false);
  const otherType = otherTypes.find((o) => o.label.toLowerCase() === "other")?.value;

  const fillOther = () => {
    if (!otherCategory || !otherType) return;
    wantsOtherFill.current = false;
    filledByVoice.current = true;
    setServiceCategory(otherCategory);
    setGrievanceType(otherType);
    fieldErrors.setError("serviceCategory", null);
    fieldErrors.setError("grievanceType", null);
  };

  /* eslint-disable react-hooks/exhaustive-deps -- reacts to the options arriving; fillOther only reads them */
  useEffect(() => {
    if (wantsOtherFill.current && !serviceCategory && !grievanceType) fillOther();
  }, [otherCategory, otherType]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleVoiceRecorded = (file: File) => {
    if (voiceBlockedByLimit) {
      setError(tVoice("attachmentLimit", { max: MAX_ATTACHMENTS_PER_CASE }));
      return;
    }
    setError(null);
    setAttachments((prev) => [
      ...prev.filter((item) => item.kind !== "voice"),
      { key: crypto.randomUUID(), file, fileName: file.name, kind: "voice" },
    ]);
    fieldErrors.setError("description", null);

    // A recording is triaged by hand, so file it under the catch-all "Other" - but only when the submitter has
    // not already chosen a category; a category they picked stays.
    if (serviceCategory || grievanceType) return;
    wantsOtherFill.current = true;
    fillOther();
  };

  const handleRemoveVoice = () => {
    setAttachments((prev) => prev.filter((item) => item.kind !== "voice"));
    // Take back the category we filled in, unless the submitter has since changed it.
    if (filledByVoice.current && serviceCategory === otherCategory) {
      setServiceCategory("");
      setGrievanceType("");
    }
    filledByVoice.current = false;
    wantsOtherFill.current = false;
  };

  const handleRemoveAttachment = (key: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    // A recording is removed the same way wherever the delete is clicked, so the category it filled in goes too.
    if (attachments.find((item) => item.key === key)?.kind === "voice") {
      handleRemoveVoice();
      return;
    }
    setAttachments((prev) => prev.filter((item) => item.key !== key));
  };

  // The recording has its own player under the description; this list is for the supporting documents.
  const documentAttachments = attachments.filter((item) => item.kind !== "voice");

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
                options={areaOptions(regions.areas)}
                placeholder={regions.isLoading ? "Loading regions..." : "Select region"}
                value={region?.id ?? ""}
                onChange={(id) => {
                  setRegion(findAreaRef(regions.areas, id));
                  setZone(null);
                  setWoreda(null);
                  setKebele(null);
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
                options={areaOptions(zones.areas)}
                placeholder={
                  !region
                    ? "Select region first"
                    : zones.isLoading
                    ? "Loading zones..."
                    : zones.areas.length === 0
                    ? "No zones available"
                    : "Select Zone / Sub-city"
                }
                value={zone?.id ?? ""}
                onChange={(id) => {
                  setZone(findAreaRef(zones.areas, id));
                  setWoreda(null);
                  setKebele(null);
                  fieldErrors.setError("zone", null);
                }}
                disabled={!region || zones.isLoading}
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
                options={areaOptions(woredas.areas)}
                placeholder={
                  !zone
                    ? "Select zone first"
                    : woredas.isLoading
                    ? "Loading woredas..."
                    : woredas.areas.length === 0
                    ? "No woredas available"
                    : "Select Woreda"
                }
                value={woreda?.id ?? ""}
                onChange={(id) => {
                  setWoreda(findAreaRef(woredas.areas, id));
                  setKebele(null);
                  fieldErrors.setError("woreda", null);
                }}
                disabled={!zone || woredas.isLoading}
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
                options={areaOptions(kebeles.areas)}
                placeholder={
                  !woreda
                    ? "Select woreda first"
                    : kebeles.isLoading
                    ? "Loading kebeles..."
                    : kebeles.areas.length === 0
                    ? "No kebeles available"
                    : "Select Kebele / Village"
                }
                value={kebele?.id ?? ""}
                onChange={(id) => setKebele(findAreaRef(kebeles.areas, id))}
                disabled={!woreda || kebeles.isLoading}
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
              Description {!hasVoiceNote && <span className="text-red-500">*</span>}
            </label>
            <VoiceRecorder
              recording={voiceNote?.file ?? null}
              onRecorded={handleVoiceRecorded}
              onRemove={handleRemoveVoice}
              disabled={voiceBlockedByLimit}
              disabledReason={tVoice("attachmentLimit", { max: MAX_ATTACHMENTS_PER_CASE })}
            >
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
                className={`w-full bg-white border border-gray-300 text-gray-900 py-3 pl-4 pr-14 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm resize-y ${INVALID_INPUT_STYLES}`}
              />
            </VoiceRecorder>
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
            <FileDropzone
              label={
                <span className="text-sm font-semibold text-gray-800">
                  Supporting Documents / Evidence{" "}
                  {attachments.length > 0 && `(${attachments.length}/${MAX_ATTACHMENTS_PER_CASE})`}
                </span>
              }
              prompt={tDocs.rich("prompt", {
                strong: (chunks) => <span className="font-bold text-emerald-700">{chunks}</span>,
              })}
              hint={t("documentsHint", { max: MAX_ATTACHMENTS_PER_CASE })}
              inputLabel={tDocs("label")}
              accept=".jpg,.jpeg,.png,.pdf,.mp3"
              disabled={attachments.length >= MAX_ATTACHMENTS_PER_CASE}
              onFiles={handleFiles}
            >
              {documentAttachments.length > 0 && (
                <ul className="mt-4 flex flex-col gap-3">
                  {documentAttachments.map((item) => (
                    <FileRow
                      key={item.key}
                      name={item.fileName}
                      detail={<span className="text-gray-500">Will upload when you submit</span>}
                      actions={
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}
                            aria-label={`Preview ${item.fileName}`}
                            className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye className="w-5 h-5 text-blue-500" />
                          </button>
                          <button
                            onClick={handleRemoveAttachment(item.key)}
                            aria-label={`Remove ${item.fileName}`}
                            className="p-2.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      }
                    />
                  ))}
                </ul>
              )}
            </FileDropzone>
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
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-3 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#10883c] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b8535]/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      {previewItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 id="preview-modal-title" className="text-lg font-bold text-gray-900 truncate pr-4">
                {previewItem.fileName}
              </h3>
              <button
                type="button"
                aria-label="Close preview"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewItem(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 bg-gray-50/50 flex justify-center items-center overflow-auto max-h-[75vh]">
              {previewLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 className="w-10 h-10 text-[#16A34A] animate-spin mb-3" />
                  <p className="text-sm font-medium">Loading preview…</p>
                </div>
              ) : previewError ? (
                <div className="py-12 flex flex-col items-center justify-center text-red-600">
                  <AlertTriangle className="w-12 h-12 mb-3 text-red-500" />
                  <p className="text-sm font-semibold">{previewError}</p>
                </div>
              ) : previewUrl ? (
                isPdf(previewItem) ? (
                  <iframe
                    src={previewUrl}
                    title={previewItem.fileName}
                    className="w-full h-[65vh] rounded-lg border border-gray-200 shadow-sm"
                  />
                ) : isAudio(previewItem) ? (
                  <div className="py-8 w-full flex flex-col items-center justify-center">
                    <audio controls src={previewUrl} className="w-full max-w-md">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt={previewItem.fileName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-gray-200"
                  />
                )
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-sm font-medium">Preview not available for this file type.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
