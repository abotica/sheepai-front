import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"

interface ClickCardProps {
  title: string
  subtitle: string
  href: string
  icon: LucideIcon
  accentColor: string
}

export default function ClickCard({
  title,
  subtitle,
  href,
  icon: Icon,
  accentColor,
}: ClickCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 p-5 rounded-3xl border border-rule bg-paper
                 transition-transform duration-150 active:scale-[0.98] hover:-translate-y-0.5"
      style={{ boxShadow: "0 8px 24px -16px rgba(10,31,46,0.15)" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: accentColor + "2E" }}
        >
          <Icon size={18} color={accentColor} strokeWidth={1.75} />
        </div>
        <ArrowRight size={15} color={accentColor} strokeWidth={2} />
      </div>

      <div className="space-y-1.5">
        <h2
          className="font-display font-semibold text-[22px] text-ink leading-[1.1]"
          style={{ letterSpacing: "-0.5px" }}
        >
          {title}
        </h2>
        <p
          className="font-sans text-[12.5px] font-medium leading-snug"
          style={{ color: accentColor }}
        >
          {subtitle}
        </p>
      </div>

      <div
        className="h-0.5 w-8 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
    </Link>
  )
}
