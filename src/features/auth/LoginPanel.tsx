"use client";

import { useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthProvider";
import { appleAuthUrl, facebookAuthUrl, googleAuthUrl, requestMagicLink, requestPhoneOtp, verifyPhoneAndOnboard, verifyPhoneOtp } from "@/lib/auth/authApi";

type Method = "social" | "email" | "phone";
type PhoneStage = "enter" | "code" | "onboard";
const field = "w-full rounded-xl border border-line bg-white/5 px-4 py-3 text-[15px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-[var(--acc)]";
const primaryBtn = "w-full rounded-xl bg-[var(--acc)] px-4 py-3 text-[15px] font-extrabold text-on-acc transition-opacity hover:opacity-90 disabled:opacity-50";

export function LoginPanel({ nextPath = "/", title = "Login or Register" }: { nextPath?: string; title?: string }) {
  const { refresh } = useAuth();
  const [method, setMethod] = useState<Method>("phone"); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const [email, setEmail] = useState(""); const [phoneStage, setPhoneStage] = useState<PhoneStage>("enter"); const [phone, setPhone] = useState(""); const [otp, setOtp] = useState(""); const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [hometown, setHometown] = useState("");
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(null); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Try again."); } finally { setBusy(false); } };
  const sendMagic = () => run(async () => { await requestMagicLink(email.trim(), nextPath); setNotice(`Link sent to ${email.trim()}. Open the email on this device. The link works for 5 minutes.`); });
  const sendOtp = () => run(async () => { await requestPhoneOtp(phone.trim()); setPhoneStage("code"); setNotice(`Code sent to ${phone.trim()}.`); });
  const checkOtp = () => run(async () => { const res = await verifyPhoneOtp(phone.trim(), otp.trim()); if (res.requiresOnboarding) { setPhoneStage("onboard"); setNotice("Nearly there. Tell us who you are."); return; } await refresh(); });
  const finishOnboard = () => run(async () => { await verifyPhoneAndOnboard(phone.trim(), otp.trim(), firstName.trim(), lastName.trim(), hometown.trim()); await refresh(); });
  return <div className="mx-auto w-full max-w-sm rounded-2xl border border-line glass p-6">
    <h2 className="mb-1 text-xl font-black tracking-tight text-txt">{title}</h2><p className="mb-5 text-[13px] font-semibold text-dim">One account for gigs, favourites and more.</p>
    <div className="mb-5 flex gap-1 rounded-xl border border-line p-1" role="group" aria-label="Sign-in method">{([["phone","Phone",Phone],["email","Email",Mail],["social","Socials",null]] as const).map(([key,label,Icon]) => <button key={key} type="button" aria-pressed={method===key} onClick={()=>{setMethod(key as Method);setError(null);setNotice(null);}} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-extrabold transition-colors",method===key?"bg-white/10 text-txt":"text-dim hover:text-txt")}>{Icon&&<Icon size={14}/>} {label}</button>)}</div>
    {notice&&<p role="status" className="mb-4 rounded-xl border border-line bg-white/5 px-4 py-3 text-[13px] font-semibold text-txt">{notice}</p>}{error&&<p role="alert" className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-700 dark:text-red-300">{error}</p>}
    {method==="social"&&<div className="flex flex-col gap-3">
      <a href={facebookAuthUrl(nextPath)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90"><span aria-hidden="true" className="text-xl font-black leading-none">f</span>Continue with Facebook</a>
      <a href={googleAuthUrl(nextPath)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[15px] font-bold text-gray-900 transition-colors hover:bg-gray-50">Continue with Google</a>
      <a href={appleAuthUrl(nextPath)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-[15px] font-bold text-white transition-colors hover:bg-gray-900">Continue with Apple</a>
    </div>}
    {method==="email"&&<form className="flex flex-col gap-3" onSubmit={e=>{e.preventDefault();sendMagic();}}><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} aria-label="Email address" placeholder="you@example.com" className={field} autoComplete="email"/><button type="submit" disabled={busy||!email.trim()} className={primaryBtn}>{busy?<Loader2 size={18} className="mx-auto animate-spin" aria-label="Sending"/>:<span className="inline-flex items-center justify-center gap-2"><Mail size={16}/> Send sign-in link</span>}</button></form>}
    {method==="phone"&&phoneStage==="enter"&&<form className="flex flex-col gap-3" onSubmit={e=>{e.preventDefault();sendOtp();}}><PhoneInput international defaultCountry="GB" value={phone} onChange={value=>setPhone(value||"")} aria-label="Mobile phone number" placeholder="7700 900000" className="phone-input-bndy"/><button type="submit" disabled={busy||!phone} className={primaryBtn}>{busy?<Loader2 size={18} className="mx-auto animate-spin" aria-label="Sending"/>:<span className="inline-flex items-center justify-center gap-2"><Phone size={16}/> Send code</span>}</button></form>}
    {method==="phone"&&phoneStage==="code"&&<form className="flex flex-col gap-3" onSubmit={e=>{e.preventDefault();checkOtp();}}><input inputMode="numeric" required value={otp} onChange={e=>setOtp(e.target.value)} aria-label="Six digit verification code" placeholder="6-digit code" className={field} autoComplete="one-time-code"/><button type="submit" disabled={busy||!otp.trim()} className={primaryBtn}>{busy?<Loader2 size={18} className="mx-auto animate-spin" aria-label="Verifying"/>:"Verify code"}</button><button type="button" onClick={()=>setPhoneStage("enter")} className="text-[13px] font-bold text-dim hover:text-txt">Use a different number</button></form>}
    {method==="phone"&&phoneStage==="onboard"&&<form className="flex flex-col gap-3" onSubmit={e=>{e.preventDefault();finishOnboard();}}><input required value={firstName} onChange={e=>setFirstName(e.target.value)} aria-label="First name" placeholder="First name" className={field} autoComplete="given-name"/><input value={lastName} onChange={e=>setLastName(e.target.value)} aria-label="Last name, optional" placeholder="Last name (optional)" className={field} autoComplete="family-name"/><input required value={hometown} onChange={e=>setHometown(e.target.value)} aria-label="Hometown" placeholder="Hometown" className={field}/><button type="submit" disabled={busy||!firstName.trim()||!hometown.trim()} className={primaryBtn}>{busy?<Loader2 size={18} className="mx-auto animate-spin" aria-label="Creating account"/>:"Create account"}</button></form>}
  </div>;
}
