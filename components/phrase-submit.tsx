"use client";

import { useId, useRef, useState, useTransition } from "react";
import { submitPhraseAction } from "@/app/actions/phrases";
import { BurstInput } from "@/components/burst-input";

const MAX_LEN = 60;
const STREAMLINE_SEND_PATH =
  "M13.8536.146461c.1397.13972.184.348619.1131.533043L8.96667 13.6795c-.07232.188-.25043.3143-.45181.3203-.20138.006-.38667-.1095-.47004-.2929L5.95386 9.1068l3.07647-3.07647c.29289-.29289.29289-.76777 0-1.06066s-.76777-.29289-1.06066 0L4.89319 8.04615.2931 5.9552c-.183409-.08337-.29886581-.26867-.292877753-.47005C.00621034 5.28378.132474 5.10566.320512 5.03334L13.3205.0333416c.1844-.0709322.3933-.02660085.5331.1131194Z";

function SendIconButton({
  pending,
  success,
}: {
  pending: boolean;
  success: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  const baseGradientId = `${gradientId}-base`;
  const hoverGradientId = `${gradientId}-hover`;
  const successGradientId = `${gradientId}-success`;

  return (
    <button
      type="submit"
      className={`phrase-submit-btn ${success ? "is-success" : ""}`}
      disabled={pending}
      aria-label={pending ? "Sending" : "Send phrase"}
      title={pending ? "Sending" : "Send"}
    >
      <span className="phrase-submit-impact" aria-hidden="true" />
      <svg
        className="phrase-submit-send-icon"
        viewBox="0 0 14 14"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={baseGradientId}
            x1="2.288"
            x2="13.596"
            y1="2.692"
            y2="8.957"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ffc700" />
            <stop offset="1" stopColor="#02be6f" />
          </linearGradient>
          <linearGradient
            id={hoverGradientId}
            x1="0.6"
            x2="13.4"
            y1="13.1"
            y2="0.9"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#24cdfe" />
            <stop offset="0.5" stopColor="#ff4ecd" />
            <stop offset="1" stopColor="#fff257" />
          </linearGradient>
          <linearGradient
            id={successGradientId}
            x1="-10"
            x2="24"
            y1="7"
            y2="7"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#e40303" />
            <stop offset="0.16" stopColor="#ff8c00" />
            <stop offset="0.32" stopColor="#ffed00" />
            <stop offset="0.48" stopColor="#008026" />
            <stop offset="0.64" stopColor="#2443ff" />
            <stop offset="0.8" stopColor="#732982" />
            <stop offset="1" stopColor="#e40303" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-8 0"
              to="8 0"
              dur="0.65s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        <path
          className="send-icon-streamline send-icon-base"
          fill={`url(#${baseGradientId})`}
          fillRule="evenodd"
          clipRule="evenodd"
          d={STREAMLINE_SEND_PATH}
        />
        <path
          className="send-icon-streamline send-icon-hover"
          fill={`url(#${hoverGradientId})`}
          fillRule="evenodd"
          clipRule="evenodd"
          d={STREAMLINE_SEND_PATH}
        />
        <path
          className="send-icon-streamline send-icon-success"
          fill={`url(#${successGradientId})`}
          fillRule="evenodd"
          clipRule="evenodd"
          d={STREAMLINE_SEND_PATH}
        />
      </svg>
    </button>
  );
}

// Friendly little composer that floats at the bottom of the graph view. Lets a
// signed-in guest drop their own words onto the typewriter wall.
export function PhraseSubmit() {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim().replace(/\s+/g, " ");
    if (!text) {
      setSendSuccess(false);
      setMsg({ kind: "err", text: "Type something first 🙂" });
      return;
    }
    setSendSuccess(false);
    setMsg(null);
    startTransition(async () => {
      const res = await submitPhraseAction(text);
      if (!res.ok) {
        setSendSuccess(false);
        setMsg({ kind: "err", text: res.error ?? "Couldn't add that. Try again." });
        return;
      }
      setValue("");
      setSendSuccess(true);
      setMsg({ kind: "ok", text: "Added! It'll shimmer by soon ✨" });
      inputRef.current?.focus();
    });
  }

  return (
    <form className="phrase-submit" onSubmit={submit}>
      <div className="phrase-submit-row">
        <BurstInput
          ref={inputRef}
          id="phrase-submit-input"
          wrapperClassName="phrase-submit-input"
          className="field-input"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSendSuccess(false);
          }}
          maxLength={MAX_LEN}
          autoComplete="off"
          placeholder="Say something proud…"
          aria-describedby="phrase-submit-help"
        />
        <SendIconButton pending={pending} success={sendSuccess} />
      </div>
      <p id="phrase-submit-help" className="phrase-submit-help" aria-live="polite">
        {msg ? (
          <span className={msg.kind === "ok" ? "phrase-submit-ok" : "phrase-submit-err"}>
            {msg.text}
          </span>
        ) : (
          <>Your words join everyone else&apos;s on the wall · up to {MAX_LEN} characters</>
        )}
      </p>
    </form>
  );
}
