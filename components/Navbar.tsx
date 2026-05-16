import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { nav } from "@/lib/copy";

export default function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 border-b border-rule backdrop-blur-md"
      style={{ backgroundColor: "rgba(244,239,230,0.85)" }}
    >
      <div className="px-5 h-14 flex items-center justify-between">
        <Link href="/" aria-label="Home" className="flex items-center">
          <Image
            src="/kruzer_logo.svg"
            alt="Kruzer logo"
            width={120}
            height={32}
            priority
          />
        </Link>

        
          <div className="flex items-center gap-1">
            <MapPin size={13} color="#0A1F2E" strokeWidth={2} />
            <span className="font-sans text-[13px] font-medium text-ink">
              {nav.city}
            </span>
          </div>
        
      </div>
    </nav>
  );
}
