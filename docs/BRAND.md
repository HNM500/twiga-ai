# Twiga brand foundation

This document records the approved initial identity for Twiga. It is the reference for product UI, generated media, and future design work.

## Approved identity

- Primary name: **Twiga**
- Wordmark: lowercase `twiga`
- Logo: a rounded geometric lowercase `t` containing a giraffe in negative space
- Character: calm, capable, warm, and useful
- Audience: primarily Tanzanian individuals
- Product relationship: Twiga is presented as an independent product. Do not mention or display Cassava AI in the current product experience.

The symbol should read as a bold `t` at small sizes. The giraffe is a second-look detail and must remain cut out of the symbol rather than being drawn as a separate illustration.

## Core colors

| Role        | Value     | Use                                        |
| ----------- | --------- | ------------------------------------------ |
| Twiga Ink   | `#0D2A3A` | Logo, primary type, high-emphasis controls |
| Warm Canvas | `#FAF7F0` | Light-theme icon and brand backgrounds     |

Sunlit amber and restrained teal may be developed as supporting interface colors, but they are not part of the logo itself at this stage.

## Typography and language

- Use Geist for conversations and general product UI wherever appropriate.
- Keep the interface clean, minimal, and highly readable.
- English and Swahili must be interchangeable at any time through an always-visible language control.
- The primary call to action is **Ask Twiga**.

## Production assets

- `/public/brand/twiga-mark.svg` — symbol only, transparent background
- `/public/brand/twiga-wordmark.svg` — approved horizontal symbol and outlined wordmark
- `/public/brand/twiga-maskable.svg` — safe-zone source for the installable-app icon
- `/components/logos/twiga-logo.tsx` — reusable React mark and horizontal logo components
- `/app/favicon.svg`, `/app/favicon.ico`, `/app/icon.png`, `/app/apple-icon.png` — browser and device icons
- `/public/icon-maskable.png` — installable-app maskable icon

Use the horizontal logo when space permits and the symbol alone for favicons, compact controls, avatars, and collapsed navigation. Do not stretch, rotate, outline, add effects to, or place other artwork inside the mark.

The approved mark uses the giraffe placement from the corrected July 2026 master: the head sits in the crossbar opening and the neck forms the negative-space stem. Preserve that geometry. The production SVGs use a transparent canvas, a tight `viewBox` and one silhouette path; do not reintroduce the cream background, trace highlights or fixed pixel dimensions from the source export.
