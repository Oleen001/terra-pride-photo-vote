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
  isGlyph?: boolean; // invisible pinned repeller placed along the text baseline
  fx?: number | null;
  fy?: number | null;
};

type ForceGalleryProps = {
  photos: GalleryPhoto[];
  votedIds: Set<string>;
  isOwner: (photo: GalleryPhoto) => boolean;
  onSelect: (photo: GalleryPhoto) => void;
  phrases: string[];
};

const RAINBOW = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#2443ff", "#732982", "#e40303"];

const GLYPH_ID_PREFIX = "__glyph__";
// NOTE: canvas ctx.font does NOT support CSS var() — must be a concrete family.
// Monoton is a single-weight (400) display face; no bold available.
const TEXT_FONT = "400 60px Monoton, ui-sans-serif, system-ui, sans-serif";
const TEXT_SIZE = 60;

// ── per-glyph repeller tuning ──
// Each visible non-space char becomes a small pinned node along the text
// baseline. Together they form an elongated repulsion band that follows the
// letters instead of one big symmetric circle.
const GLYPH_CHARGE = -150; // per-glyph repulsion; many small nodes ≈ old single field
const GLYPH_RADIUS = 24; // small collide radius so photos clear the band without flinging far
const GLYPH_COLLIDE_PAD = 10; // extra collide padding around each glyph node

