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
  /** Blocks starting a new recording (e.g. the case is already at its attachment limit); `disabledReason` is shown as the button's tooltip. */
  disabled?: boolean;
  disabledReason?: string;
}

type Phase = "idle" | "starting" | "recording" | "processing";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Which message to show for a failed `getUserMedia` / `MediaRecorder` start. */
function startErrorKey(error: unknown): "permissionDenied" | "noMicrophone" | "startFailed" {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "permissionDenied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "noMicrophone";
  return "startFailed";
}

export function VoiceRecorder({
  children,
  recording,
  onRecorded,
  onRemove,
  disabled = false,
  disabledReason,
}: VoiceRecorderProps) {
  const t = useTranslations("submitGrievance.voice");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [supported] = useState(() => isVoiceRecordingSupported());

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const mountedRef = useRef(true);
  // Set synchronously, so a second click while the permission prompt is still open cannot start a second stream.
  const startingRef = useRef(false);
  // A recording can run for minutes, and the form around it keeps changing meanwhile; `onstop` must call the
  // callback as it is when the recording ends, not the one captured when it began.
  const onRecordedRef = useRef(onRecorded);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
  });

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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
    if (startingRef.current || phase !== "idle") return;
    startingRef.current = true;
    setError(null);
    setPhase("starting");

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The user left while the permission prompt was open: nothing is listening, so hand the mic straight back.
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      const parts: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) parts.push(event.data);
      };
      recorder.onerror = () => {
        releaseMic();
        if (!mountedRef.current) return;
        setError(t("startFailed"));
        setPhase("idle");
      };
      recorder.onstop = async () => {
        releaseMic();
        if (!mountedRef.current) return;
        setPhase("processing");
        try {
          const blob = new Blob(parts, { type: recorder.mimeType });
          const file = await encodeMp3(blob, `voice-grievance-${Date.now()}.mp3`);
          if (!mountedRef.current) return;
          onRecordedRef.current(file);
        } catch {
          if (mountedRef.current) setError(t("processingFailed"));
        } finally {
          if (mountedRef.current) setPhase("idle");
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      elapsedRef.current = 0;
      setElapsed(0);
      setPhase("recording");
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_VOICE_SECONDS) stop();
      }, 1000);
    } catch (error) {
      // getUserMedia succeeded but the recorder could not start (or the permission was refused):
      // the stream must not stay open with nothing driving it.
      stream?.getTracks().forEach((track) => track.stop());
      releaseMic();
      if (mountedRef.current) {
        setError(t(startErrorKey(error)));
        setPhase("idle");
      }
    } finally {
      startingRef.current = false;
    }
  };

  if (!supported) {
    return (
      <div>
        {children}
        <p className="mt-1.5 text-xs text-gray-500">{t("unsupported")}</p>
      </div>
    );
  }

  const recordingNow = phase === "recording";
  const blocked = disabled && !recordingNow;

  return (
    <div>
      {children}

      {/* A labelled bar rather than a small icon in the textarea's corner: speaking is an equal way to
          describe the grievance, and for many farmers the easier one, so it has to be seen. */}
      <div
        className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
          recordingNow ? "border-red-300 bg-red-50" : "border-dashed border-[#0b8535]/40 bg-green-50/60"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <Mic className="mt-0.5 h-5 w-5 shrink-0 text-[#0b8535]" aria-hidden="true" />
          <p className="text-sm text-gray-700">
            <span className="font-bold text-gray-900">{t("callout")}</span> {t("hint")}
          </p>
        </div>
        <button
          type="button"
          onClick={recordingNow ? stop : start}
          disabled={phase === "processing" || phase === "starting" || blocked}
          title={blocked && disabledReason ? disabledReason : undefined}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            recordingNow
              ? "bg-red-600 hover:bg-red-700 focus:ring-red-300"
              : "bg-[#16A34A] hover:bg-[#10883c] focus:ring-[#0b8535]/40"
          }`}
        >
          {recordingNow ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
          {recordingNow ? t("stop") : recording ? t("recordAgain") : t("record")}
        </button>
      </div>

      {recordingNow && (
        <p role="timer" aria-live="off" className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-600">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
          {t("recording", { time: formatClock(elapsed), max: formatClock(MAX_VOICE_SECONDS) })}
        </p>
      )}
      {(phase === "processing" || phase === "starting") && (
        <p role="status" className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          {phase === "starting" ? t("starting") : t("processing")}
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
