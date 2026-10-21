// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeMp3, isVoiceRecordingSupported } from './voiceRecording';

/** A decoded recording: `frames` samples of a quiet tone, at `sampleRate`, in `channels` channels. */
function fakeAudioBuffer(sampleRate: number, channels: number, frames = 4800) {
  const data = Array.from({ length: channels }, () => Float32Array.from({ length: frames }, (_, i) => Math.sin(i / 10) * 0.3));
  return {
    sampleRate,
    numberOfChannels: channels,
    length: frames,
    duration: frames / sampleRate,
    getChannelData: (c: number) => data[c]!,
  };
}

let decodedAs = fakeAudioBuffer(44100, 1);
const audioContexts: Array<{ options?: { sampleRate?: number } }> = [];
const offlineContexts: Array<{ channels: number; length: number; rate: number }> = [];

class FakeAudioContext {
  constructor(options?: { sampleRate?: number }) {
    audioContexts.push({ options });
  }
  decodeAudioData() {
    return Promise.resolve(decodedAs);
  }
  close() {
    return Promise.resolve();
  }
}

class FakeOfflineAudioContext {
  destination = {};
  constructor(
    public channels: number,
    public length: number,
    public rate: number
  ) {
    offlineContexts.push({ channels, length, rate });
  }
  createBufferSource() {
    return { buffer: null, connect: () => {}, start: () => {} };
  }
  startRendering() {
    return Promise.resolve({ getChannelData: () => Float32Array.from({ length: this.length }, (_, i) => Math.sin(i / 10) * 0.3) });
  }
}

beforeEach(() => {
  audioContexts.length = 0;
  offlineContexts.length = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const blob = () => new Blob(['x'], { type: 'audio/webm' });

describe('isVoiceRecordingSupported', () => {
  function stubSupportedBrowser() {
    vi.stubGlobal('MediaRecorder', class {});
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => {} }, configurable: true });
  }

  it('is true when recording and the Web Audio API are both available', () => {
    stubSupportedBrowser();
    expect(isVoiceRecordingSupported()).toBe(true);
  });

  it('is false where AudioContext is missing, since the recording could not be turned into MP3', () => {
    stubSupportedBrowser();
    vi.stubGlobal('AudioContext', undefined);
    expect(isVoiceRecordingSupported()).toBe(false);
  });

  it('is false without MediaRecorder', () => {
    stubSupportedBrowser();
    vi.stubGlobal('MediaRecorder', undefined);
    expect(isVoiceRecordingSupported()).toBe(false);
  });
});

describe('encodeMp3', () => {
  it('asks for a 44.1 kHz context so a high-rate output device cannot hand the encoder an unsupported rate', async () => {
    decodedAs = fakeAudioBuffer(44100, 1);
    await encodeMp3(blob(), 'a.mp3');
    expect(audioContexts[0]?.options).toEqual({ sampleRate: 44100 });
  });

  it('returns an MP3 file for a recording at a standard rate, without resampling', async () => {
    decodedAs = fakeAudioBuffer(48000, 2);
    const file = await encodeMp3(blob(), 'voice.mp3');
    expect(file.type).toBe('audio/mpeg');
    expect(file.name).toBe('voice.mp3');
    expect(file.size).toBeGreaterThan(0);
    expect(offlineContexts).toHaveLength(0);
  });

  it('resamples a 96 kHz recording to 44.1 kHz mono before encoding', async () => {
    decodedAs = fakeAudioBuffer(96000, 2);
    const file = await encodeMp3(blob(), 'hi-res.mp3');
    expect(offlineContexts).toEqual([{ channels: 1, length: Math.ceil(decodedAs.duration * 44100), rate: 44100 }]);
    expect(file.type).toBe('audio/mpeg');
  });

  it('falls back to the device rate when the browser refuses the sample-rate option', async () => {
    let calls = 0;
    vi.stubGlobal(
      'AudioContext',
      class extends FakeAudioContext {
        constructor(options?: { sampleRate?: number }) {
          if (options && calls++ === 0) throw new DOMException('unsupported', 'NotSupportedError');
          super(options);
        }
      }
    );
    decodedAs = fakeAudioBuffer(44100, 1);
    const file = await encodeMp3(blob(), 'a.mp3');
    expect(file.type).toBe('audio/mpeg');
  });
});
