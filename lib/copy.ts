
export const nav = {
  home: "Početna",
  map: "Karta",
  city: "Split",
}

export const home = {
  dateLabel: (city: string) => `DANAS · ${city.toUpperCase()}`,
  passengerSuffix: "putnika",
  shipsInPort: (count: number, start: string, end: string) =>
    `${count} ${count === 1 ? "kruzer" : "kruzera"} u luci · ${start}–${end}`,
};

export const personas = {
  business: {
    title: "Radim u Splitu",
    subtitle: "Kad mogu očekivati više gostiju?",
    href: "/business",
  },
  local: {
    title: "Živim u Splitu",
    subtitle: "Kad grad neće biti pretrpan?",
    href: "/local",
  },
}

export const calendar = {
  title: "Dodaj prognozu u kalendar.",
  body: "",
  cta: "Pretplati se na kalendar",
}

export const forecast = {
  heading: "Sljedećih 7 dana",
  totalLabel: (total: number) => `uk. ${total.toLocaleString("hr-HR")} pax`,
  days: ["PON", "UTO", "SRI", "ČET", "PET", "SUB", "NED"] as const,
}

export function crowdLevel(load: number): string {
  if (load < 500) return "Uglavnom prazno"
  if (load < 2000) return "Malo gužve"
  if (load < 3500) return "Uglavnom gužva"
  if (load < 5000) return "Jaka gužva"
  return "Najveća gužva"
}

export const map = {
  title: "Karta gužve",
  loading: "Učitavam podatke…",
  errorPrefix: "Greška:",
  ashoreSuffix: "na obali",
  noShips: "Nema kruzera u luci",
  shipsInPort: (count: number) =>
    `${count} ${count === 1 ? "kruzer" : "kruzera"} u luci`,
  loadLabel: "putnika",
  shareLabel: "udio",
  nowButton: "Sada",
  legendTitle: "Razina gužve",
  legendHint: "Klizač kroz dan · ▼ dolazak · ▲ odlazak",
  legendHintMobile: "2 dana · ▼ dolazak · ▲ odlazak · tap = detalji",
  accessWalking: "Pješice",
  accessVehicular: "Bus / Uber / taxi",
  arrivalLabel: "Dolazak",
  departureLabel: "Odlazak",
  passengersLabel: "putnika",
  contributingShipsLabel: "Kruzeri",
  densityPerHa: "pax/ha",
  eventInferredHint: "Procijenjeno",
  eventInferredExplainer:
    "Nema točnog vremena u rasporedu — koristimo 08:00 / 17:00 kao u modelu.",
  closeDetail: "Zatvori",
  dockBadge: "Polazna točka",
  dockTitle: "Pristanište kruzera",
  dockSubtitle: "Sve gužve počinju ovdje.",
};
