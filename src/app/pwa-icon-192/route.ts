import { createPwaIcon } from "@/lib/pwaIcon";

export const dynamic = "force-dynamic";

export function GET() {
  return createPwaIcon(192);
}
