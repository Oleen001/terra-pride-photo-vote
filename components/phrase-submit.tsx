"use client";

import { useRef, useState, useTransition } from "react";
import { submitPhraseAction } from "@/app/actions/phrases";
import { BurstInput } from "@/components/burst-input";

const MAX_LEN = 60;

// Friendly little composer that floats at the bottom of the graph view. Lets a
// signed-in guest drop their own words onto the typewriter wall.
export function PhraseSubmit() {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim().replace(/\s+/g, " ");
    if (!text) {
      setMsg({ kind: "err", text: "Type something first 🙂" });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await submitPhraseAction(text);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error ?? "Couldn't add that. Try again." });
        return;
      }
      setValue("");
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
          onChange={(e) => setValue(e.target.value)}
          maxLength={MAX_LEN}
          autoComplete="off"
          placeholder="Say something proud…"
          aria-describedby="phrase-submit-help"
        />
        <button type="submit" className="field-button phrase-submit-btn" disabled={pending}>
          {pending ? "Sending…" : "Drop it!"}
        </button>
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
