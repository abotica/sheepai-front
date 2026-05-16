import { CalendarPlus, QrCode, ArrowRight } from "lucide-react"
import { calendar } from "@/lib/copy"

export default function AddToCalendarButton() {
  return (
    <div className="mx-5 mt-6 rounded-3xl bg-ink overflow-hidden">
      <div className="p-5 flex gap-4">
        <div
          className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            backgroundColor: "rgba(244,239,230,0.08)",
            border: "1px solid rgba(244,239,230,0.15)",
          }}
        >
          <CalendarPlus size={24} color="#D88A0E" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-display font-semibold text-[18px] text-cream leading-snug">
            {calendar.title}
          </h3>
          <p className="font-sans text-[12px] leading-relaxed" style={{ color: "#A8B4BD" }}>
            {calendar.body || "Jedna pretplata. Obavijesti besplatno."}
          </p>
        </div>
      </div>

      <button
        className="w-full flex items-center justify-between px-5 py-3.5"
        style={{ borderTop: "1px solid rgba(244,239,230,0.10)" }}
      >
        <div className="flex items-center gap-2">
          <QrCode size={15} color="#D88A0E" strokeWidth={1.75} />
          <span className="font-sans text-[13px] font-semibold text-cream">
            {calendar.cta}
          </span>
        </div>
        <ArrowRight size={14} color="#D88A0E" strokeWidth={2.5} />
      </button>
    </div>
  )
}
