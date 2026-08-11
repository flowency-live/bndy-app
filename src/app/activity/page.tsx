import { Suspense } from "react";
import type { Metadata } from "next";
import { ActivityClient } from "./ActivityClient";

export const metadata: Metadata = {
  title: "My activity · bndy",
  description: "Your edits and contributions on bndy.",
};

export default function ActivityPage() {
  return (
    <Suspense>
      <ActivityClient />
    </Suspense>
  );
}
