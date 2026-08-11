"use client";

// Sign-in panel: Google, Apple, email magic link, phone OTP.
// Social and magic-link flows leave the page and come back via returnTo.
// The phone flow stays on the page and refreshes the session on success.

import { useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
  const [method, setMethod] = useState<Method>("phone");
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
            ["phone", "Phone", Phone],
            ["email", "Email", Mail],
            ["social", "Socials", null],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMethod(key as Method);
              setError(null);
              setNotice(null);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-extrabold transition-colors",
              method === key ? "bg-white/10 text-txt" : "text-dim hover:text-txt",
            )}
          >
            {Icon && <Icon size={14} />}
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
          <a
            href={googleAuthUrl(nextPath)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[15px] font-bold text-gray-900 transition-colors hover:bg-gray-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>
          <a
            href={appleAuthUrl(nextPath)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-[15px] font-bold text-white transition-colors hover:bg-gray-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
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
          <PhoneInput
            international
            defaultCountry="GB"
            value={phone}
            onChange={(value) => setPhone(value || "")}
            placeholder="7700 900000"
            className="phone-input-bndy"
          />
          <button type="submit" disabled={busy || !phone} className={primaryBtn}>
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
