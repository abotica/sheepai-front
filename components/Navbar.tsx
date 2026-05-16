import Link from "next/link";
import { nav } from "@/lib/copy";

function Navbar() {
  return (
    <nav className="w-full bg-surface border-b border-border">
      <div className="px-5 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-sans font-semibold text-[15px] text-brand tracking-tight"
        >
          {nav.brand}
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-sans text-[15px] text-ink-secondary hover:text-ink transition-colors duration-200 min-h-[44px] flex items-center"
          >
            {nav.home}
          </Link>
          <Link
            href="/login"
            className="font-sans text-[15px] text-ink-secondary hover:text-ink transition-colors duration-200 min-h-[44px] flex items-center"
          >
            {nav.login}
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
