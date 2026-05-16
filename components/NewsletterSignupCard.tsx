"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowRight, Mail, X } from "lucide-react";
import { newsletter } from "@/lib/copy";

export default function NewsletterSignupCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mx-5 mt-6 rounded-3xl bg-white border border-rule overflow-hidden shadow-sm">
        <div className="p-5 flex gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center bg-cream border border-rule">
            <Image
              src="/kruzer_samo_logo.svg"
              alt=""
              width={40}
              height={25}
              className="w-10 h-auto object-contain"
              aria-hidden
            />
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="font-display font-semibold text-[18px] text-ink leading-snug">
              {newsletter.cardTitle}
            </h3>
            <p className="font-sans text-[12px] leading-relaxed text-ink-dim">
              {newsletter.cardBody}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between px-5 py-3.5 min-h-[48px] text-left border-t border-rule transition-opacity duration-150 hover:opacity-95"
        >
          <div className="flex items-center gap-2">
            <Mail size={15} color="#D88A0E" strokeWidth={1.75} aria-hidden />
            <span className="font-sans text-[13px] font-semibold text-ink">
              {newsletter.cardCta}
            </span>
          </div>
          <ArrowRight size={14} color="#D88A0E" strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      {open ? (
        <NewsletterSheet onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function NewsletterSheet({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "success_duplicate" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        duplicate?: boolean;
        code?: string;
      };

      if (!res.ok || !data.ok) {
        setStatus("error");
        if (data.code === "invalid_email") {
          setErrorMsg(newsletter.errorInvalidEmail);
        } else if (data.code === "resend_key_restricted") {
          setErrorMsg(newsletter.errorResendKeyRestricted);
        } else {
          setErrorMsg(newsletter.errorGeneric);
        }
        return;
      }

      setStatus(data.duplicate ? "success_duplicate" : "success");
    } catch {
      setStatus("error");
      setErrorMsg(newsletter.errorGeneric);
    }
  }

  const sheet = (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center sm:items-center sm:p-5">
      <button
        type="button"
        aria-label={newsletter.closeSheet}
        className="absolute inset-0 bg-ink/40 transition-opacity duration-200"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-paper border border-rule shadow-sm outline-none transition-transform duration-200 ease-out max-h-[min(92vh,560px)] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-rule">
          <div className="space-y-1 min-w-0">
            <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-ink-dim">
              {newsletter.sheetKicker}
            </p>
            <h2
              id={titleId}
              className="font-display font-semibold text-[18px] text-ink leading-snug"
            >
              {newsletter.sheetTitle}
            </h2>
            <p className="font-sans text-[13px] text-ink-dim leading-relaxed">
              {newsletter.sheetBody}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border border-rule bg-cream text-ink transition-colors duration-150 hover:bg-paper"
            aria-label={newsletter.closeSheet}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto pb-10 space-y-4">
          {status === "success" || status === "success_duplicate" ? (
            <div className="rounded-2xl bg-cream border border-rule px-4 py-3 space-y-2">
              <p className="font-sans text-[15px] font-semibold text-ink">
                {status === "success_duplicate"
                  ? newsletter.successDuplicateTitle
                  : newsletter.successTitle}
              </p>
              <p className="font-sans text-[13px] text-ink-dim leading-relaxed">
                {status === "success_duplicate"
                  ? newsletter.successDuplicateBody
                  : newsletter.successBody}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 min-h-[44px] px-4 rounded-xl bg-ink text-cream font-sans text-[13px] font-semibold w-full transition-opacity duration-150 hover:opacity-95"
              >
                {newsletter.done}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="newsletter-email"
                  className="font-sans text-[13px] font-medium text-ink"
                >
                  {newsletter.emailLabel}
                </label>
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  placeholder={newsletter.emailPlaceholder}
                  className="w-full min-h-[48px] rounded-xl border border-rule bg-cream px-4 font-sans text-[15px] text-ink placeholder:text-ink-dim/70 outline-none focus:border-teal transition-colors duration-150 disabled:opacity-60"
                />
              </div>

              {status === "error" && errorMsg ? (
                <p className="font-sans text-[13px] text-coral" role="alert">
                  {errorMsg}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full min-h-[48px] rounded-xl bg-ink text-cream font-sans text-[14px] font-semibold transition-opacity duration-150 hover:opacity-95 disabled:opacity-60"
              >
                {status === "loading" ? newsletter.submitLoading : newsletter.submit}
              </button>

              <p className="font-sans text-[11px] text-ink-dim leading-relaxed">
                {newsletter.legalNote}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) return sheet;

  return createPortal(sheet, document.body);
}
