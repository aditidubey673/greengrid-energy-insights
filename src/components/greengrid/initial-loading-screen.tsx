import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Phase = "playing" | "fallback" | "fading" | "done";

interface InitialLoadingScreenProps {
  src?: string;
  /** Hard cap so a stalled video can never block the app. */
  maxDurationMs?: number;
  /** How long the fallback indicator stays up when the video can't play. */
  fallbackDurationMs?: number;
  fadeDurationMs?: number;
  label?: string;
}

export function InitialLoadingScreen({
  src = "/videos/greengrid-loading.mp4",
  maxDurationMs = 10000,
  fallbackDurationMs = 900,
  fadeDurationMs = 700,
  label = "Loading GreenGrid",
}: InitialLoadingScreenProps) {
  const [phase, setPhase] = useState<Phase>("playing");
  const videoRef = useRef<HTMLVideoElement>(null);

  const startFade = useCallback(() => {
    setPhase((current) => (current === "fading" || current === "done" ? current : "fading"));
  }, []);

  const showFallback = useCallback(() => {
    setPhase((current) => (current === "playing" ? "fallback" : current));
  }, []);

  // The overlay is server-rendered, so the video may have errored, finished, or been
  // blocked from autoplaying before React attached its event handlers.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.error) {
      showFallback();
      return;
    }
    if (video.ended) {
      startFade();
      return;
    }
    if (video.paused) {
      video.play().catch(showFallback);
    }
  }, [showFallback, startFade]);

  useEffect(() => {
    const timer = window.setTimeout(startFade, maxDurationMs);
    return () => window.clearTimeout(timer);
  }, [maxDurationMs, startFade]);

  useEffect(() => {
    if (phase !== "fallback") return;
    const timer = window.setTimeout(startFade, fallbackDurationMs);
    return () => window.clearTimeout(timer);
  }, [phase, fallbackDurationMs, startFade]);

  // Unmount after the fade even if `transitionend` never fires (e.g. reduced motion).
  useEffect(() => {
    if (phase !== "fading") return;
    const timer = window.setTimeout(() => setPhase("done"), fadeDurationMs + 100);
    return () => window.clearTimeout(timer);
  }, [phase, fadeDurationMs]);

  useEffect(() => {
    if (phase === "done") return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [phase]);

  if (phase === "done") return null;

  const isFallback = phase === "fallback";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity ease-out",
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration: `${fadeDurationMs}ms` }}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && phase === "fading") setPhase("done");
      }}
    >
      {isFallback ? (
        <div className="flex flex-col items-center gap-4">
          <span
            aria-hidden="true"
            className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
          />
          <span className="text-sm font-medium text-muted-foreground">{label}…</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          className="max-h-full max-w-full object-contain"
          onEnded={startFade}
          onError={showFallback}
        />
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
