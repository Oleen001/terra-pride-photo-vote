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
};

type ForceGalleryProps = {
  photos: GalleryPhoto[];
  votedIds: Set<string>;
  votingOpen: boolean;
  loggedIn: boolean;
  isOwner: (photo: GalleryPhoto) => boolean;
  onVote: (photo: GalleryPhoto) => void;
  onUnvote: (photo: GalleryPhoto) => void;
};

export function ForceGallery({
  photos,
  votedIds,
  votingOpen,
  loggedIn,
  isOwner,
  onVote,
  onUnvote,
}: ForceGalleryProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const drawRef = useRef<() => void>(() => {});
  // keep latest votedIds / handlers without re-running the heavy setup effect
  const votedRef = useRef(votedIds);
  votedRef.current = votedIds;
  const handlersRef = useRef({ votingOpen, loggedIn, isOwner, onVote, onUnvote });
  handlersRef.current = { votingOpen, loggedIn, isOwner, onVote, onUnvote };

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = wrap.clientWidth;
    let h = wrap.clientHeight;
    let transform: ZoomTransform = zoomIdentity;

    const setSize = () => {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    setSize();

    const nodes: ForceNode[] = photos.map((p, i) => ({
      id: p.id,
      photo: p,
      img: null,
      r: 30 + (i % 4) * 7,
      x: w / 2 + Math.cos(i * 2.4) * 60,
      y: h / 2 + Math.sin(i * 2.4) * 60,
    }));

    nodes.forEach((n) => {
      const im = new Image();
      im.decoding = "async";
      im.src = n.photo.thumbnailUrl ?? n.photo.imageUrl;
      im.onload = () => {
        n.img = im;
        drawRef.current();
      };
    });

    function draw() {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);
      for (const n of nodes) {
        const liked = handlersRef.current.isOwner(n.photo) || votedRef.current.has(n.id);
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        if (n.img) {
          const s = Math.max((n.r * 2) / n.img.width, (n.r * 2) / n.img.height);
          const dw = n.img.width * s;
          const dh = n.img.height * s;
          ctx.drawImage(n.img, n.x - dw / 2, n.y - dh / 2, dw, dh);
        } else {
          ctx.fillStyle = "#222024";
          ctx.fill();
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.lineWidth = liked ? 3.5 : 1.5;
        ctx.strokeStyle = liked ? "#f43f6b" : "rgba(255,255,255,0.22)";
        ctx.stroke();
      }
    }
    drawRef.current = draw;

    const sim: Simulation<ForceNode, undefined> = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-46))
      .force("center", forceCenter(w / 2, h / 2))
      .force("collide", forceCollide<ForceNode>().radius((d) => d.r + 6).iterations(2))
      .force("x", forceX(w / 2).strength(0.045))
      .force("y", forceY(h / 2).strength(0.045))
      .on("tick", draw);

    const zoomB = d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.25, 3])
      .on("zoom", (event) => {
        transform = event.transform;
        draw();
      });
    zoomRef.current = zoomB;
    select(canvas).call(zoomB);
    // start a touch zoomed-out so the whole cluster is visible
    select(canvas).call(zoomB.transform, zoomIdentity.translate(0, 0).scale(0.85));

    const nodeAt = (clientX: number, clientY: number): ForceNode | null => {
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const x = (mx - transform.x) / transform.k;
      const y = (my - transform.y) / transform.k;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = x - n.x;
        const dy = y - n.y;
        if (dx * dx + dy * dy <= n.r * n.r) return n;
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
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // was a pan, not a tap
      const n = nodeAt(e.clientX, e.clientY);
      if (!n) return;
      const h = handlersRef.current;
      if (!h.loggedIn) {
        window.location.href = "/login";
        return;
      }
      if (h.isOwner(n.photo) || !h.votingOpen) return;
      if (votedRef.current.has(n.id)) h.onUnvote(n.photo);
      else h.onVote(n.photo);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    const onResize = () => {
      setSize();
      sim.force("center", forceCenter(w / 2, h / 2));
      sim.force("x", forceX(w / 2).strength(0.045));
      sim.force("y", forceY(h / 2).strength(0.045));
      sim.alpha(0.4).restart();
    };
    window.addEventListener("resize", onResize);

    return () => {
      sim.stop();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
    };
  }, [photos]);

  // redraw when vote state changes (sim may be cooled down)
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
        <button type="button" aria-label="ซูมเข้า" onClick={() => zoomBy(1.3)}>+</button>
        <button type="button" aria-label="ซูมออก" onClick={() => zoomBy(1 / 1.3)}>−</button>
      </div>
      <p className="force-hint">ลากเพื่อเลื่อน · เลื่อนล้อ/ปุ่มเพื่อซูม · แตะรูปเพื่อโหวต</p>
    </div>
  );
}
