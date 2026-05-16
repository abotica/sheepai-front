export const nav = {
  brand: "Brod Alarm",
  home: "Početna",
};

export const home = {
  dateLabel: (city: string) => `DANAS · ${city.toUpperCase()}`,
  passengerSuffix: "putnika",
  shipsInPort: (count: number, start: string, end: string) =>
    `${count} ${count === 1 ? "kruzer" : "kruzera"} u luci · ${start}–${end}`,
};

export const personas = {
  business: {
    title: "Radim u turizmu",
    subtitle: "Kad mogu očekivati više gostiju?",
    href: "/business",
  },
  local: {
    title: "Živim u Splitu",
    subtitle: "Kad grad neće biti pretrpan?",
    href: "/local",
  },
};

/** Newsletter signup (Resend Audiences / Contacts). */
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
};

export function crowdLevel(load: number): string {
  if (load < 500) return "Uglavnom prazno";
  if (load < 2000) return "Malo gužve";
  if (load < 3500) return "Uglavnom gužva";
  if (load < 5000) return "Jako gužve";
  return "Najveća gužva";
}
