import Link from "next/link";
import { Ship } from "lucide-react";
import { nav } from "@/lib/copy";

export default function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 border-b border-rule backdrop-blur-md"
      style={{ backgroundColor: "rgba(244,239,230,0.85)" }}
    >
      <div className="px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-ink flex items-center justify-center shrink-0">
            <Ship size={15} color="#D88A0E" strokeWidth={1.75} />
          </div>
          <span
            className="font-display font-semibold text-[17px] text-ink"
            style={{ letterSpacing: "-0.3px" }}
          >
            {nav.brand}
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-sans text-[13px] font-semibold text-ink min-h-[44px] flex items-center"
          >
            {nav.home}
          </Link>
          <Link
            href="/login"
            className="font-sans text-[13px] text-ink-dim min-h-[44px] flex items-center"
          >
            {nav.login}
          </Link>
        </div>
      </div>
    </nav>
  );
}
