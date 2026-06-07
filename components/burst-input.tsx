"use client";

import { forwardRef, useState } from "react";
import type {
  CSSProperties,
  FormEvent,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

// The "exploding typewriter" effect that originated on the sign-in email field,
// extracted so any input/textarea can reuse it. Each keystroke spawns the typed
// glyph (rainbow, animated impact) plus a ring of splash particles near the
// caret. Styling lives in globals.css (.typing-burst*).

type Burst = { id: number; char: string; x: number };

function TypingBurst({ burst }: { burst: Burst | null }) {
  if (!burst) return null;
  return (
    <span
      key={burst.id}
      className="typing-burst"
      style={{ "--burst-x": `${burst.x}px` } as CSSProperties}
      aria-hidden
    >
      <span className="typing-burst-char">{burst.char}</span>
      {Array.from({ length: 6 }, (_, index) => (
        <span
          key={index}
          className="typing-burst-splash"
          style={
            {
              "--burst-angle": `${index * 60 - 24}deg`,
              "--burst-distance": `${18 + (index % 2) * 8}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

// One reusable offscreen canvas for text measurement.
let measureCtx: CanvasRenderingContext2D | null | undefined;
function getMeasureCtx() {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  }
  return measureCtx;
}

// Pixel x of the caret inside the field — measured from the real rendered text
// (font, weight, letter-spacing, text-align, padding, horizontal scroll) so the
// burst lands exactly on the glyph just typed. `fallbackCharWidth` is only used
// when canvas measurement isn't available.
function caretX(el: HTMLInputElement | HTMLTextAreaElement, fallbackCharWidth: number): number {
  const cursor = el.selectionStart ?? el.value.length;
  const style = getComputedStyle(el);
  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  const ls = parseFloat(style.letterSpacing) || 0; // "normal" → NaN → 0

  const mctx = getMeasureCtx();
  if (!mctx) {
    return Math.min(Math.max(padL, padL + cursor * fallbackCharWidth), el.clientWidth - 4);
  }
  mctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const measure = (s: string) => mctx.measureText(s).width + ls * s.length;

  // measure only the current line so multiline textareas land on the right glyph
  const beforeAll = el.value.slice(0, cursor);
  const before = beforeAll.slice(beforeAll.lastIndexOf("\n") + 1);
  const total = measure(before);
  const contentW = el.clientWidth - padL - padR;

  let startX = padL; // left-aligned default
  if (style.textAlign === "center") startX = padL + Math.max(0, (contentW - total) / 2);
  else if (style.textAlign === "right" || style.textAlign === "end")
    startX = padL + Math.max(0, contentW - total);

  const x = startX + measure(before) - el.scrollLeft;
  return Math.min(Math.max(4, x), el.clientWidth - 4);
}

function useBurst(fallbackCharWidth: number) {
  const [burst, setBurst] = useState<Burst | null>(null);

  const handle = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    const inputEvent = event.nativeEvent as InputEvent;
    const char = inputEvent.data ?? el.value.slice(-1);
    // Only fire on actual character insertion — not deletes / IME composition.
    if (!char || inputEvent.inputType?.startsWith("delete")) return;

    const x = caretX(el, fallbackCharWidth);

    const id = Date.now();
    setBurst({ id, char: char.slice(-1), x });
    window.setTimeout(() => {
      setBurst((current) => (current?.id === id ? null : current));
    }, 1500);
  };

  return { burst, handle };
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** px per character, used to place the burst near the caret. */
  averageCharWidth?: number;
  /** class for the positioned wrapper (use for flex sizing, e.g. "flex-1"). */
  wrapperClassName?: string;
};

export const BurstInput = forwardRef<HTMLInputElement, InputProps>(
  function BurstInput({ averageCharWidth = 7.2, wrapperClassName, onInput, ...rest }, ref) {
    const { burst, handle } = useBurst(averageCharWidth);
    return (
      <span className={`relative block${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
        <input
          ref={ref}
          {...rest}
          onInput={(e) => {
            handle(e);
            onInput?.(e);
          }}
        />
        <TypingBurst burst={burst} />
      </span>
    );
  },
);

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  averageCharWidth?: number;
  wrapperClassName?: string;
};

export const BurstTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function BurstTextarea({ averageCharWidth = 7.2, wrapperClassName, onInput, ...rest }, ref) {
    const { burst, handle } = useBurst(averageCharWidth);
    return (
      <span className={`relative block${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
        <textarea
          ref={ref}
          {...rest}
          onInput={(e) => {
            handle(e);
            onInput?.(e);
          }}
        />
        <TypingBurst burst={burst} />
      </span>
    );
  },
);
