import type { Metadata } from "next";
import { PersonaPageClient } from "@/components/persona/PersonaPageClient";

export const metadata: Metadata = {
  title: "Želim gužvu · Brod Alarm",
  description: "Pronađi vrh gužve — kad dolaze gosti, gdje i koliko ih ima.",
};

export default function ZelimGuzvuPage() {
  return <PersonaPageClient variant="crowds" />;
}
