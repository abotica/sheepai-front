import type { Metadata } from "next";
import { PersonaPageClient } from "@/components/persona/PersonaPageClient";

export const metadata: Metadata = {
  title: "Bježim od gužve · KadĆeKruzer",
  description:
    "Mirni prozori u danu — kad obavi posao u gradu bez navale putnika.",
};

export default function BjezimOdGuzvePage() {
  return <PersonaPageClient variant="calm" />;
}
