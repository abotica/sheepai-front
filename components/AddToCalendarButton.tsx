import { CalendarPlus, ArrowRight } from "lucide-react"
import { calendar } from "@/lib/copy"

export default function AddToCalendarButton() {
  return (
    <div className="mx-5 mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex gap-4">
        <div className="shrink-0 w-16 h-16 rounded-xl bg-surface-sunk flex items-center justify-center">
          <CalendarPlus size={28} className="text-brand" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="font-display font-bold text-[18px] text-ink leading-snug">
            {calendar.title}
          </h3>
          <p className="font-sans text-[13px] text-ink-secondary leading-relaxed">
            {calendar.body}
          </p>
          <button className="mt-1 flex items-center gap-1.5 font-sans text-[13px] font-semibold text-brand self-start active:opacity-70 transition-opacity duration-150">
            {calendar.cta}
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
