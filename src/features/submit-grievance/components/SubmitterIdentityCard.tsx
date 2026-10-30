"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { FileEdit, Info, ArrowRight } from "lucide-react";
import { errorIdFor, FieldError } from "@/components/ui/FieldError";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSubmitterOptionsThunk, selectSubmitterTypeOptions, selectSubmissionChannelOptions } from "@/features/metadata";
import { AnimatedSelect } from "@/components/submitter-identity/SI-Dropdown";
import { IndividualFarmerForm } from "@/components/submitter-identity/SI-IndividualFarmerForm";
import { CooperativeFPOForm } from "@/components/submitter-identity/SI-CooperativeFPOForm";
import { NGOForm } from "@/components/submitter-identity/SI-NGOForm";
import { WoredaKebeleForm } from "@/components/submitter-identity/SI-WoredaKebeleForm";
import { DevelopmentAgentForm } from "@/components/submitter-identity/SI-DevelopmentAgentForm";
import { useIdentityErrors } from "@/components/submitter-identity/useIdentityErrors";
import { DEFAULT_SUBMISSION_CHANNEL } from "@/lib/validation/registerSubmitter";

interface SubmitterIdentityCardProps {
  onNext?: () => void;
  submitterType: string;
  setSubmitterType: (value: string) => void;
  submissionChannel: string;
  setSubmissionChannel: (value: string) => void;
  identityValues: Record<string, string>;
  setIdentityValue: (key: string, value: string) => void;
  /** The account's type is fixed (a registered NGO / FPO files as itself), so the dropdown is shown but not editable. */
  submitterTypeLocked?: boolean;
  /** Field keys the identity provider owns for this account: shown, not editable. */
  readOnlyFields?: string[];
  /** The account's own submitter type and channel names (from /auth/me), shown while the options list is unavailable. */
  profileSubmitterType?: string;
  profileSubmissionChannel?: string;
}

/**
 * `options`, or a single option for the current `value` named `label` when the
 * list is empty (not loaded yet, or the request failed). Without it a value the
 * account already has — its submitter type and channel from /auth/me — shows as
 * a blank dropdown, because the dropdown can only display a value by finding its
 * option. Once the real list arrives it replaces this.
 */
function withProfileFallback(
  options: Array<{ value: string; label: string }>,
  value: string,
  label: string | undefined
): Array<{ value: string; label: string }> {
  if (options.length > 0 || !value || !label) return options;
  return [{ value, label }];
}

