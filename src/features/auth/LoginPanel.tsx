"use client";

// Sign-in panel: Google, Apple, email magic link, phone OTP.
// Social and magic-link flows leave the page and come back via returnTo.
// The phone flow stays on the page and refreshes the session on success.

import { useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  appleAuthUrl,
  googleAuthUrl,
  requestMagicLink,
  requestPhoneOtp,
  verifyPhoneAndOnboard,
  verifyPhoneOtp,
} from "@/lib/auth/authApi";

type Method = "social" | "email" | "phone";
type PhoneStage = "enter" | "code" | "onboard";

const field =
  "w-full rounded-xl border border-line bg-white/5 px-4 py-3 text-[15px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-[var(--acc)]";
const primaryBtn =
  "w-full rounded-xl bg-[var(--acc)] px-4 py-3 text-[15px] font-extrabold text-black transition-opacity hover:opacity-90 disabled:opacity-50";
const ghostBtn =
  "w-full rounded-xl border border-line px-4 py-3 text-[15px] font-bold text-txt transition-colors hover:bg-white/5";

export function LoginPanel({ nextPath = "/", title = "Login or Register" }: { nextPath?: string; title?: string }) {
  const { refresh } = useAuth();
  const [method, setMethod] = useState<Method>("social");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // email
  const [email, setEmail] = useState("");
  // phone
  const [phoneStage, setPhoneStage] = useState<PhoneStage>("enter");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hometown, setHometown] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendMagic = () =>
    run(async () => {
      await requestMagicLink(email.trim(), nextPath);
      setNotice(`Link sent to ${email.trim()}. Open the email on this device. The link works for 5 minutes.`);
    });

  const sendOtp = () =>
    run(async () => {
      await requestPhoneOtp(phone.trim());
      setPhoneStage("code");
      setNotice(`Code sent to ${phone.trim()}.`);
    });

  const checkOtp = () =>
    run(async () => {
      const res = await verifyPhoneOtp(phone.trim(), otp.trim());
      if (res.requiresOnboarding) {
        setPhoneStage("onboard");
        setNotice("Nearly there. Tell us who you are.");
        return;
      }
      await refresh();
    });

  const finishOnboard = () =>
    run(async () => {
      await verifyPhoneAndOnboard(phone.trim(), otp.trim(), firstName.trim(), lastName.trim(), hometown.trim());
      await refresh();
    });

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-line glass p-6">
      <h2 className="mb-1 text-xl font-black tracking-tight text-txt">{title}</h2>
      <p className="mb-5 text-[13px] font-semibold text-dim">
        One account for gigs, favourites and more.
      </p>

      <div className="mb-5 flex gap-1 rounded-xl border border-line p-1">
        {(
          [
            ["social", "Social"],
            ["email", "Email"],
            ["phone", "Phone"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMethod(key);
              setError(null);
              setNotice(null);
            }}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-[13px] font-extrabold transition-colors",
              method === key ? "bg-white/10 text-txt" : "text-dim hover:text-txt",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="mb-4 rounded-xl border border-line bg-white/5 px-4 py-3 text-[13px] font-semibold text-txt">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-400">
          {error}
        </p>
      )}

      {method === "social" && (
        <div className="flex flex-col gap-3">
          <a href={googleAuthUrl(nextPath)} className={cn(ghostBtn, "text-center")}>
            Continue with Google
          </a>
          <a href={appleAuthUrl(nextPath)} className={cn(ghostBtn, "text-center")}>
            Continue with Apple
          </a>
        </div>
      )}

      {method === "email" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendMagic();
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={field}
            autoComplete="email"
          />
          <button type="submit" disabled={busy || !email.trim()} className={primaryBtn}>
            {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : (
              <span className="inline-flex items-center justify-center gap-2"><Mail size={16} /> Send sign-in link</span>
            )}
          </button>
        </form>
      )}

      {method === "phone" && phoneStage === "enter" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp();
          }}
        >
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+44 7700 900000"
            className={field}
            autoComplete="tel"
          />
          <button type="submit" disabled={busy || !phone.trim()} className={primaryBtn}>
            {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : (
              <span className="inline-flex items-center justify-center gap-2"><Phone size={16} /> Send code</span>
            )}
          </button>
        </form>
      )}

      {method === "phone" && phoneStage === "code" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            checkOtp();
          }}
        >
          <input
            inputMode="numeric"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit code"
            className={field}
            autoComplete="one-time-code"
          />
          <button type="submit" disabled={busy || !otp.trim()} className={primaryBtn}>
            {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Verify code"}
          </button>
          <button type="button" onClick={() => setPhoneStage("enter")} className="text-[13px] font-bold text-dim hover:text-txt">
            Use a different number
          </button>
        </form>
      )}

      {method === "phone" && phoneStage === "onboard" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            finishOnboard();
          }}
        >
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={field} />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name (optional)" className={field} />
          <input required value={hometown} onChange={(e) => setHometown(e.target.value)} placeholder="Hometown" className={field} />
          <button type="submit" disabled={busy || !firstName.trim() || !hometown.trim()} className={primaryBtn}>
            {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Create account"}
          </button>
        </form>
      )}
    </div>
  );
}
