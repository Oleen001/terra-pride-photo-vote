"use client";

import { useEffect, useRef } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
} from "d3-force";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { GalleryPhoto } from "@/lib/photos";

type ForceNode = {
  id: string;
  photo: GalleryPhoto | null;
  img: HTMLImageElement | null;
  r: number;
  x: number;
  y: number;
  appear: number; // 0..1 entrance progress (scale-in from edge)
  isText?: boolean;
  fx?: number | null;
  fy?: number | null;
};

type ForceGalleryProps = {
  photos: GalleryPhoto[];
  votedIds: Set<string>;
  isOwner: (photo: GalleryPhoto) => boolean;
  onSelect: (photo: GalleryPhoto) => void;
};

const RAINBOW = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#2443ff", "#732982", "#e40303"];

const TEXT_NODE_ID = "__typewriter__";
// NOTE: canvas ctx.font does NOT support CSS var() — must be a concrete family.
// Monoton is a single-weight (400) display face; no bold available.
const TEXT_FONT = "400 120px Monoton, ui-sans-serif, system-ui, sans-serif";
const TEXT_SIZE = 120;
const TEXT_PAD = 26; // horizontal breathing room added to measured text width

const TYPEWRITER_PHRASES = [
  "Capture the moment", "Show your colors", "Best shot wins", "Vote your favorite",
  "Snap and share", "Love is loud", "Be seen", "Proud and loud",
  "Strike a pose", "Frame the joy", "Make it count", "Pick a winner",
  "Tap your fave", "Spread the love", "Shine on", "Live in color",
  "Own your shine", "Smile bright", "Catch the light", "Stay golden",
  "Color the world", "Find the spark", "Chase the light", "Hold the pose",
  "Cheer loud", "Glow up", "Light it up", "All are welcome",
  "Wave your flag", "Stand tall", "Be bold", "Dream in color",
  "Joy out loud", "Pride wins", "Heart it", "Double tap",
  "Best smile here", "Strike gold", "Show and tell", "Lens of love",
  "Picture pride", "Vote with heart", "Pose and post", "Bring the joy",
  "Loud and proud", "Rainbow ready", "Click for love", "One more shot",
  "Best in show", "Cheer them on", "Pick a champ", "Shine together",
  "Brighter as one", "We are pride", "Open hearts", "More color please",
  "Snap happy", "Smile wide", "Big love", "Tiny moment",
  "Huge feels", "Pure joy", "Stay you", "Be radiant",
  "Born to shine", "Free to be", "Hear us roar", "Color outside",
  "Pose proud", "Live loud", "Love freely", "Bold and bright",
  "Flash a smile", "Hold the joy", "Made of pride", "Light the night",
  "Cheer the crew", "Best frame here", "Vote it up", "Tap to cheer",
  "All the feels", "So much pride", "Keep glowing", "Stay bright",
  "Bring color", "Find your shine", "Be the spark", "Joy on repeat",
  "Pride forever", "Color us happy", "Shine your way", "Love wins here",
  "Look this way", "Big smiles only", "Heart full", "Pure pride",
  "Glow getter", "One love", "Be the moment", "Capture pride",
  "Snap your pride", "Loudest cheer",
];

const TYPE_MS = [70, 110] as const;
const DELETE_MS = 42;
const HOLD_MS = 2500;
const GAP_MS = 360;

