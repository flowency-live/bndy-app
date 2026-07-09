import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl font-black tracking-tight">
        <span className="text-orange brand-glow">4</span>0<span className="text-orange brand-glow">4</span>
      </div>
      <p className="mt-3 text-[15px] font-semibold text-dim">We couldn&apos;t find that page.</p>
      <Link href="/" className="mt-6 rounded-2xl bg-gradient-to-b from-orange to-orange/80 px-5 py-3 text-[14px] font-extrabold text-[#120a04]">
        Back to gigs
      </Link>
    </div>
  );
}
