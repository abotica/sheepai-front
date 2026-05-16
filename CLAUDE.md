# Brod Alarm — Frontend Style Guide

The frontend IS the product. Design quality determines whether we win this hackathon. Follow this guide strictly.

---

## Aesthetic

Linear meets Apple Weather meets premium fintech. Clean white surfaces, generous whitespace, confident typography, numbers as visual heroes. Professional tool — not a playful consumer app.

Looks like a screenshot from a Stripe product page. Looks like it costs €40/month even though it's free.

---

## Colors

Use these exact Tailwind extensions. Never invent new colors mid-build.

```ts
colors: {
  brand: '#0F4C75',
  ink: {
    DEFAULT: '#09090B',
    secondary: '#71717A',
    tertiary: '#A1A1AA',
  },
  surface: {
    DEFAULT: '#FFFFFF',
    raised: '#FAFAFA',
    sunk: '#F4F4F5',
  },
  border: '#E4E4E7',
  intensity: {
    calm: '#16A34A',
    'calm-bg': '#F0FDF4',
    building: '#CA8A04',
    'building-bg': '#FEFCE8',
    heavy: '#EA580C',
    'heavy-bg': '#FFF7ED',
    tsunami: '#DC2626',
    'tsunami-bg': '#FEF2F2',
  },
}
```

- Background: pure white `#FFFFFF`
- Text primary: `#09090B` (never pure black)
- Borders: `#E4E4E7` (very subtle, used sparingly)

---

## Typography

Two fonts only, via `next/font/google`:

- **Fraunces** → `font-display` → hero numbers, section headers
- **Inter** → `font-sans` → everything else

Size scale (mobile):
- Hero number: 56px / Inter 700
- Big stat: 32px / Inter 700
- Section header: 18px / Fraunces 600
- Body: 15px / Inter 400
- Caption: 13px / Inter 500
- Micro: 11px / Inter 500 uppercase tracked

**Every number** (passenger count, time, percentage) gets `tabular-nums` class.

**Croatian thousands separator:** `3.916` not `3,916`. Use `lib/format.ts`.

---

## Spacing

Mobile-first. Strict rhythm:

- Side padding: `px-5` (20px)
- Between major sections: `space-y-8` (32px)
- Between related elements: `space-y-3` (12px)
- Minimum gap on mobile: `gap-2`

Whitespace is the design. Let data breathe.

---

## Numbers are heroes

Every passenger count, time, percentage must be:
- Bigger than surrounding text
- Tabular figures (aligned columns)
- Inter 600 or 700
- Slightly tighter letter-spacing on large sizes

---

## Mobile-first rules

- Design target: iPhone 14 width (390px)
- Every primary action thumb-reachable (bottom 60% of screen)
- Tap targets minimum 44×44px
- No hover-only interactions
- Sticky bottom CTA never overlaps content (`pb-20` on scroll containers)

---

## Anti-patterns (will be reverted)

- No gradients
- No shadows heavier than `shadow-sm`
- No glassmorphism, blur effects, backdrop filters
- No neumorphism
- No emoji-spam — emoji are accents, not bullets
- No pure black text — use `text-ink`
- No `bg-gray-*` — use `surface` scale
- No `rounded-full` on cards — only pills and avatars
- No animations longer than 200ms
- No floating action buttons
- No dark mode this iteration
- No "fun" illustrations
- No icon-spam common in civic apps

---

## Croatian first

UI strings live in `lib/copy.ts`. Croatian is source of truth. Do not hardcode strings in components.

Examples of voice:
- "Dolaze 2 kruzera s 3.916 putnika"
- "Izbjegavaj Pjacu 10:00–13:30"
- NOT: "We've detected an upcoming maritime arrival event"

Direct, useful, slightly dry.

---

## Persona styling

Persona is URL state (`/business` vs `/local`), not React context. When persona changes:
- Only *advice copy* and recommendation accents shift
- Structure stays identical
- Smooth 200ms transition

---

## When in doubt

- Make it simpler
- Make the numbers bigger
- Use more whitespace
- Cut the feature

The hackathon is won by the team that shipped less but better.