// Fallback used only when the DB-managed phrase list is empty (admin hasn't
// added any, or the fetch failed). Keep it tiny — the real list comes from the
// `phrases` prop.
const FALLBACK_PHRASES = [
  "Capture the moment",
  "Show your colors",
  "Vote your favorite",
  "Love is loud",
  "Proud and loud",
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

export function ForceGallery({ photos, votedIds, isOwner, onSelect, phrases }: ForceGalleryProps) {
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
  // Snapshot of the phrase list read once by the setup effect below. The effect
  // runs once on mount (empty deps), so we capture the prop here; later prop
  // changes don't re-init the sim (matches the existing once-only design).
  const phrasesRef = useRef(phrases);

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

    // Effective phrase list: DB-managed phrases when present, else the small
    // built-in fallback.
    const PHRASES =
      phrasesRef.current.length > 0 ? phrasesRef.current : FALLBACK_PHRASES;

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

    if (reduceMotion) {
      textRef.current = {
        shown: PHRASES[0],
        full: PHRASES[0],
      };
    }

    // Build one pinned repeller node per *visible* glyph of the currently shown
    // text. The text is drawn center-aligned, so each glyph's pin x is its
    // horizontal offset from center, computed from cumulative measured char
    // widths: left edge starts at -totalWidth/2, each node sits at the glyph's
    // midpoint. y is the center line for all. Spaces are skipped (no node) but
    // still advance the cursor so following glyphs land correctly. Returns the
    // count of visible glyphs so callers can throttle rebuilds.
    const glyphNodes: ForceNode[] = [];
    const buildGlyphNodes = (): number => {
      const { w, h } = sizeRef.current;
      const text = textRef.current.shown;
      ctx.font = TEXT_FONT;
      const total = ctx.measureText(text || " ").width;
      const startX = w / 2 - total / 2;
      const cy = h / 2;

      glyphNodes.length = 0;
      let cursor = 0; // running x offset from startX
      let visible = 0;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const wch = ctx.measureText(ch).width;
        if (ch !== " ") {
          const gx = startX + cursor + wch / 2;
          glyphNodes.push({
            id: `${GLYPH_ID_PREFIX}${visible}`,
            photo: null,
            img: null,
            r: GLYPH_RADIUS,
            x: gx,
            y: cy,
            appear: 1,
            isGlyph: true,
            fx: gx,
            fy: cy,
          });
          visible++;
        }
        cursor += wch;
      }
      return visible;
    };
    buildGlyphNodes();

    const photoNodes = photos.map((p, i) => makeNode(p, i, false));
    const nodes = [...photoNodes, ...glyphNodes];
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
      // ── photos ──
      for (const n of nodesRef.current) {
        if (n.isGlyph) continue; // invisible repellers — never drawn
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

      // ── text: one center-aligned fillText (visual unchanged from before;
      // physics now lives in the invisible glyph nodes above) ──
      const text = textRef.current.shown;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.font = TEXT_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#fff";
      ctx.fillText(text, 0, 0);
      // blinking caret
      const tw = ctx.measureText(text).width;
      ctx.shadowBlur = 0;
      ctx.fillStyle =
        Math.floor(Date.now() / 530) % 2 === 0 ? "#ff7d9c" : "rgba(255,125,156,0)";
      ctx.fillRect(tw / 2 + 5, -15, 3, 30);
      ctx.restore();
    }
    drawRef.current = draw;

    // Multi-pole magnet: each invisible glyph node repels with a fixed modest
    // charge. Spread along the text baseline they form an elongated band that
    // follows the letters (not one circle); the union of their fields pushes
    // photos clear of the whole horizontal text strip. Charge is constant per
    // glyph, so the field strength scales naturally with phrase length (more
    // chars typed → more poles → wider carved-out band) — no per-tick re-init
    // of forceManyBody needed. Photos keep a small mutual charge.
    const PHOTO_CHARGE = -40;
    const chargeStrength = (d: ForceNode) => (d.isGlyph ? GLYPH_CHARGE : PHOTO_CHARGE);

    const sim = forceSimulation(nodes)
      .force(
        "charge",
        forceManyBody<ForceNode>()
          .strength(chargeStrength)
          .distanceMax(Math.max(w, h) * 0.5), // clamp range so it can't shove photos off-canvas forever
      )
      .force("center", forceCenter(w / 2, h / 2))
      // glyph nodes get extra collide padding so photos keep a clean margin
      // from the text band; photos use the original modest padding.
      .force(
        "collide",
        forceCollide<ForceNode>()
          .radius((d) => d.r + (d.isGlyph ? GLYPH_COLLIDE_PAD : 6))
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

    // Rebuild the glyph repeller set to match textRef.current.shown, splice it
    // back into the live node list (keeping all current photo nodes), hand the
    // new list to the sim, and reheat. forceManyBody / forceCollide read the
    // node list lazily via sim.nodes(), so swapping nodes is enough — no need
    // to re-instantiate the forces themselves.
    const rebuildGlyphs = (alpha: number) => {
      buildGlyphNodes();
      const photosOnly = nodesRef.current.filter((n) => !n.isGlyph);
      const next = [...photosOnly, ...glyphNodes];
      nodesRef.current = next;
      sim.nodes(next);
      reheat(alpha);
    };

    // Monoton loads async (next/font self-hosts it under the literal family
    // "Monoton"). First measure/paint would use fallback metrics; once the
    // real glyphs are ready we re-measure glyph positions (the cumulative char
    // widths change with the real font) and redraw so it never flashes the
    // fallback font. We kick off the latin subset load but rely on fonts.ready
    // (which always resolves) to trigger the redraw, so an erroring sibling
    // subset can't swallow it.
    if (typeof document !== "undefined" && "fonts" in document) {
      const settle = () => {
        rebuildGlyphs(0.2);
        draw();
      };
      document.fonts.load(`${TEXT_SIZE}px Monoton`, "AAA").catch(() => {});
      document.fonts.ready.then(settle).catch(settle);
    }

    // ── typewriter: type → hold → delete → next, looping forever.
    // After each keystroke we update the shown text, then rebuild the glyph
    // repeller set ONLY when the count of *visible* glyphs changed (throttle:
    // skip spaces / sub-glyph changes so we don't thrash the sim). Rebuilding
    // adds a pole as a char appears and removes one as it deletes, repositions
    // every glyph along the new (center-aligned) measured width, and reheats —
    // so the band grows/follows the letters while typing and collapses back
    // when deleting.
    let typeTimer: number | null = null;
    let caretTimer: number | null = null;
    let lastGlyphCount = glyphNodes.length;
    if (!reduceMotion) {
      let queue = shuffled(PHRASES);
      let qIndex = 0;
      let phrase = queue[qIndex];
      let charCount = 0;
      let mode: "typing" | "holding" | "deleting" = "typing";

      const applyText = () => {
        textRef.current = { shown: phrase.slice(0, charCount), full: phrase };
        // Count visible glyphs in the new string (skip spaces) to decide
        // whether the repeller set actually changed shape.
        let visible = 0;
        for (let i = 0; i < charCount; i++) if (phrase[i] !== " ") visible++;
        if (visible !== lastGlyphCount) {
          lastGlyphCount = visible;
          rebuildGlyphs(0.5);
        } else {
          // same glyph count (e.g. typed a space) — just repaint the text
          draw();
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
              queue = shuffled(PHRASES);
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
        if (n.isGlyph || !n.photo) continue; // glyph repellers are invisible — never hit-test
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
      // re-pin every glyph to the new center / re-measured baseline width
      rebuildGlyphs(0.3);
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
    // remove deleted (keep the pinned typewriter glyph repeller nodes)
    const filtered = existing.filter((n) => n.isGlyph || incomingIds.has(n.id));
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
