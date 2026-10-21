"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic, Square, Trash2, Loader2 } from "lucide-react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { encodeMp3, isVoiceRecordingSupported, MAX_VOICE_SECONDS } from "@/lib/voiceRecording";

interface VoiceRecorderProps {
  /** The description textarea; the mic button sits inside its corner. */
  children: React.ReactNode;
  /** The staged recording (MP3), or null when there is none. */
  recording: File | null;
  onRecorded: (file: File) => void;
  onRemove: () => void;
}

type Phase = "idle" | "recording" | "processing";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceRecorder({ children, recording, onRecorded, onRemove }: VoiceRecorderProps) {
  const t = useTranslations("submitGrievance.voice");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [supported] = useState(() => isVoiceRecordingSupported());

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Object URL for the player, released when the recording changes or goes away.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!recording) {
      setPlaybackUrl(null);
      return;
    }
    const url = URL.createObjectURL(recording);
    setPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recording]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const releaseMic = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Leaving the page mid-recording must not leave the microphone on.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      releaseMic();
    };
  }, []);

  const stop = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const start = async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t("permissionDenied"));
      return;
    }
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    const parts: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) parts.push(event.data);
    };
    recorder.onstop = async () => {
      releaseMic();
      setPhase("processing");
      try {
        const blob = new Blob(parts, { type: recorder.mimeType });
        onRecorded(await encodeMp3(blob, `voice-grievance-${Date.now()}.mp3`));
        setPhase("idle");
      } catch {
        setError(t("processingFailed"));
        setPhase("idle");
      }
    };

    recorderRef.current = recorder;
    recorder.start();
    setElapsed(0);
    setPhase("recording");
    timerRef.current = setInterval(() => {
      setElapsed((seconds) => {
        if (seconds + 1 >= MAX_VOICE_SECONDS) stop();
        return seconds + 1;
      });
    }, 1000);
  };

  if (!supported) return <>{children}</>;

  const recordingNow = phase === "recording";

  return (
    <div>
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={recordingNow ? stop : start}
          disabled={phase === "processing"}
          aria-label={recordingNow ? t("stop") : recording ? t("recordAgain") : t("record")}
          title={t("hint")}
          className={`absolute bottom-3 right-3 p-2 rounded-full border transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            recordingNow
              ? "bg-red-600 border-red-600 text-white hover:bg-red-700 focus:ring-red-300"
              : "bg-white border-gray-300 text-[#0b8535] hover:bg-gray-50 focus:ring-[#0b8535]/30"
          }`}
        >
          {recordingNow ? <Square className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      {recordingNow && (
        <p role="timer" aria-live="off" className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-600">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
          {t("recording", { time: formatClock(elapsed), max: formatClock(MAX_VOICE_SECONDS) })}
        </p>
      )}
      {phase === "processing" && (
        <p role="status" className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          {t("processing")}
        </p>
      )}
      {phase === "idle" && recording && playbackUrl && (
        <div className="mt-2 flex items-center gap-3">
          <audio controls src={playbackUrl} aria-label={t("playbackLabel")} className="w-full max-w-md" />
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("remove")}
            className="p-2.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-500" aria-hidden="true" />
          </button>
        </div>
      )}
      {error && <ErrorAlert className="mt-2">{error}</ErrorAlert>}
    </div>
  );
}
