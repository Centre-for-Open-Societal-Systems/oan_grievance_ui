import { MAX_ATTACHMENT_BYTES } from '@/lib/attachments';

// The backend accepts audio only as MP3 (`audio/mpeg`, sniffed from bytes),
// but MediaRecorder produces WebM/Ogg/MP4 depending on the browser. So a
// recording is decoded and re-encoded to MP3 here, before it is ever staged.

/** Mono speech at 64 kbps is ~8 KB/s, so this stays well under MAX_ATTACHMENT_BYTES. */
const MP3_KBPS = 64;
const MP3_FRAME = 1152;

/** Longest recording the recorder allows (seconds). */
export const MAX_VOICE_SECONDS = 5 * 60;

export function isVoiceRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    // encodeMp3 needs the Web Audio API to decode what MediaRecorder produced.
    typeof AudioContext !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/** The sample rates an MP3 encoder accepts (MPEG-1, -2 and -2.5 layer III). */
const MP3_SAMPLE_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
const FALLBACK_SAMPLE_RATE = 44100;

/**
 * An AudioContext at a rate the encoder takes. A bare `new AudioContext()` runs at the output device's
 * rate, which a studio interface or USB DAC can set to 96 or 192 kHz; browsers that refuse the
 * option fall back to the device rate, which encodeMp3 then resamples.
 */
function newAudioContext(): AudioContext {
  try {
    return new AudioContext({ sampleRate: FALLBACK_SAMPLE_RATE });
  } catch {
    return new AudioContext();
  }
}

/** Resamples (and mixes down) a decoded buffer to mono at `rate`. */
async function resampleToMono(buffer: AudioBuffer, rate: number): Promise<Float32Array> {
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(buffer.duration * rate)), rate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  return (await offline.startRendering()).getChannelData(0);
}

/** The decoded audio as one channel: used as is when already mono, otherwise the channels averaged. */
function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const channel = buffer.getChannelData(c);
    for (let i = 0; i < mono.length; i++) mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / buffer.numberOfChannels;
  }
  return mono;
}

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Decodes a MediaRecorder blob and returns it as a mono MP3 `File`. */
export async function encodeMp3(recording: Blob, fileName: string): Promise<File> {
  // Loaded on first use: the encoder is only needed once someone records, so it stays out of the Step 2 bundle.
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const context = newAudioContext();
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer());

    // The encoder only takes standard MP3 rates; anything else (96 kHz, 192 kHz) is resampled first.
    const needsResample = !MP3_SAMPLE_RATES.includes(decoded.sampleRate);
    const sampleRate = needsResample ? FALLBACK_SAMPLE_RATE : decoded.sampleRate;
    const mono = needsResample ? await resampleToMono(decoded, sampleRate) : mixToMono(decoded);

    const pcm = toInt16(mono);
    const encoder = new Mp3Encoder(1, sampleRate, MP3_KBPS);
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    for (let i = 0; i < pcm.length; i += MP3_FRAME) {
      const chunk = encoder.encodeBuffer(pcm.subarray(i, i + MP3_FRAME));
      if (chunk.length > 0) chunks.push(new Uint8Array(chunk));
    }
    const tail = encoder.flush();
    if (tail.length > 0) chunks.push(new Uint8Array(tail));

    const file = new File(chunks, fileName, { type: 'audio/mpeg' });
    if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('Recording is too large.');
    return file;
  } finally {
    void context.close();
  }
}
