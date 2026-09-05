---
name: brand-copy
description: Write or change any user-facing text in Shei Hoise — UI strings, landing page copy, emails, notifications, marketing claims. Use whenever a task adds a label, button, message or headline, or whenever a metric about the platform is quoted. Covers the bilingual requirement, where strings live, and which numbers are actually verified.
---

# User-facing copy

## Every string is bilingual

`src/lib/i18n/translations.ts` holds two parallel objects, English and Bangla,
under the same key structure. `useTranslation()` returns one of them; `en` is
the type source, so **a key added to `en` and not to `bn` is a TypeScript error
in one direction and a silently English UI in the other**. Add both, always, in
the same edit.

```tsx
const t = useTranslation();
<span>{t.checkout.freeDeliveryApplied}</span>
```

Never hardcode a user-facing string in a component. Keys are grouped by surface
(`checkout`, `admin`, `landing`, `onboarding`, `product`, `cart`) — put new keys
in the group that owns the screen.

**Numbers need `useLocalNum()`** (`n(value)`), which renders Bengali numerals in
Bangla. A raw `{count}` will show Latin digits inside otherwise-Bangla text.
Currency comes from `useUserCurrencyIcon()`, not a hardcoded `৳`.

For animated figures, the authored string stays the source of truth — the
counter animates only its numeric part so `+`, `k` and Bengali numerals survive.

## Verified metrics

Measured on the live database **17 August 2026**:

| Figure | Verified value |
|---|---|
| Stores | 13 |
| Products | 250 |
| Orders | 1,711 |
| Auth users | 118 |

The landing page currently claims **`10k+` orders** (`landing.stat2Value`),
roughly 6× the measured figure. **Do not repeat that number in new copy, ads,
decks or outreach** until someone reconciles it — an inflated claim on a page
you are buying traffic to is a trust problem you cannot buy back. Quote a
measured figure or none.

When quoting scale, say when it was measured. If a task needs a current number,
count it rather than reusing one from a doc.

## Voice

The reader is an independent shop owner in Bangladesh selling through a Facebook
page, not a technical buyer. Write for the person, not the system.

- **Name things as they are recognised.** "Delivery charge", not "shipping fee
  config". A merchant manages *orders*, not *order entities*.
- **Say the consequence, not the feature.** "Any order with this product ships
  free" beats "enables free_delivery flag".
- **Controls say what happens.** Button "Publish" → toast "Published".
- **Errors explain the fix.** What went wrong, and what to do about it. No
  apologies, no vagueness.
- **Modest beats grand.** At this scale "small enough to answer your messages"
  is a stronger claim than pretending to be big — and it is true.
- No exclamation marks in error or empty states. No "Oops".

## Marketing positioning

Established in the go-to-market work, and worth holding to: the product's
strongest differentiator is **COD ad-spend protection** — risk scoring holds the
Meta Purchase event until delivery, so the pixel optimises against orders that
actually arrive. Second is **profit visibility** (TP price + expenses + COD
reconciliation produce a real net figure). The storefront gets attention; the
operations keep merchants paying. Lead with the money they are losing, not with
the feature list, and never with price.