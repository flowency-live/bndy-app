"use client";

// Profile setup form shown to new social/email users after sign-in.
// Also used for editing profile from UserButton dropdown.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { updateProfile } from "@/lib/auth/authApi";
import { PlaceInput } from "@/features/shared/PlaceInput";

const field =
  "w-full rounded-xl border border-line bg-white/5 px-4 py-3 text-[15px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-[var(--acc)]";
const primaryBtn =
  "w-full rounded-xl bg-[var(--acc)] px-4 py-3 text-[15px] font-extrabold text-black transition-opacity hover:opacity-90 disabled:opacity-50";

interface ProfileSetupProps {
  onComplete: () => void;
  mode?: "setup" | "edit";
  initialData?: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    hometown?: string | null;
  };
}

export function ProfileSetup({ onComplete, mode = "setup", initialData }: ProfileSetupProps) {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(initialData?.displayName || "");
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [hometown, setHometown] = useState(initialData?.hometown || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        hometown: hometown.trim() || undefined,
      });
      await refresh();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const isValid = displayName.trim() && firstName.trim() && lastName.trim();

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-line glass p-6">
      <h2 className="mb-1 text-xl font-black tracking-tight text-txt">
        {mode === "setup" ? "Complete Your Profile" : "Edit Profile"}
      </h2>
      <p className="mb-5 text-[13px] font-semibold text-dim">
        {mode === "setup"
          ? "Just a few details to get started."
          : "Update your profile information."}
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          className={field}
          autoComplete="given-name"
        />
        <input
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          className={field}
          autoComplete="family-name"
        />
        <input
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name (shown publicly)"
          className={field}
        />
        <PlaceInput
          value={hometown}
          onChange={setHometown}
          placeholder="Hometown (optional)"
          className={field}
          autoComplete="address-level2"
        />
        <button type="submit" disabled={busy || !isValid} className={primaryBtn}>
          {busy ? (
            <Loader2 size={18} className="mx-auto animate-spin" />
          ) : mode === "setup" ? (
            "Complete Profile"
          ) : (
            "Save Changes"
          )}
        </button>
      </form>
    </div>
  );
}
