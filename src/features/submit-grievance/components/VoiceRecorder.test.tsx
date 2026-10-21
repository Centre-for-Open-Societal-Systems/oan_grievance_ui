// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';
import { encodeMp3, isVoiceRecordingSupported } from '@/lib/voiceRecording';
import { VoiceRecorder } from './VoiceRecorder';

vi.mock('@/lib/voiceRecording', () => ({
  isVoiceRecordingSupported: vi.fn(() => true),
  encodeMp3: vi.fn(),
  MAX_VOICE_SECONDS: 300,
}));

function makeStream() {
  const track = { stop: vi.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

type RecorderStub = { start: () => void; stop: () => void; state: string };
let recorderBehaviour: 'ok' | 'throw' = 'ok';
class FakeMediaRecorder implements RecorderStub {
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    if (recorderBehaviour === 'throw') throw new DOMException('no codec', 'NotSupportedError');
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
}

const getUserMedia = vi.fn();

function renderRecorder(props: Partial<React.ComponentProps<typeof VoiceRecorder>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <VoiceRecorder recording={null} onRecorded={vi.fn()} onRemove={vi.fn()} {...props}>
        <textarea aria-label="Description" />
      </VoiceRecorder>
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  recorderBehaviour = 'ok';
  getUserMedia.mockReset();
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('VoiceRecorder — microphone handling', () => {
  it('releases the microphone and says so when the recorder cannot start', async () => {
    const { stream, track } = makeStream();
    getUserMedia.mockResolvedValue(stream);
    recorderBehaviour = 'throw';
    renderRecorder();

    fireEvent.click(screen.getByRole('button', { name: 'Record' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not start the recording');
    expect(track.stop).toHaveBeenCalled();
  });

  it('tells a blocked microphone apart from a missing one', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
    renderRecorder();
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Microphone access was blocked');

    getUserMedia.mockRejectedValueOnce(new DOMException('none', 'NotFoundError'));
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No microphone was found'));
  });

  it('opens only one stream when Record is clicked again while the permission prompt is open', async () => {
    let grant: (stream: MediaStream) => void = () => {};
    getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => (grant = resolve)));
    renderRecorder();

    const button = screen.getByRole('button', { name: 'Record' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => grant(makeStream().stream));
  });

  it('hands the microphone straight back if the user left while the permission prompt was open', async () => {
    const { stream, track } = makeStream();
    let grant: (stream: MediaStream) => void = () => {};
    getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => (grant = resolve)));
    const view = renderRecorder();

    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    view.unmount();
    await act(async () => grant(stream));

    expect(track.stop).toHaveBeenCalled();
  });

  it('turns the microphone off when the page is left mid-recording', async () => {
    const { stream, track } = makeStream();
    getUserMedia.mockResolvedValue(stream);
    const view = renderRecorder();

    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await screen.findByRole('button', { name: 'Stop recording' });
    view.unmount();

    expect(track.stop).toHaveBeenCalled();
  });

  it('cannot start a recording while blocked (e.g. the case is at its attachment limit)', () => {
    renderRecorder({ disabled: true, disabledReason: 'Remove a file first.' });

    const button = screen.getByRole('button', { name: 'Record' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Remove a file first.');
  });

  it('reports the finished recording to the callback as it is when the recording ends, not when it began', async () => {
    const { stream } = makeStream();
    getUserMedia.mockResolvedValue(stream);
    const file = new File(['a'], 'voice.mp3', { type: 'audio/mpeg' });
    vi.mocked(encodeMp3).mockResolvedValue(file);
    const first = vi.fn();
    const latest = vi.fn();
    const element = (onRecorded: (f: File) => void) => (
      <NextIntlClientProvider locale="en" messages={en}>
        <VoiceRecorder recording={null} onRecorded={onRecorded} onRemove={vi.fn()}>
          <textarea aria-label="Description" />
        </VoiceRecorder>
      </NextIntlClientProvider>
    );
    const view = render(element(first));

    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await screen.findByRole('button', { name: 'Stop recording' });
    view.rerender(element(latest));
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));

    await waitFor(() => expect(latest).toHaveBeenCalledWith(file));
    expect(first).not.toHaveBeenCalled();
  });

  it('still shows the description box, with a note instead of a mic, where recording is not supported', () => {
    vi.mocked(isVoiceRecordingSupported).mockReturnValueOnce(false);
    renderRecorder();

    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record' })).not.toBeInTheDocument();
    expect(screen.getByText('Voice recording is not supported in this browser.')).toBeInTheDocument();
  });
});
