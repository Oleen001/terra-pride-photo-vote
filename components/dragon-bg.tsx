"use client";

import { useEffect, useId, useRef, useState } from "react";

// Pride palette — matches RAINBOW used elsewhere in the app.
const RAINBOW = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#2443ff", "#732982"];

const VIEW_W = 1000;
const VIEW_H = 1000;

// One pass timing.
const PASS_MS = 5200; // slither across the screen
const IDLE_MS = 1000; // wait between passes

type Edge = "top" | "right" | "bottom" | "left";

const EDGES: Edge[] = ["top", "right", "bottom", "left"];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// A point just outside the given edge, at a random position along it.
function offscreenPoint(edge: Edge): [number, number] {
  const m = 220; // how far offscreen to start/end
  switch (edge) {
    case "top":
      return [rand(0, VIEW_W), -m];
    case "bottom":
      return [rand(0, VIEW_W), VIEW_H + m];
    case "left":
      return [-m, rand(0, VIEW_H)];
    case "right":
      return [VIEW_W + m, rand(0, VIEW_H)];
  }
}

// Build a smooth winding cubic-bezier path from a random entry edge, through a
// couple of interior waypoints, out a different edge. Each pass varies.
function buildPath(): string {
  const entry = EDGES[Math.floor(Math.random() * EDGES.length)];
  let exit = EDGES[Math.floor(Math.random() * EDGES.length)];
  if (exit === entry) exit = EDGES[(EDGES.indexOf(entry) + 2) % EDGES.length];

  const [sx, sy] = offscreenPoint(entry);
  const [ex, ey] = offscreenPoint(exit);

  // Two interior waypoints, kept away from the dead center so it winds rather
  // than slicing straight through the photos/text.
  const w1: [number, number] = [rand(180, 820), rand(140, 480)];
  const w2: [number, number] = [rand(180, 820), rand(520, 860)];

  // Control points giving each segment a gentle S-curve.
  const c = () => rand(-260, 260);
  return [
    `M ${sx} ${sy}`,
    `C ${sx + c()} ${sy + c()} ${w1[0] + c()} ${w1[1] + c()} ${w1[0]} ${w1[1]}`,
    `S ${w2[0] + c()} ${w2[1] + c()} ${w2[0]} ${w2[1]}`,
    `S ${ex + c()} ${ey + c()} ${ex} ${ey}`,
  ].join(" ");
}

export function DragonBg() {
  // Always start false so server and first client render agree (avoids a
  // hydration mismatch). The real preference is read in the effect below.
  const [reduced, setReduced] = useState(false);
  const [path, setPath] = useState<string | null>(null);
  const groupRef = useRef<SVGGElement>(null);
  const uid = useId();
  const gradId = `dragon-grad-${uid}`;
  const blurId = `dragon-blur-${uid}`;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;

    let cancelled = false;
    let timer: number | undefined;
    let raf: number | undefined;

    const runPass = () => {
      if (cancelled) return;
      const nextPath = buildPath();
      setPath(nextPath);

      // Defer to next frame so the new <path>s are in the DOM and measurable.
      raf = window.requestAnimationFrame(() => {
        if (cancelled) return;
        const g = groupRef.current;
        if (!g) return;
        const paths = Array.from(g.querySelectorAll("path"));
        if (paths.length === 0) return;
        // getTotalLength throws / returns 0 on a not-yet-laid-out path; only
        // call it once we know the path element exists in the live group.
        const first = paths[0];
        if (!first) return;
        const len = first.getTotalLength();
        if (!len) return;
        // The visible dragon body is ~42% of the path length; the rest is the
        // gap. We animate dashoffset from +len (fully offscreen before entry)
        // to -bodyLen (fully exited), so the body slithers across once. The
        // glow uses a slightly longer body so its tail trails behind the core,
        // giving a tapering look without per-vertex width.
        for (const el of paths) {
          const isCore = el.classList.contains("dragon-core");
          const body = len * (isCore ? 0.34 : 0.44);
          el.style.strokeDasharray = `${body} ${len}`;
          el.style.transition = "none";
          el.style.strokeDashoffset = `${len}`;
        }
        // force reflow so the next assignment animates
        void g.getBoundingClientRect();
        for (const el of paths) {
          const isCore = el.classList.contains("dragon-core");
          const body = len * (isCore ? 0.34 : 0.44);
          el.style.transition = `stroke-dashoffset ${PASS_MS}ms cubic-bezier(0.45, 0, 0.55, 1)`;
          el.style.strokeDashoffset = `${-body}`;
        }

        // After the pass + idle gap, run another from a new random edge/path.
        timer = window.setTimeout(() => {
          if (cancelled) return;
          setPath(null);
          timer = window.setTimeout(runPass, IDLE_MS);
        }, PASS_MS + 400);
      });
    };

    // first pass after a short initial delay
    timer = window.setTimeout(runPass, 1800);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <svg
      aria-hidden
      className="dragon-bg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {RAINBOW.map((c, i) => (
            <stop key={c} offset={`${(i / (RAINBOW.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {path && (
        <g ref={groupRef} filter={`url(#${blurId})`}>
          {/* wide soft under-glow with a longer trailing body */}
          <path
            className="dragon-glow"
            d={path}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={26}
            strokeLinecap="round"
            opacity={0.3}
          />
          {/* brighter narrow core for head/body definition (shorter tail) */}
          <path
            className="dragon-core"
            d={path}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={9}
            strokeLinecap="round"
            opacity={0.55}
          />
        </g>
      )}
    </svg>
  );
}