function shuffled<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function ForceGallery({ photos, votedIds, isOwner, onSelect }: ForceGalleryProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const nodesRef = useRef<ForceNode[]>([]);
  const simRef = useRef<Simulation<ForceNode, undefined> | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const hoverRef = useRef<string | null>(null);
  const parallaxRef = useRef({ x: 0, y: 0 });
  const textRef = useRef({ shown: "", full: "" });

  const votedRef = useRef(votedIds);
  const cbRef = useRef({ isOwner, onSelect });

  useEffect(() => {
    votedRef.current = votedIds;
    cbRef.current = { isOwner, onSelect };
  }, [isOwner, onSelect, votedIds]);

  // ── one-time setup ──
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let transform: ZoomTransform = zoomIdentity;

    const setSize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    setSize();
    const { w, h } = sizeRef.current;

    const makeNode = (p: GalleryPhoto, i: number, fromEdge: boolean): ForceNode => {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const node: ForceNode = {
        id: p.id,
        photo: p,
        img: null,
        r: 40 + (i % 3) * 1.5, // sizes within ~7%
        x: fromEdge ? w / 2 + Math.cos(angle) * (w * 0.65) : w / 2 + Math.cos(angle) * 60,
        y: fromEdge ? h / 2 + Math.sin(angle) * (h * 0.65) : h / 2 + Math.sin(angle) * 60,
        appear: fromEdge ? 0 : 1,
      };
      const im = new Image();
      im.decoding = "async";
      im.src = p.thumbnailUrl ?? p.imageUrl;
      im.onload = () => {
        node.img = im;
        drawRef.current();
      };
      return node;
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const textNode: ForceNode = {
      id: TEXT_NODE_ID,
      photo: null,
      img: null,
      r: 30,
      x: w / 2,
      y: h / 2,
      appear: 1,
      isText: true,
      fx: w / 2,
      fy: h / 2,
    };
    if (reduceMotion) {
      textRef.current = {
        shown: TYPEWRITER_PHRASES[0],
        full: TYPEWRITER_PHRASES[0],
      };
    }

    const measureTextRadius = () => {
      ctx.font = TEXT_FONT;
      const width = ctx.measureText(textRef.current.shown || " ").width;
      return Math.max(34, width / 2 + TEXT_PAD);
    };
    textNode.r = measureTextRadius();

    const nodes = [...photos.map((p, i) => makeNode(p, i, false)), textNode];
    nodesRef.current = nodes;

    function draw() {
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);
      const px = parallaxRef.current.x;
      const py = parallaxRef.current.y;
      for (const n of nodesRef.current) {
        if (n.isText) {
          const text = textRef.current.shown;
          ctx.save();
          ctx.translate(n.x, n.y);
          ctx.font = TEXT_FONT;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "rgba(0,0,0,0.55)";
          ctx.shadowBlur = 18;
          ctx.fillStyle = "#fff";
          ctx.fillText(text, 0, 0);
          // blinking caret
          const w = ctx.measureText(text).width;
          ctx.shadowBlur = 0;
          ctx.fillStyle =
            Math.floor(Date.now() / 530) % 2 === 0 ? "#ff7d9c" : "rgba(255,125,156,0)";
          ctx.fillRect(w / 2 + 5, -15, 3, 30);
          ctx.restore();
          continue;
        }
        if (!n.photo) continue;
        const liked = cbRef.current.isOwner(n.photo) || votedRef.current.has(n.id);
        const hovered = hoverRef.current === n.id;
        // subtle parallax: deeper (smaller) nodes drift a touch more
        const depth = (n.r - 41) * 0.6 + (hovered ? 0 : 1);
        const ox = px * (6 + depth);
        const oy = py * (6 + depth);
        const scale = n.appear * (hovered ? 1.12 : 1);
        const rr = n.r * scale;
        const tilt = hovered ? px * 0.18 : 0; // pseudo-tilt toward cursor

        ctx.save();
        ctx.translate(n.x + ox, n.y + oy);
        ctx.rotate(tilt);
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        if (n.img) {
          const s = Math.max((rr * 2) / n.img.width, (rr * 2) / n.img.height);
          ctx.drawImage(n.img, (-n.img.width * s) / 2, (-n.img.height * s) / 2, n.img.width * s, n.img.height * s);
        } else {
          ctx.fillStyle = "#222024";
          ctx.fill();
        }
        ctx.restore();

        // ring
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        if (liked) {
          const grad = ctx.createConicGradient(0, 0, 0);
          RAINBOW.forEach((c, idx) => grad.addColorStop(idx / (RAINBOW.length - 1), c));
          ctx.strokeStyle = grad;
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = hovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.22)";
          ctx.lineWidth = hovered ? 2.5 : 1.5;
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    drawRef.current = draw;

    // Same-pole magnet: the text node repels with a charge that scales with its
    // live radius (wider phrase → stronger field → photos flee into a ring),
    // while photos keep a modest charge. forceManyBody reads strength via this
    // accessor only at (re)initialization, so we re-apply the force whenever the
    // text radius changes (see applyText) to grow/shrink the field live.
    const CHARGE_K = 9; // text strength ≈ -(r * K); tuned so the ring stays tight, not far-flung
    const PHOTO_CHARGE = -40;
    const MAX_TEXT_CHARGE = -1300; // bound magnitude so nodes never explode / NaN
    const chargeStrength = (d: ForceNode) =>
      d.isText ? Math.max(MAX_TEXT_CHARGE, -(d.r * CHARGE_K)) : PHOTO_CHARGE;

    const sim = forceSimulation(nodes)
      .force(
        "charge",
        forceManyBody<ForceNode>()
          .strength(chargeStrength)
          .distanceMax(Math.max(w, h) * 0.5), // clamp range so it can't shove photos off-canvas forever
      )
      .force("center", forceCenter(w / 2, h / 2))
      // live radius read each tick so the growing text node carves out space;
      // text node gets extra padding so it shoves photos a little harder.
      .force(
        "collide",
        forceCollide<ForceNode>()
          .radius((d) => d.r + (d.isText ? 14 : 6))
          .strength(0.95)
          .iterations(3),
      )
      .force("x", forceX(w / 2).strength(0.07))
      .force("y", forceY(h / 2).strength(0.07))
      .on("tick", () => {
        // ease entrance scale-in
        for (const n of nodesRef.current) {
          if (n.appear < 1) {
            n.appear = Math.min(1, n.appear + 0.04);
          }
        }
        draw();
      });
    simRef.current = sim;

    const reheat = (alpha: number) => {
      sim.alpha(Math.max(sim.alpha(), alpha)).restart();
    };

    // Monoton loads async (next/font self-hosts it under the literal family
    // "Monoton"). First measure/paint would use fallback metrics; once the
    // real glyphs are ready we re-measure the text radius and redraw so it
    // never flashes the fallback font. We kick off the latin subset load but
    // rely on fonts.ready (which always resolves) to trigger the redraw, so an
    // erroring sibling subset can't swallow it.
    if (typeof document !== "undefined" && "fonts" in document) {
      const settle = () => {
        textNode.r = measureTextRadius();
        reheat(0.2);
        draw();
      };
      document.fonts.load(`${TEXT_SIZE}px Monoton`, "AAA").catch(() => {});
      document.fonts.ready.then(settle).catch(settle);
    }

    // ── typewriter center node: type → hold → delete → next, looping forever.
    // After each char the text node radius is remeasured and the sim is gently
    // reheated, so the growing/shrinking collision radius pushes/releases photos.
    let typeTimer: number | null = null;
    let caretTimer: number | null = null;
    if (!reduceMotion) {
      let queue = shuffled(TYPEWRITER_PHRASES);
      let qIndex = 0;
      let phrase = queue[qIndex];
      let charCount = 0;
      let mode: "typing" | "holding" | "deleting" = "typing";

      const applyText = () => {
        textRef.current = { shown: phrase.slice(0, charCount), full: phrase };
        const prevR = textNode.r;
        textNode.r = measureTextRadius();
        // React to each glyph: when the radius shifts (even slightly) re-apply
        // forceManyBody so its strength accessor re-reads the new text radius,
        // growing/shrinking the repulsion field live, then reheat for a visible
        // shove. Threshold 0.2 keeps it responsive per keystroke without firing
        // during holds / equal-width chars (no jitter).
        if (Math.abs(textNode.r - prevR) > 0.2) {
          sim.force(
            "charge",
            forceManyBody<ForceNode>()
              .strength(chargeStrength)
              .distanceMax(Math.max(sizeRef.current.w, sizeRef.current.h) * 0.5),
          );
          reheat(0.5);
        }
      };

      const step = () => {
        if (mode === "typing") {
          if (charCount < phrase.length) {
            charCount += 1;
            applyText();
            const ms = TYPE_MS[0] + Math.random() * (TYPE_MS[1] - TYPE_MS[0]);
            typeTimer = window.setTimeout(step, ms);
          } else {
            mode = "holding";
            typeTimer = window.setTimeout(step, HOLD_MS);
          }
        } else if (mode === "holding") {
          mode = "deleting";
          typeTimer = window.setTimeout(step, DELETE_MS);
        } else {
          if (charCount > 0) {
            charCount -= 1;
            applyText();
            typeTimer = window.setTimeout(step, DELETE_MS);
          } else {
            qIndex += 1;
            if (qIndex >= queue.length) {
              queue = shuffled(TYPEWRITER_PHRASES);
              qIndex = 0;
            }
            phrase = queue[qIndex];
            mode = "typing";
            typeTimer = window.setTimeout(step, GAP_MS);
          }
        }
      };
      applyText();
      typeTimer = window.setTimeout(step, GAP_MS);
      // keep the caret blinking even when the sim has cooled to alpha 0
      caretTimer = window.setInterval(() => draw(), 260);
    }

    const zoomB = d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.25, 3])
      .on("zoom", (event) => {
        transform = event.transform;
        draw();
      });
    zoomRef.current = zoomB;
    select(canvas).call(zoomB);
    select(canvas).call(zoomB.transform, zoomIdentity.scale(0.85));

    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - transform.x) / transform.k,
        y: (clientY - rect.top - transform.y) / transform.k,
        rect,
      };
    };
    const nodeAt = (clientX: number, clientY: number): ForceNode | null => {
      const { x, y } = toWorld(clientX, clientY);
      const px = parallaxRef.current.x;
      const py = parallaxRef.current.y;
      const ns = nodesRef.current;
      for (let i = ns.length - 1; i >= 0; i--) {
        const n = ns[i];
        if (n.isText) continue;
        // mirror draw()'s parallax offset so taps land on the visual node
        const hovered = hoverRef.current === n.id;
        const depth = (n.r - 41) * 0.6 + (hovered ? 0 : 1);
        const ox = px * (6 + depth);
        const oy = py * (6 + depth);
        const cx = n.x + ox;
        const cy = n.y + oy;
        if ((x - cx) ** 2 + (y - cy) ** 2 <= n.r * n.r) return n;
      }
      return null;
    };

    let downX = 0;
    let downY = 0;
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const n = nodeAt(e.clientX, e.clientY);
      if (n?.photo) cbRef.current.onSelect(n.photo);
    };
    const onMove = (e: PointerEvent) => {
      const { w, h } = sizeRef.current;
      const rect = canvas.getBoundingClientRect();
      parallaxRef.current = {
        x: ((e.clientX - rect.left) / w - 0.5) * 2,
        y: ((e.clientY - rect.top) / h - 0.5) * 2,
      };
      wrap.style.setProperty("--cursor-x", `${e.clientX - rect.left}px`);
      wrap.style.setProperty("--cursor-y", `${e.clientY - rect.top}px`);
      const n = nodeAt(e.clientX, e.clientY);
      const id = n?.id ?? null;
      if (id !== hoverRef.current) {
        hoverRef.current = id;
        canvas.style.cursor = id ? "pointer" : "grab";
      }
      draw();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);

    const onResize = () => {
      setSize();
      const { w, h } = sizeRef.current;
      sim.force("center", forceCenter(w / 2, h / 2));
      sim.force("x", forceX(w / 2).strength(0.07));
      sim.force("y", forceY(h / 2).strength(0.07));
      sim.force(
        "charge",
        forceManyBody<ForceNode>()
          .strength(chargeStrength)
          .distanceMax(Math.max(w, h) * 0.5),
      );
      textNode.fx = w / 2;
      textNode.fy = h / 2;
      reheat(0.3);
    };
    window.addEventListener("resize", onResize);

    return () => {
      sim.stop();
      if (typeTimer !== null) window.clearTimeout(typeTimer);
      if (caretTimer !== null) window.clearInterval(caretTimer);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      select(canvas).on(".zoom", null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── incremental add/remove on photos change (NO full reset) ──
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    const existing = nodesRef.current;
    const byId = new Map(existing.map((n) => [n.id, n]));
    const incomingIds = new Set(photos.map((p) => p.id));
    const { w, h } = sizeRef.current;

    let changed = false;
    // add new (spawn from edge)
    photos.forEach((p, i) => {
      if (!byId.has(p.id)) {
        const angle = Math.random() * Math.PI * 2;
        const node: ForceNode = {
          id: p.id,
          photo: p,
          img: null,
          r: 40 + (i % 3) * 1.5,
          x: w / 2 + Math.cos(angle) * (w * 0.7),
          y: h / 2 + Math.sin(angle) * (h * 0.7),
          appear: 0,
        };
        const im = new Image();
        im.decoding = "async";
        im.src = p.thumbnailUrl ?? p.imageUrl;
        im.onload = () => {
          node.img = im;
          drawRef.current();
        };
        existing.push(node);
        changed = true;
      }
    });
    // remove deleted (keep the pinned typewriter text node)
    const filtered = existing.filter((n) => n.isText || incomingIds.has(n.id));
    if (filtered.length !== existing.length) changed = true;

    if (changed) {
      nodesRef.current = filtered;
      sim.nodes(filtered);
      sim.alpha(0.3).restart(); // gentle nudge, not a full re-layout
    }
  }, [photos]);

  // redraw when vote state changes (no sim reheat)
  useEffect(() => {
    drawRef.current();
  }, [votedIds]);

  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    const zoomB = zoomRef.current;
    if (!canvas || !zoomB) return;
    select(canvas).call(zoomB.scaleBy, factor);
  };

  return (
    <div ref={wrapRef} className="force-gallery">
      <canvas ref={canvasRef} className="force-canvas" />
      <div className="force-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.3)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.3)}>−</button>
      </div>
      <p className="force-hint">Drag to pan · scroll or use buttons to zoom · tap a photo to open</p>
    </div>
  );
}
