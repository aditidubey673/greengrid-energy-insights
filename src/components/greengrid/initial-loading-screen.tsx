import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Phase = "playing" | "fallback" | "fading" | "done";

/**
 * Inlined in <head> so the overlay renders correctly and the app stays hidden
 * before the Tailwind stylesheet has downloaded. Must not rely on any app CSS.
 * The `gg-reveal` animation is a no-JS safety net so the app can never stay hidden forever.
 */
export const INITIAL_LOADER_CRITICAL_CSS = `
#gg-app[data-loading]{visibility:hidden;animation:gg-reveal 0s linear 15s forwards}
@keyframes gg-reveal{to{visibility:visible}}
#gg-loader{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#fff;opacity:1;transition-property:opacity;transition-timing-function:ease-out}
#gg-loader[data-fading]{opacity:0;pointer-events:none}
#gg-loader video{display:block;max-width:100%;max-height:100%;object-fit:contain}
#gg-loader .gg-fallback{display:flex;flex-direction:column;align-items:center;gap:16px;font-family:Manrope,system-ui,-apple-system,"Segoe UI",sans-serif}
#gg-loader .gg-spinner{width:40px;height:40px;box-sizing:border-box;border-radius:9999px;border:4px solid rgba(22,163,74,.2);border-top-color:#16a34a;animation:gg-spin .8s linear infinite}
#gg-loader .gg-label{font-size:14px;font-weight:500;color:#6b7280}
#gg-loader .gg-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes gg-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){#gg-loader .gg-spinner{animation-duration:2s}}
`;

interface InitialLoadingScreenProps {
  src?: string;
  /** Hard cap so a stalled video can never block the app. */
  maxDurationMs?: number;
  /** How long the fallback indicator stays up when the video can't play. */
  fallbackDurationMs?: number;
  fadeDurationMs?: number;
  label?: string;
  children: ReactNode;
}

/** Renders the app hidden behind a self-styled loading overlay on the initial page load only. */
export function InitialLoadingScreen({
  src = "/videos/greengrid-loading.mp4",
  maxDurationMs = 10000,
  fallbackDurationMs = 900,
  fadeDurationMs = 700,
  label = "Loading GreenGrid",
  children,
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

  // Unmount after the fade even if `transitionend` never fires.
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

  const appHidden = phase === "playing" || phase === "fallback";

  return (
    <>
      <div id="gg-app" data-loading={appHidden ? "" : undefined} style={{ display: "contents" }}>
        {children}
      </div>
      {phase !== "done" && (
        <div
          id="gg-loader"
          role="status"
          aria-live="polite"
          aria-label={label}
          data-fading={phase === "fading" ? "" : undefined}
          style={{ transitionDuration: `${fadeDurationMs}ms` }}
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && phase === "fading") setPhase("done");
          }}
        >
          {phase === "fallback" ? (
            <div className="gg-fallback">
              <span aria-hidden="true" className="gg-spinner" />
              <span className="gg-label">{label}…</span>
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
              onEnded={startFade}
              onError={showFallback}
            />
          )}
          <span className="gg-sr">{label}</span>
        </div>
      )}
    </>
  );
}
