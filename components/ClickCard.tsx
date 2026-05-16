import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"

interface ClickCardProps {
  title: string
  subtitle: string
  href: string
  icon: LucideIcon
  accentColor: string
  accentBg: string
}

export default function ClickCard({
  title,
  subtitle,
  href,
  icon: Icon,
  accentColor,
  accentBg,
}: ClickCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-raised border border-border active:scale-[0.98] transition-transform duration-150"
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: accentBg }}
        >
          <Icon size={20} style={{ color: accentColor }} strokeWidth={1.75} />
        </div>
        <ArrowRight size={16} style={{ color: accentColor }} strokeWidth={2} />
      </div>

      <div className="space-y-1">
        <h2 className="font-display font-bold text-[32px] text-ink leading-snug">
          {title}
        </h2>
        <p
          className="font-sans text-[15px] leading-snug font-bold"
          style={{ color: accentColor }}
        >
          {subtitle}
        </p>
      </div>
    </Link>
  )
}
