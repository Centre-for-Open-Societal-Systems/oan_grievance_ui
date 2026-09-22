// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanStatus } from '@/lib/attachments';
import en from '../../../../messages/en.json';
import { makeStore } from '../testFixtures';

const saveDraft = vi.fn();
vi.mock('@/lib/drafts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/drafts')>()),
  saveDraft: (...args: unknown[]) => saveDraft(...args),
}));

import { GrievanceDetailsCard } from './GrievanceDetailsCard';

afterEach(cleanup);

const CLIENT_UUID = '11111111-2222-3333-4444-555555555555';
const DESCRIPTION = 'Fertilizer allocated for the season has not reached the kebele store.';

interface Initial {
  serviceCategory?: string;
  grievanceType?: string;
  region?: string;
  zone?: string;
  woreda?: string;
  description?: string;
}

const COMPLETE: Initial = {
  serviceCategory: 'inputs',
  grievanceType: 'Fertilizer Shortage',
  region: 'Oromia',
  zone: 'North Shewa',
  woreda: 'Basona Werana',
  description: DESCRIPTION,
};

/** Owns the wizard state the card is controlled by, the way the page does. */
function Harness({ initial, onNext }: { initial: Initial; onNext: () => void }) {
  const [serviceCategory, setServiceCategory] = useState(initial.serviceCategory ?? '');
  const [grievanceType, setGrievanceType] = useState(initial.grievanceType ?? '');
  const [region, setRegion] = useState(initial.region ?? '');
  const [zone, setZone] = useState(initial.zone ?? '');
  const [woreda, setWoreda] = useState(initial.woreda ?? '');
  const [kebele, setKebele] = useState('');
  const [description, setDescription] = useState(initial.description ?? '');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  return (
    <GrievanceDetailsCard
      onNext={onNext}
      onBack={vi.fn()}
      clientUuid={CLIENT_UUID}
      submitterType="individual"
      submissionChannel="web"
      identityValues={{}}
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
  );
}

function renderStep(initial: Initial = {}) {
  const onNext = vi.fn();
  render(
    <Provider store={makeStore()}>
      <NextIntlClientProvider locale="en" messages={en}>
        <Harness initial={initial} onNext={onNext} />
      </NextIntlClientProvider>
    </Provider>
  );
  return { onNext };
}

const saveAndContinue = () => fireEvent.click(screen.getByRole('button', { name: /Save & Continue/ }));
const byId = (id: string) => document.getElementById(id)!;

describe('Step 2 — inline validation', () => {
  beforeEach(() => {
    saveDraft.mockReset();
    saveDraft.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { areas: [], count: 0 } }) } as Response);
  });

  it('marks every required field that is empty, focuses the first, and neither moves on nor saves', () => {
    const { onNext } = renderStep();

    saveAndContinue();

    // Category, type, region, zone, woreda and description.
    expect(screen.getAllByText('This field is required.')).toHaveLength(6);
    expect(byId('service-category')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('grievance-description')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('service-category')).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('leaves the optional fields alone', () => {
    renderStep();
    saveAndContinue();
    expect(byId('grievance-kebele')).not.toHaveAttribute('aria-invalid');
    expect(byId('grievance-desired-outcome')).not.toHaveAttribute('aria-invalid');
    expect(byId('grievance-service-provider')).not.toHaveAttribute('aria-invalid');
  });

  it('tells the person how many characters the description has, against the 20 it needs', () => {
    renderStep({ ...COMPLETE, description: 'too short' });

    saveAndContinue();

    expect(screen.getByText('Description must be at least 20 characters (currently 9).')).toBeInTheDocument();
    expect(byId('grievance-description')).toHaveFocus();
  });

  it('checks the description when it loses focus, and clears the message the moment it is long enough', () => {
    renderStep({ ...COMPLETE, description: '' });
    const description = byId('grievance-description');

    fireEvent.blur(description);
    expect(screen.getByText('This field is required.')).toBeInTheDocument();

    fireEvent.change(description, { target: { value: 'still short' } });
    expect(screen.getByText(/at least 20 characters \(currently 11\)/)).toBeInTheDocument();

    fireEvent.change(description, { target: { value: DESCRIPTION } });
    expect(screen.queryByText(/at least 20 characters/)).not.toBeInTheDocument();
    expect(description).not.toHaveAttribute('aria-invalid');
  });

  it('counts the description without its surrounding spaces', () => {
    renderStep({ ...COMPLETE, description: `   ${'a'.repeat(19)}   ` });
    saveAndContinue();
    expect(screen.getByText(/currently 19/)).toBeInTheDocument();
  });
});

describe('Step 2 — Save & Continue', () => {
  beforeEach(() => {
    saveDraft.mockReset();
    saveDraft.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { areas: [], count: 0 } }) } as Response);
  });

  it('saves the draft as well as moving on, so a reload on the next step loses nothing', async () => {
    const { onNext } = renderStep(COMPLETE);

    saveAndContinue();

    expect(onNext).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    const [uuid, payload, step] = saveDraft.mock.calls[0]!;
    expect(uuid).toBe(CLIENT_UUID);
    expect(step).toBe(3);
    expect(payload).toMatchObject({
      serviceCategory: 'inputs',
      grievanceType: 'Fertilizer Shortage',
      region: 'Oromia',
      zone: 'North Shewa',
      woreda: 'Basona Werana',
      description: DESCRIPTION,
    });
  });

  it('moves on even if the save fails, rather than trapping the person on a slow connection', async () => {
    saveDraft.mockRejectedValue(new Error('network down'));
    const { onNext } = renderStep(COMPLETE);

    saveAndContinue();

    expect(onNext).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
  });

  it('carries the desired outcome and service provider into the saved draft', async () => {
    renderStep(COMPLETE);
    fireEvent.change(byId('grievance-desired-outcome'), { target: { value: 'Replace the allocation' } });
    fireEvent.change(byId('grievance-service-provider'), { target: { value: 'Basona Cooperative Union' } });

    saveAndContinue();

    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
    expect(saveDraft.mock.calls[0]![1]).toMatchObject({
      desiredOutcome: 'Replace the allocation',
      serviceProvider: 'Basona Cooperative Union',
    });
  });

  it('shows what was typed in those two fields, and caps the provider at the backend’s 140 characters', () => {
    renderStep(COMPLETE);
    const outcome = byId('grievance-desired-outcome') as HTMLTextAreaElement;
    const provider = byId('grievance-service-provider') as HTMLInputElement;

    fireEvent.change(outcome, { target: { value: 'Replace the allocation' } });
    fireEvent.change(provider, { target: { value: 'Basona Cooperative Union' } });

    expect(outcome.value).toBe('Replace the allocation');
    expect(provider.value).toBe('Basona Cooperative Union');
    expect(provider).toHaveAttribute('maxlength', '140');
  });
});
