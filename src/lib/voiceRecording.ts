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
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
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
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer());

    // Downmix to mono.
    const mono = new Float32Array(decoded.length);
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const channel = decoded.getChannelData(c);
      for (let i = 0; i < mono.length; i++) mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / decoded.numberOfChannels;
    }

    const pcm = toInt16(mono);
    const encoder = new Mp3Encoder(1, decoded.sampleRate, MP3_KBPS);
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
