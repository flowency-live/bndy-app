import type { Metadata } from "next";
import { ManageEntitiesPage } from "@/features/join/ManageEntitiesPage";

export const metadata: Metadata = {
  title: "Manage my bndy",
  description: "Manage the artists and venues you own or help run on bndy.",
};

export default function ManagePage() {
  return <ManageEntitiesPage />;
}
