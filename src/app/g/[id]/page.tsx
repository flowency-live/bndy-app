// Short link (backlog 3b): /g/<id> → /gigs/<id>. Zero infrastructure.
import { redirect } from "next/navigation";

export default async function ShortGigLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/gigs/${id}`);
}
