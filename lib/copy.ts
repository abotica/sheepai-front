
export const nav = {
  home: "Početna",
  map: "Karta",
  city: "Split",
}

export const home = {
  dateLabel: () => `DANAS`,
  passengerSuffix: "putnika",
  shipsInPort: (count: number, start: string, end: string) =>
    `${count} ${count === 1 ? "kruzer" : "kruzera"} u luci · ${start}–${end}`,
};

export const personas = {
  business: {
    title: "Želim gužvu",
    subtitle: "Trbuhom za kruhom!",
    href: "/zelim-guzvu",
  },
  local: {
    title: "Bježim od gužve",
    subtitle: "Spasi me od furešta!",
    href: "/bjezim-od-guzve",
  },
}

export const calendar = {
  title: "Dodaj prognozu u kalendar.",
  body: "",
  cta: "Pretplati se na kalendar",
};

/** Newsletter signup (Resend Contacts). Used by NewsletterSignupCard. */
export const newsletter = {
  cardTitle: "Jednom dnevno: koji kruzeri dolaze i odlaze.",
  cardBody:
    "Mail obavijest kad je brod u luci — dolazak i odlazak. Bez aplikacije.",
  cardCta: "Prijavi se na newsletter",
  sheetKicker: "Newsletter",
  sheetTitle: "Tvoja email adresa",
  sheetBody:
    "Šaljemo jedan sažetak dnevno kad ima promjena u rasporedu kruzera u luci.",
  emailLabel: "Email",
  emailPlaceholder: "ime@primjer.hr",
  submit: "Prijavi me",
  submitLoading: "Šaljem…",
  successTitle: "Prijava je zabilježena.",
  successBody:
    "Šaljemo ti email kad u luci dolazi ili odlazi kruzer — da znaš kad očekivati gužvu.",
  successDuplicateTitle: "Ta adresa je već prijavljena.",
  successDuplicateBody:
    "Nema novog zapisa — i dalje primaš obavijesti o kruzerima u luci.",
  done: "Zatvori",
  closeSheet: "Zatvori",
  errorInvalidEmail: "Provjeri email adresu.",
  errorResendKeyRestricted:
    "Resend API ključ može samo slati mailove. U Resend Dashboardu napravi novi ključ s punim pristupom (Contacts / Sending), ili ukloni ograničenje „sending only“, pa ga stavi u RESEND_API_KEY.",
  errorGeneric: "Nešto nije uspjelo. Pokušaj za trenutak.",
  legalNote:
    "Prijavom prihvaćaš primanje obavijesti o brodovima. Odjava bit će u svakom mailu.",
};

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

/**
 * Shared persona vocabulary. Each zone gets a short verb-led advice line for
 * both lenses — "want crowds" (sell to them) vs "escape crowds" (avoid them).
 * Keep it punchy: 4–7 words. Croatian first.
 */
export const persona = {
  crowds: {
    eyebrow: "ŽELIM GUŽVU",
    chipsAll: "Sve zone",
    sectionToday: "Najbolji sati danas",
    sectionWeek: "Idućih 7 dana",
    weekRankLabel: "Najprometniji dani",
    emptyToday: "Danas nema većih gužvi.",
    emptyZone: "Zona je mirna cijeli dan.",
  },
  calm: {
    eyebrow: "BJEŽIM OD GUŽVE",
    chipsAll: "Sve zone",
    sectionToday: "Kad je mirno",
    sectionWeek: "Idućih 7 dana",
    weekRankLabel: "Najmirniji dani",
    sectionDanger: "Pazi se",
    emptyToday: "Nema dužeg mirnog prozora — probaj kasnije.",
    emptyZone: "Zona ostaje u gužvi cijeli dan.",
    emptyDanger: "Danas nema crvenih zona.",
  },
} as const;

/**
 * Per-zone advice line shown at the bottom of a single-zone WindowCard.
 * One natural Croatian sentence per (persona, zone). Keep it short enough to
 * fit on one row on iPhone 14 (≈ 38 chars).
 */
export const zoneAdvice = {
  crowds: {
    port: "Iskrcaj je u tijeku — taksi i tuk-tuk imaju pune ruke.",
    old_town: "Stari grad je krcat — vrh dana za restorane i kafiće.",
    west_coast: "Riva je puna gostiju — vrijeme za kavu i suvenir.",
    beaches: "Plaže su pune — bar i ležaljke ne staju.",
    malls: "Kruzeraši bježe od kiše u Mall — udarni sat prodaje.",
  },
  calm: {
    port: "Trajektna luka je mirna — slobodno parkiraj.",
    old_town: "Stari grad bez navale — vrijeme za kavu na Pjaci.",
    west_coast: "Riva diše — idealno za šetnju ili bicikliranje.",
    beaches: "Bačvice su za domaće — kupanje bez gužve.",
    malls: "Mall je slobodan — kupuj bez čekanja u redu.",
  },
} as const;

/**
 * Advice when multiple zones share the exact same window (start, end, level)
 * and we collapse them into a single card. `cityWide` is used when every
 * tracked zone matches; `partial` when only some do.
 */
export const mergedAdvice = {
  crowds: {
    cityWide: "Cijeli grad je u špici — gdje god radiš, ima posla.",
    partial: "Više zona istovremeno krcato — biti će puno posla.",
  },
  calm: {
    cityWide: "Cijeli grad odahnuo — biti će malo posla.",
    partial: "Više zona je mirno istovremeno — nema navale.",
  },
} as const;

/** Eyebrow labels for merged-card variants. */
export const mergedLabels = {
  cityWide: "Cijeli grad",
} as const;

export const dayName = {
  PON: "Ponedjeljak",
  UTO: "Utorak",
  SRI: "Srijeda",
  ČET: "Četvrtak",
  PET: "Petak",
  SUB: "Subota",
  NED: "Nedjelja",
} as const;

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
