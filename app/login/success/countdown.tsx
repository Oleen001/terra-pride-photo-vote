"use client";

import { useEffect, useMemo, useState } from "react";

const START_SECONDS = 5;

export function LoginSuccessCountdown({ next }: { next: string }) {
  const [seconds, setSeconds] = useState(START_SECONDS);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (seconds <= 0) {
      window.location.assign(next);
      return;
    }
    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [next, prefersReducedMotion, seconds]);

  const statusText = useMemo(() => {
    if (prefersReducedMotion) return "Continue when you're ready.";
    return `Continuing in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;
  }, [prefersReducedMotion, seconds]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-muted" aria-live="polite">
        {statusText}
      </p>
      <a href={next} className="field-button">
        Continue now
      </a>
      <noscript>
        <p className="text-center text-xs text-muted">
          JavaScript is off. Use the button above to continue.
        </p>
      </noscript>
    </div>
  );
}
