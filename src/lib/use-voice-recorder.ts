// ============================================================================
// useVoiceRecorder — MediaRecorder-based voice note capture. Picks the best
// supported mime type per browser (webm/opus on Chrome/Firefox/Android, mp4 on
// Safari), tracks elapsed duration, and resolves a Blob + file extension on
// stop. All resources (stream tracks, timers) are released on stop/cancel.
// ============================================================================
import { useCallback, useRef, useState } from "react";

export type RecordingResult = {
  blob: Blob;
  ext: "webm" | "mp4" | "ogg" | "m4a" | "mp3" | "wav";
  mime: string;
  durationMs: number;
};

const CANDIDATES: { mime: string; ext: RecordingResult["ext"] }[] = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  { mime: "audio/mp4", ext: "mp4" },
  { mime: "audio/mpeg", ext: "mp3" },
];

function pickMime(): { mime: string; ext: RecordingResult["ext"] } {
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported) {
    for (const c of CANDIDATES) {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    }
  }
  return { mime: "audio/webm", ext: "webm" };
}

export function voiceSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const mimeRef = useRef(pickMime());

  const cleanup = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!voiceSupported()) {
      setError("Voice recording isn't supported on this device.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const picked = pickMime();
      mimeRef.current = picked;
      const rec = new MediaRecorder(stream, { mimeType: picked.mime });
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(100);
      recorderRef.current = rec;
      streamRef.current = stream;
      startedAtRef.current = Date.now();
      setDurationMs(0);
      setRecording(true);
      tickRef.current = setInterval(() => {
        setDurationMs(Date.now() - startedAtRef.current);
      }, 100);
      return true;
    } catch {
      setError("Microphone access was denied.");
      cleanup();
      return false;
    }
  }, [cleanup]);

  const stop = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec) {
        resolve(null);
        return;
      }
      const elapsed = Date.now() - startedAtRef.current;
      rec.onstop = () => {
        setRecording(false);
        const cancelled = cancelledRef.current;
        cleanup();
        if (cancelled || chunksRef.current.length === 0 || elapsed < 500) {
          resolve(null);
          return;
        }
        const { mime, ext } = mimeRef.current;
        const blob = new Blob(chunksRef.current, { type: mime });
        resolve({ blob, ext, mime, durationMs: elapsed });
      };
      try {
        rec.stop();
      } catch {
        cleanup();
        setRecording(false);
        resolve(null);
      }
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    } else {
      cleanup();
    }
    setRecording(false);
    setDurationMs(0);
  }, [cleanup]);

  return { recording, durationMs, error, start, stop, cancel };
}
