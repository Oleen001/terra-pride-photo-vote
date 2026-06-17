"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { logoutAction } from "@/app/login/actions";
import { LogoutIcon } from "@/components/icons";

export function LogoutButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const modal =
    open && typeof document !== "undefined"
        ? createPortal(
          <div
          className="inset-0 grid place-items-center bg-background/70 px-5 py-8 backdrop-blur-md"
          role="presentation"
          style={{ position: "fixed", zIndex: 70 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            aria-describedby="logout-confirm-description"
            className="login-card w-full max-w-[22rem] overflow-hidden rounded-[8px] border border-line bg-surface p-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-6"
          >
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-foreground/6 text-foreground">
              <LogoutIcon className="h-5 w-5" />
            </div>
            <h2 id="logout-confirm-title" className="text-lg font-semibold text-foreground">
              Log out?
            </h2>
            <p
              id="logout-confirm-description"
              className="mt-2 break-words text-sm leading-6 text-muted"
            >
              You are signed in as <span className="font-medium text-foreground">{email}</span>.
            </p>

            <form action={logoutAction} className="mt-5 grid gap-2">
              <LogoutConfirmButton />
              <button
                ref={cancelButtonRef}
                type="button"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[8px] px-4 text-sm font-semibold text-muted transition-colors duration-200 hover:bg-foreground/6 hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Stay signed in
              </button>
            </form>
          </div>
        </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        aria-label="Log out"
        title="Log out"
        className="ml-1 inline-grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[8px] text-muted transition-colors duration-200 hover:bg-foreground/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/28"
        onClick={() => setOpen(true)}
      >
        <LogoutIcon className="h-4 w-4" />
      </button>
      {modal}
    </>
  );
}

function LogoutConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[8px] bg-foreground px-4 text-sm font-semibold text-background shadow-sm transition duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-default disabled:opacity-55"
    >
      {pending ? "Logging out..." : "Log out"}
    </button>
  );
}
