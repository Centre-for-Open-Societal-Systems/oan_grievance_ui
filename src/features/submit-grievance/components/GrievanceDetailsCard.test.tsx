// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WizardAttachment } from '@/lib/attachments';
import en from '../../../../messages/en.json';
import type { AreaRef } from '@/features/metadata';
import { makeStore, regionRef, woredaRef, zoneRef } from '../testFixtures';

// The recorder itself (microphone, MP3 encoding) is covered by VoiceRecorder.test.tsx; here it is a stub with
// buttons that "finish a recording" / "delete it", so the card's own handling of a voice note can be driven.
vi.mock('./VoiceRecorder', () => ({
  VoiceRecorder: ({
    children,
    recording,
    onRecorded,
    onRemove,
    disabled,
  }: {
    children: React.ReactNode;
    recording: File | null;
    onRecorded: (file: File) => void;
    onRemove: () => void;
    disabled?: boolean;
  }) => (
    <div>
      {children}
      <button type="button" disabled={disabled} onClick={() => onRecorded(new File(['a'], 'voice.mp3', { type: 'audio/mpeg' }))}>
        mock-record
      </button>
      {recording && (
        <button type="button" onClick={onRemove}>
          mock-remove
        </button>
      )}
    </div>
  ),
}));

import { fetchSubmitterOptionsThunk } from '@/features/metadata';
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
  /** This many extra image attachments (to fill the case up to its limit). */
  extraAttachments?: number;
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
    Array.from({ length: initial.extraAttachments ?? 0 }, (_, i) => ({
      key: `extra-${i}`,
      file: new File(['x'], `extra-${i}.png`, { type: 'image/png' }),
      fileName: `extra-${i}.png`,
    })).concat(
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
    )
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

const withOther = () =>
  makeStore({
    submitterOptions: {
      submitter_types: [],
      submission_types: [],
      preferred_languages: [],
      service_categories: [
        { category_name: 'Inputs', code: '001', sort_order: 1 },
        { category_name: 'Other', code: '006', sort_order: 6 },
      ],
      grievance_types: [
        { grievance_type_id: 'GTYPE-00001', type_name: 'Fertilizer Shortage', service_category: 'Inputs' },
        { grievance_type_id: 'GTYPE-00183', type_name: 'Other', service_category: 'Other' },
      ],
    },
  });

function renderStep(initial: Initial = {}, store = withOther()) {
  const onNext = vi.fn();
  render(
    <Provider store={store}>
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

describe('Step 2 — voice recording', () => {
  const AREAS: Initial = { region: regionRef, zone: zoneRef, woreda: woredaRef };

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { areas: [], count: 0 } }) } as Response);
  });

  it('lets a recording replace the typed description, filing under Other when no category was chosen', () => {
    const { onNext } = renderStep(AREAS);

    fireEvent.click(screen.getByText('mock-record'));
    expect((byId('service-category') as HTMLInputElement).value).toBe('Other');
    expect((byId('grievance-type') as HTMLInputElement).value).toBe('Other');

    saveAndContinue();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('keeps a category the submitter already chose', () => {
    renderStep({ ...AREAS, serviceCategory: 'Inputs', grievanceType: 'GTYPE-00001' });

    fireEvent.click(screen.getByText('mock-record'));

    expect((byId('service-category') as HTMLInputElement).value).toBe('Inputs');
    expect((byId('grievance-type') as HTMLInputElement).value).toBe('Fertilizer Shortage');
  });

  it('takes the Other it filled in back out when the recording is deleted', () => {
    renderStep(AREAS);

    fireEvent.click(screen.getByText('mock-record'));
    fireEvent.click(screen.getByText('mock-remove'));

    expect((byId('service-category') as HTMLInputElement).value).toBe('');
    expect((byId('grievance-type') as HTMLInputElement).value).toBe('');
  });

  it('does not show a "required" error on the description while a recording stands in for it', () => {
    renderStep(AREAS);

    fireEvent.click(screen.getByText('mock-record'));
    fireEvent.focus(byId('grievance-description'));
    fireEvent.blur(byId('grievance-description'));

    expect(screen.queryByText('This field is required.')).not.toBeInTheDocument();
  });

  it('cannot add a first recording once the case already holds the most attachments allowed', () => {
    renderStep({ ...AREAS, extraAttachments: 10 });

    expect(screen.getByText('mock-record')).toBeDisabled();
  });

  it('can still replace a recording when the case is full', () => {
    renderStep({ ...AREAS, extraAttachments: 9 });

    fireEvent.click(screen.getByText('mock-record'));
    expect(screen.getByText('mock-record')).not.toBeDisabled();
  });

  it('lists the recording only under the description, not again under Supporting Documents', () => {
    renderStep(AREAS);

    fireEvent.click(screen.getByText('mock-record'));

    expect(screen.queryByText('voice.mp3')).not.toBeInTheDocument();
    // ...but it still counts toward the attachment limit
    expect(screen.getByText(/Supporting Documents.*\(1\/10\)/)).toBeInTheDocument();
  });

  it('files under Other once the category options finish loading, if the recording was made before they did', async () => {
    const store = makeStore({
      submitterOptions: null,
      submitterOptionsStatus: 'loading',
    });
    renderStep(AREAS, store);

    fireEvent.click(screen.getByText('mock-record'));
    expect((byId('service-category') as HTMLInputElement).value).toBe('');

    await act(async () => {
      store.dispatch({
        type: fetchSubmitterOptionsThunk.fulfilled.type,
        payload: {
          submitter_types: [],
          submission_types: [],
          preferred_languages: [],
          service_categories: [{ category_name: 'Other', code: '006', sort_order: 6 }],
          grievance_types: [{ grievance_type_id: 'GTYPE-00183', type_name: 'Other', service_category: 'Other' }],
        },
      });
    });

    expect((byId('service-category') as HTMLInputElement).value).toBe('Other');
    expect((byId('grievance-type') as HTMLInputElement).value).toBe('Other');
  });

  it('does not fill a category in later if the recording was deleted before the options arrived', async () => {
    const store = makeStore({ submitterOptions: null, submitterOptionsStatus: 'loading' });
    renderStep(AREAS, store);

    fireEvent.click(screen.getByText('mock-record'));
    fireEvent.click(screen.getByText('mock-remove'));
    await act(async () => {
      store.dispatch({
        type: fetchSubmitterOptionsThunk.fulfilled.type,
        payload: {
          submitter_types: [],
          submission_types: [],
          preferred_languages: [],
          service_categories: [{ category_name: 'Other', code: '006', sort_order: 6 }],
          grievance_types: [{ grievance_type_id: 'GTYPE-00183', type_name: 'Other', service_category: 'Other' }],
        },
      });
    });

    expect((byId('service-category') as HTMLInputElement).value).toBe('');
  });
});
