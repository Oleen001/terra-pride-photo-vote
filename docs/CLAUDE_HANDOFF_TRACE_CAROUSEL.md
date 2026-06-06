# Claude Handoff: Trace Card Carousel Polish

Date: 2026-06-06
Branch: `codex/frontend-polish-terra-pride`
Project: Terra Pride Photo Vote

## User Goal

User wants the gallery to become a Trace Cards style 3D carousel:

- Cards should look like the reference screenshot: dark rounded card, "COORDINATES", "LIVE", trace geometry in center.
- The card title should be uploader name from email, trimmed before `@...com` and with separators converted to spaces.
- The small subtitle should be the upload caption.
- Cards should auto-rotate slowly in a circular carousel.
- Users should be able to swipe/drag by hand to move to the next/previous photo.
- Cards should tilt/rotate interactively.
- Like interaction should be press-and-hold for about 2 seconds, then release to trigger a pride splash and submit the vote.
- Liked cards should keep a pride glow/aura effect.
- This should work on both desktop and mobile, using Three.js/R3F.

## Current Implementation State

Implemented in progress:

- `components/gallery.tsx`
  - Rewritten from masonry gallery into `photo-carousel`.
  - Uses auto-advance interval every `5600ms`.
  - Uses pointer drag/swipe to advance carousel.
  - Uses `TraceCardThree` inside each card.
  - Uses `HoldVoteControl` for 2-second hold-to-like.
  - Keeps `PhotoLightbox` and optimistic voting logic.
  - Keeps delete handling from lightbox.

- `app/globals.css`
  - Added carousel stage/card styling.
  - Added dark card look, coordinate/live labels, title/caption layout.
  - Added pride hold progress, splash animation, and liked aura.

- `components/trace-card-three.tsx`
  - Existing Three/R3F overlay for pyramid/diamond line geometry.

Dependencies already installed:

- `three`
- `@react-three/fiber`
- `@types/three`

`@react-three/drei` was installed then removed because it was not used.

## Verification Already Done

After the carousel rewrite and latest mobile sizing tweak:

- `npm run lint` passed
- `npx tsc --noEmit` passed
- `npm run build` passed

Known recurring warnings:

- Next warns about multiple lockfiles and inferred workspace root.
- `npm audit` reports 2 moderate vulnerabilities from `next` internal `postcss`; npm suggests `audit fix --force`, but that would downgrade Next to 9 and should not be used.

## Important Current Issue

The carousel is close but still needs visual QA and final sizing.

Earlier screenshots showed:

- Desktop card was initially pushed down/right because Framer Motion `y` transform overrode CSS 3D transform.
- Fixed by removing `y` from `motion.article` animation.
- Mobile screenshot after that worked but card was too large and clipped right edge.
- Latest tweak reduced mobile width and depth:
  - `components/gallery.tsx`: `z = 80 - distance * 120`
  - `app/globals.css`: mobile card width changed to `min(82vw, 360px)`

Need to restart production server and recapture screenshots after latest tweak.

## Recommended Next Steps

1. Start production server:

```bash
npm run start -- -p 3001
```

2. Capture desktop and mobile screenshots from `http://localhost:3001`.

Suggested paths:

```bash
/tmp/terra-carousel-final-desktop.png
/tmp/terra-carousel-final-mobile.png
```

3. Verify:

- Desktop card is centered and not pushed below fold.
- Mobile card is fully visible horizontally.
- Text does not overflow:
  - uploader name as title
  - caption as subtitle
- Swipe/drag advances carousel.
- Auto-rotate continues slowly.
- Hold-to-like:
  - progress fills for 2 seconds
  - release after full progress submits like
  - pride splash appears
  - liked card keeps pride aura
- Clicking/tapping active card still opens lightbox.
- Non-active visible cards can be tapped to become active.

4. If mobile still clips:

- Reduce `.carousel-card` mobile width to `min(76vw, 340px)`.
- Reduce `x` offset in `gallery.tsx` from `360` to `280`.
- Reduce active card depth from `80` to `40`.

5. If desktop card sits too low:

- Reduce `.photo-carousel-stage` `min-height`.
- Add `transform: translateY(-40px)` to `.photo-carousel-stage` or adjust `.carousel-card top` to `44%`.

6. After final QA:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

7. Update Obsidian notes:

- `/Users/kuptipong.s/Documents/Park/Claude/Projects/Terra-Pride-Photo-Vote.md`
- `/Users/kuptipong.s/Documents/Park/Claude/Daily/2026-06-06.md`

## Files To Inspect

- `components/gallery.tsx`
- `app/globals.css`
- `components/trace-card-three.tsx`
- `package.json`
- `package-lock.json`

## Current Git Context

Branch should be:

```bash
codex/frontend-polish-terra-pride
```

There are many modified files from the broader frontend polish pass, not only the carousel:

- `app/globals.css`
- `app/layout.tsx`
- `app/login/login-form.tsx`
- `app/login/page.tsx`
- `app/page.tsx`
- `app/results/page.tsx`
- `app/upload/page.tsx`
- `app/upload/upload-form.tsx`
- `components/gallery.tsx`
- `components/photo-lightbox.tsx`
- `components/results-list.tsx`
- `components/site-header.tsx`
- `components/vote-button.tsx`
- `components/trace-card-three.tsx`
- `docs/DEVELOPMENT_PLAN.md`
- `docs/REQUIREMENTS.md`
- `package.json`
- `package-lock.json`
- `render.yaml`

Do not revert unrelated frontend polish changes unless the user explicitly asks.