export function SubmitterIdentityCard({
  onNext,
  submitterType,
  setSubmitterType,
  submissionChannel,
  setSubmissionChannel,
  identityValues,
  setIdentityValue,
  submitterTypeLocked = false,
  readOnlyFields,
  profileSubmitterType,
  profileSubmissionChannel,
}: SubmitterIdentityCardProps) {
  const dispatch = useAppDispatch();
  const dynamicSubmitterTypes = useAppSelector(selectSubmitterTypeOptions);
  const dynamicSubmissionChannels = useAppSelector(selectSubmissionChannelOptions);
  const submitterStatus = useAppSelector((state) => state.metadata.submitterOptionsStatus);

  useEffect(() => {
    if (submitterStatus === "idle") {
      void dispatch(fetchSubmitterOptionsThunk());
    }
  }, [dispatch, submitterStatus]);

  // A request that failed earlier (a cold dev server, a dropped connection) is
  // not retried by the effect above, which only starts a first load — so opening
  // this step tries again once, rather than leaving the failure in place.
  useEffect(() => {
    if (submitterStatus === "failed") {
      void dispatch(fetchSubmitterOptionsThunk());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const submitterTypeOptions = withProfileFallback(dynamicSubmitterTypes, submitterType, profileSubmitterType);
  const submissionChannelOptions = withProfileFallback(
    dynamicSubmissionChannels,
    submissionChannel,
    profileSubmissionChannel || DEFAULT_SUBMISSION_CHANNEL
  );

  const t = useTranslations("submitGrievance.identityStep");

  // The channel list is empty either because the request failed or because it
  // succeeded with nothing in it — both leave a required field with nothing to
  // pick, so both say so (and offer a retry) instead of showing an empty menu.
  const channelOptionsUnavailable =
    dynamicSubmissionChannels.length === 0 && (submitterStatus === "failed" || submitterStatus === "succeeded");

  // Inline errors: the two dropdowns ("submitterType", "submissionChannel")
  // and the identity form's own fields share one set of messages, so the same
  // rules apply the same way here as on the register profile step.
  const identity = useIdentityErrors({
    submitterType,
    values: identityValues,
    requiredMessage: t("fieldRequired"),
  });

  const handleSubmitterTypeChange = (value: string) => {
    setSubmitterType(value);
    // The previous type's fields are gone, so their messages are too.
    identity.clear();
  };

  const handleChannelChange = (value: string) => {
    setSubmissionChannel(value);
    identity.setError("submissionChannel", null);
  };

  const handleIdentityValue = (key: string, value: string) => {
    setIdentityValue(key, value);
    identity.revalidateIfShowing(key, value);
    // The phone country isn't a validated field itself, but it changes what
    // "valid" means for phoneNumber (see validateLocalPhone) — re-check a
    // phoneNumber error already showing against the newly selected country.
    if (key === "phoneCode" && identity.errors.phoneNumber) {
      identity.validateField("phoneNumber", { ...identityValues, phoneCode: value });
    }
  };

  const handleNext = () => {
    const valid = identity.validateAll([
      { key: "submitterType", id: "submitter-type", message: submitterType ? null : t("fieldRequired") },
      { key: "submissionChannel", id: "submission-channel", message: submissionChannel ? null : t("fieldRequired") },
    ]);
    if (valid) onNext?.();
  };

  // What each identity form needs to show and update its inline errors.
  const identityForm = {
    values: identityValues,
    setValue: handleIdentityValue,
    errors: identity.errors,
    readOnlyFields,
    onFieldBlur: (key: string) => identity.validateField(key),
  };

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
      {/* Card Header */}
      <div className="p-6 pb-4 border-b border-gray-200 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#078930]/10 flex items-center justify-center border border-[#078930]/20 flex-shrink-0">
            <FileEdit className="w-6 h-6 text-[#0b8535]" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-gray-900">Submitter Identity</h3>
            <p className="text-sm text-gray-500 mt-0">Provide essential details about your grievance</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-[#0b8535] border border-green-200">
            Step 1 of 3
          </span>
        </div>
      </div>

      {/* Card Body - Form Fields */}
      <div className="p-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submitter Type */}
          <div>
            <label htmlFor="submitter-type" className="block text-sm font-semibold text-gray-800 mb-2">
              Submitter Type <span className="text-red-500">*</span>
            </label>
            <AnimatedSelect
              id="submitter-type"
              options={submitterTypeOptions}
              placeholder="Select Submitter Type"
              value={submitterType}
              onChange={handleSubmitterTypeChange}
              disabled={submitterTypeLocked}
              clearable={false}
              invalid={!!identity.errors.submitterType}
              describedBy={identity.errors.submitterType ? errorIdFor("submitter-type") : undefined}
            />
            {identity.errors.submitterType && (
              <FieldError id={errorIdFor("submitter-type")}>{identity.errors.submitterType}</FieldError>
            )}
          </div>

          {/* Submission Channel */}
          <div>
            <label htmlFor="submission-channel" className="block text-sm font-semibold text-gray-800 mb-2">
              Submission Channel <span className="text-red-500">*</span>
            </label>
            <AnimatedSelect
              id="submission-channel"
              options={submissionChannelOptions}
              placeholder="Select Submission Channel"
              value={submissionChannel}
              onChange={handleChannelChange}
              clearable={false}
              invalid={!!identity.errors.submissionChannel}
              describedBy={identity.errors.submissionChannel ? errorIdFor("submission-channel") : undefined}
            />
            {identity.errors.submissionChannel && (
              <FieldError id={errorIdFor("submission-channel")}>{identity.errors.submissionChannel}</FieldError>
            )}
            {channelOptionsUnavailable && (
              <p role="alert" className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs font-medium text-red-600">
                <span>{submitterStatus === "failed" ? t("channelsLoadFailed") : t("channelsEmpty")}</span>
                <button
                  type="button"
                  onClick={() => void dispatch(fetchSubmitterOptionsThunk())}
                  className="font-semibold underline underline-offset-2 hover:text-red-800"
                >
                  {t("retry")}
                </button>
              </p>
            )}
          </div>
        </div>
        {submitterType === "individual" && <IndividualFarmerForm {...identityForm} />}
        {(submitterType === "cooperative" || submitterType === "fpo") && <CooperativeFPOForm {...identityForm} />}
        {submitterType === "ngo" && <NGOForm {...identityForm} />}
        {submitterType === "woreda_kebele" && <WoredaKebeleForm {...identityForm} />}
        {submitterType === "development_agent" && <DevelopmentAgentForm {...identityForm} />}
      </div>

      {/* Card Footer */}
      <div className="bg-[#F3F4F8]/50 p-4 border-t border-[#E5E7EB] rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <Info className="w-4 h-4 text-blue-600 mr-1.5" />
            <span>All fields marked <span className="text-red-500">*</span> are required</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-3 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#10883c] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b8535]/50"
            >
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
