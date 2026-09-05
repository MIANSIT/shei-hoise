---
name: motion
description: Add, change or debug any animation in Shei Hoise — framer-motion, GSAP, scroll effects, transitions, loading states. Use whenever a task involves motion, an element animating in or out, a page feeling static, or an animation misbehaving. Two runtimes are in play with strict rules about which goes where; getting it wrong fails at runtime, not at build.
---

# Motion conventions

Two runtimes, deliberately separated:

- **framer-motion** — the app. Storefront, dashboard, everything used repeatedly.
- **GSAP** — the marketing surfaces only: `/` and `/onboarding`.

## framer-motion: use `m`, never `motion`

The app is wrapped in `LazyMotion features={domAnimation} strict`
(`src/app/components/motion/MotionProvider.tsx`), which ships ~5kb of features
instead of the full ~34kb bundle.

```tsx
import { m, AnimatePresence } from "framer-motion";
<m.div animate={{ opacity: 1 }} />
```

`strict` means an imported `motion.*` **throws at runtime** — it will not fail
the build, so it surfaces in a browser rather than in CI. For a wrapped
component use `m.create(Button)`, not `motion(Button)`.

`domAnimation` excludes layout animations and drag. Nothing uses either today
(image reorder uses dnd-kit). Needing `layout`/`layoutId` means switching the
provider to `domMax`, which costs ~10kb — a deliberate decision, not a drive-by.

## Reduced motion is not optional

`MotionConfig reducedMotion="user"` covers framer-motion globally. A block in
`globals.css` covers CSS keyframes and AntD transitions. **Spinners are exempt
on purpose** — `animate-spin` is the only signal a request is in flight, and
freezing it reads as a hung page.

GSAP writes inline styles, so neither of those reaches it. Every GSAP setup
must branch on the `reduced` flag from `useGsapScope` and *set end states*
rather than tween.

## GSAP: route-scoped, via `useGsapScope`

`src/lib/gsap/useGsapScope.ts` handles `gsap.matchMedia` (including the
reduced-motion branch), `useLayoutEffect` so entrance targets never paint at
full opacity first, ScrollTrigger cleanup on unmount, and propagating any
cleanup the setup returns.

```tsx
const scope = useGsapScope(({ q, root, reduced, gsap }) => {
  if (reduced) { gsap.set(q("[data-reveal]"), { opacity: 1, y: 0 }); return; }
  gsap.from(q("[data-reveal]"), { opacity: 0, y: 24, stagger: 0.08 });
}, [deps]);
return <section ref={scope as React.RefObject<HTMLElement>}>…</section>;
```

**GSAP must never reach the storefront or dashboard bundle.** It is ~43kb
gzipped and currently loads on `/` and `/onboarding` only. Verify after any
change to those routes:

```bash
C=$(grep -rl "ScrollTrigger" .next/static/chunks/*.js | head -1)
grep -rl "$(basename $C .js)" .next/server/app --include='*.html'
# expect: index.html and onboarding.html, nothing else
```

## Never let a library rewrite text React owns

GSAP's `SplitText` replaces an element's children in the DOM, which takes that
subtree out of React's hands. Applied to the hero headline it broke
translation — switching to Bangla left the English words on screen, because
React was updating text nodes SplitText had already replaced.

Split words in JSX and let GSAP animate only their transforms. The same rule
covers anything writing `textContent` on a scroll frame (the stats counters):
re-run the setup on `lang` so parsed values cannot go stale.

Separators between animated word spans must be real text nodes, not `&nbsp;` —
a non-breaking space stops headlines wrapping on a phone.

## Existing pieces to reuse

| Need | Use |
|---|---|
| Skeleton → content | `components/motion/LoadingSwap.tsx` |
| Mobile-only animation | `lib/hook/useIsMobile.ts` — Tailwind cannot override inline styles per breakpoint |
| Count a number up | `countUpTo` in `lib/gsap/useGsapScope.ts` — animates only the numeric part, keeps `+`/`k` suffixes and Bengali numerals |

## Judgement

Motion in the app should be invisible: confirm a tap, soften a swap, get out of
the way. Motion on `/` and `/onboarding` is the argument — those two screens are
read once by someone deciding whether to trust us.

Animate `opacity` and `transform` only. Never height, top or margin — that is
layout shift. Text ships in the DOM at full size; only its paint is deferred.