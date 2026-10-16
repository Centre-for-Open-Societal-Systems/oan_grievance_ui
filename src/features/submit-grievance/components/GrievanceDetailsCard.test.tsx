// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WizardAttachment } from '@/lib/attachments';
import en from '../../../../messages/en.json';
import type { AreaRef } from '@/features/metadata';
import { makeStore, regionRef, woredaRef, zoneRef } from '../testFixtures';

import { GrievanceDetailsCard } from './GrievanceDetailsCard';

afterEach(cleanup);

const DESCRIPTION = 'Fertilizer allocated for the season has not reached the kebele store.';

interface Initial {
  serviceCategory?: string;
  grievanceType?: string;
  region?: AreaRef;
  zone?: AreaRef;
  woreda?: AreaRef;
  description?: string;
  attachmentFileName?: string;
}

const COMPLETE: Initial = {
  serviceCategory: 'inputs',
  grievanceType: 'Fertilizer Shortage',
  region: regionRef,
  zone: zoneRef,
  woreda: woredaRef,
  description: DESCRIPTION,
};

/** Owns the wizard state the card is controlled by, the way the page does. */
function Harness({ initial, onNext }: { initial: Initial; onNext: () => void }) {
  const [serviceCategory, setServiceCategory] = useState(initial.serviceCategory ?? '');
  const [grievanceType, setGrievanceType] = useState(initial.grievanceType ?? '');
  const [region, setRegion] = useState<AreaRef | null>(initial.region ?? null);
  const [zone, setZone] = useState<AreaRef | null>(initial.zone ?? null);
  const [woreda, setWoreda] = useState<AreaRef | null>(initial.woreda ?? null);
  const [kebele, setKebele] = useState<AreaRef | null>(null);
  const [description, setDescription] = useState(initial.description ?? '');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [attachments, setAttachments] = useState<WizardAttachment[]>(() =>
    initial.attachmentFileName
      ? [
          {
            key: initial.attachmentFileName,
            file: new File(['x'], initial.attachmentFileName, {
              type: initial.attachmentFileName.endsWith('.pdf') ? 'application/pdf' : 'image/png',
            }),
            fileName: initial.attachmentFileName,
          },
        ]
      : []
  );
  return (
    <GrievanceDetailsCard
      onNext={onNext}
      onBack={vi.fn()}
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
      attachments={attachments}
      setAttachments={setAttachments}
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
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { areas: [], count: 0 } }) } as Response);
  });

  it('marks every required field that is empty, focuses the first, and does not move on', () => {
    const { onNext } = renderStep();

    saveAndContinue();

    // Category, type, region, zone, woreda and description.
    expect(screen.getAllByText('This field is required.')).toHaveLength(6);
    expect(byId('service-category')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('grievance-description')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('service-category')).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
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
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { areas: [], count: 0 } }) } as Response);
  });

  it('moves on once the required fields are valid', () => {
    const { onNext } = renderStep(COMPLETE);

    saveAndContinue();

    expect(onNext).toHaveBeenCalledTimes(1);
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

describe('Step 2 — staged attachments', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-local-url');
    global.URL.revokeObjectURL = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { areas: [], count: 0 } }) } as Response);
  });

  it('lists a staged file as waiting to upload, and lets Save & Continue proceed', () => {
    const { onNext } = renderStep({ ...COMPLETE, attachmentFileName: 'evidence.pdf' });

    expect(screen.getByText('Will upload when you submit')).toBeInTheDocument();
    saveAndContinue();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('removes a staged file locally', () => {
    renderStep({ ...COMPLETE, attachmentFileName: 'evidence.pdf' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove evidence.pdf' }));

    expect(screen.queryByText('evidence.pdf')).not.toBeInTheDocument();
  });

  it('previews an image from the local file and revokes the URL on close', () => {
    renderStep({ ...COMPLETE, attachmentFileName: 'receipt.png' });

    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt.png' }));

    expect(screen.getByRole('dialog', { name: 'receipt.png' })).toBeInTheDocument();
    expect(screen.getByAltText('receipt.png')).toHaveAttribute('src', 'blob:http://localhost/mock-local-url');

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-local-url');
  });

  it('renders a PDF iframe preview for a staged PDF', () => {
    renderStep({ ...COMPLETE, attachmentFileName: 'contract.pdf' });

    fireEvent.click(screen.getByRole('button', { name: 'Preview contract.pdf' }));

    expect(screen.getByTitle('contract.pdf')).toHaveAttribute('src', 'blob:http://localhost/mock-local-url');
  });
});
