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
  photo: GalleryPhoto;
  img: HTMLImageElement | null;
  r: number;
  x: number;
  y: number;
  appear: number; // 0..1 entrance progress (scale-in from edge)
};

type ForceGalleryProps = {
  photos: GalleryPhoto[];
  votedIds: Set<string>;
  isOwner: (photo: GalleryPhoto) => boolean;
  onSelect: (photo: GalleryPhoto) => void;
};

const RAINBOW = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#2443ff", "#732982", "#e40303"];

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

  const votedRef = useRef(votedIds);
  votedRef.current = votedIds;
  const cbRef = useRef({ isOwner, onSelect });
  cbRef.current = { isOwner, onSelect };

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

    const nodes = photos.map((p, i) => makeNode(p, i, false));
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

    const sim = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-46))
      .force("center", forceCenter(w / 2, h / 2))
      .force("collide", forceCollide<ForceNode>().radius((d) => d.r + 6).iterations(2))
      .force("x", forceX(w / 2).strength(0.045))
      .force("y", forceY(h / 2).strength(0.045))
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
      if (n) cbRef.current.onSelect(n.photo);
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
      sim.force("x", forceX(w / 2).strength(0.045));
      sim.force("y", forceY(h / 2).strength(0.045));
      reheat(0.3);
    };
    window.addEventListener("resize", onResize);

    return () => {
      sim.stop();
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
    // remove deleted
    const filtered = existing.filter((n) => incomingIds.has(n.id));
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
