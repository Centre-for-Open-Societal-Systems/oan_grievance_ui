"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { selectUser } from "@/features/auth/store/authSlice";
import { normalizeSubmitterType } from "@/features/metadata";
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
  // is safe specifically because `AuthBootstrapGate` (src/app/providers.tsx)
  // wraps the whole app and withholds every protected route's subtree —
  // this component included — until `getMeThunk` has already resolved and
  // `user` is already populated. This page never gets to mount with `user`
  // still null, so there's no null-then-resolves gap for a `useState`
  // initializer to miss. Verified live: this shape prefills correctly on a
  // direct navigation/refresh, no extra re-sync-on-later-update effect needed.
  const user = useAppSelector(selectUser);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Step 1 — Submitter Identity
  const [submitterType, setSubmitterType] = useState(() =>
    user?.type ? normalizeSubmitterType(user.type) : ""
  );
  const [submissionChannel, setSubmissionChannel] = useState(() => (user ? "web" : ""));
  const [identityValues, setIdentityValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isSubmitted) {
    return (
      <div className="font-sans pb-2">
        <GrievanceSubmittedCard onReset={handleReset} />
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
          />
        )}
      </div>
    </div>
  );
}
