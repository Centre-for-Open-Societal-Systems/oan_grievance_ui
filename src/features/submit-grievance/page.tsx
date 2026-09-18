"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/features/auth/store/authSlice";
import { normalizeSubmitterType } from "@/features/metadata";
import { Stepper } from "./components/Stepper";
import { SubmitterIdentityCard } from "./components/SubmitterIdentityCard";
import { GrievanceDetailsCard } from "./components/GrievanceDetailsCard";
import { ReviewAndSubmitCard } from "./components/ReviewAndSubmitCard";
import { GrievanceSubmittedCard } from "./components/GrievanceSubmittedCard";
import { SubmitGrievanceHeader } from "./components/TopHeader";

export default function SubmitGrievancePage() {
  const user = useAppSelector(selectUser);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Identifies this wizard session's Grievance Draft on the backend — needed
  // before any attachment can be uploaded, since `submit_document` requires
  // the draft to already exist for whichever `client_uuid` it's given. One
  // per page load, not persisted: resuming an in-progress draft across a
  // reload is a separate, larger feature this doesn't attempt.
  const [clientUuid] = useState(() => crypto.randomUUID());

  // Step 1 — Submitter Identity (auto-filled from logged-in user if
  // available). Reading `user` straight into these initializers is safe:
  // `AuthBootstrapGate` (src/app/providers.tsx) withholds every protected
  // route's subtree, this component included, until `getMeThunk` leaves
  // idle/loading, so this page doesn't mount with `user` merely-not-yet-
  // resolved — no extra sync-on-later-update effect needed.
  const KNOWN_SUBMITTER_TYPES = ["individual", "cooperative", "ngo", "woreda_kebele", "development_agent"];
  const [submitterType, setSubmitterType] = useState(() => {
    const normalized = user?.type ? normalizeSubmitterType(user.type) : "";
    return KNOWN_SUBMITTER_TYPES.includes(normalized) ? normalized : "";
  });
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
