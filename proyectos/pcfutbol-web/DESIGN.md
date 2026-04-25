---
version: alpha
name: PC Gaffer Sports-Tech
description: Dark, premium football-manager interface with electric green actions, gold achievement accents, and glassmorphism surfaces.
colors:
  primary: "#0C0F14"
  secondary: "#12151C"
  surface: "#1A1D26"
  text-primary: "#F5F7FA"
  text-secondary: "#8D94A3"
  text-muted: "#5B6270"
  accent: "#00F5A0"
  accent-strong: "#00C882"
  gold: "#FBBF24"
  danger: "#FF4757"
  modern-bg: "#ECFDF5"
  modern-surface: "#FFFFFF"
  modern-text: "#1E293B"
  modern-muted: "#64748B"
  modern-accent: "#0D9488"
typography:
  display:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: -0.03em
  headline:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  title:
    fontFamily: Outfit
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  body-strong:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.5
  label:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.08em
  stat:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1
rounded:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.sm}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.sm}"
    padding: 16px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 24px
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: 8px
  alert-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: 16px
---

# PC Gaffer DESIGN.md

## Overview

PC Gaffer uses a **premium sports-tech** visual identity: dark, cinematic, dense enough for manager data, but polished enough to feel like a modern mobile game. The default experience should feel like a professional football operations room: deep charcoal backgrounds, translucent panels, electric green primary actions, and gold moments for trophies, success, and premium rewards.

There is also a `modern` light theme already present in the app. It should keep the same product personality, but translate it into pastel glassmorphism: soft gradient backgrounds, frosted white cards, teal actions, and slate typography.

## Colors

The default palette is dark and high contrast:

- **Primary (#0C0F14):** app background; creates the stadium-at-night feel.
- **Secondary (#12151C):** secondary panels and shell surfaces.
- **Surface (#1A1D26):** cards, modals, list rows, and elevated containers.
- **Accent (#00F5A0):** main interaction color; use for primary buttons, selected states, positive progress, and focused affordances.
- **Accent Strong (#00C882):** hover/pressed state for accent actions.
- **Gold (#FBBF24):** trophies, achievements, premium cues, and special highlights. Do not use as the default CTA.
- **Danger (#FF4757):** destructive actions, errors, failed checks, and urgent negative states.
- **Text Primary (#F5F7FA):** headlines and core text.
- **Text Secondary (#8D94A3):** captions, secondary values, helper copy.
- **Text Muted (#5B6270):** inactive metadata and disabled text.

For the light `modern` theme, keep white/frosted surfaces, `#1E293B` text, `#64748B` muted copy, and teal `#0D9488` actions.

## Typography

Use **Outfit** for headings, stat numbers, mode titles, and anything that should feel bold and game-like. Use **DM Sans** for readable UI copy, forms, menus, body text, and dense data.

- **Display:** Outfit ExtraBold, compact line height, for hero screens and mode headers.
- **Headline/Title:** Outfit Bold, used for section titles, cards, and important panels.
- **Body:** DM Sans 15px, the default text rhythm already defined in `src/index.css`.
- **Labels:** DM Sans Bold, small uppercase with letter spacing for metadata, tabs, chips, and table labels.
- **Stats:** Outfit ExtraBold, large, tight, and high contrast.

## Layout

Use an 8px-based rhythm with 4px micro-adjustments. Keep UI touch-friendly: primary interactions should have generous hit areas and breathing room, especially on mobile.

- Cards and panels should normally use 16-24px internal padding.
- Related controls should be grouped inside a single container rather than scattered.
- Desktop layouts can be denser, but mobile should stack into clear sections.
- Avoid pure full-width text blocks on desktop; manager data is easier to scan in cards, grids, and columns.

## Elevation & Depth

Depth comes from **glass layers, soft glows, and tonal contrast**, not heavy skeuomorphic shadows.

- Default cards use translucent dark surfaces with subtle borders.
- Important actions can receive a green glow (`rgba(0, 245, 160, 0.15-0.2)`).
- Trophy or premium moments may use gold glows sparingly.
- Backgrounds can use large radial gradients to create atmosphere, but content must remain readable.

## Shapes

The shape language is rounded and premium:

- Small controls: 8-12px radius.
- Cards and modals: 16-24px radius.
- Hero panels and large surfaces: up to 32px radius.
- Pills: 9999px radius for chips, badges, and compact filters.

Avoid sharp rectangular UI unless representing a table/grid where alignment matters more than softness.

## Components

- **Primary buttons:** electric green background, dark text, bold DM Sans, 12-16px radius, subtle glow on focus/hover.
- **Secondary buttons:** dark surface or transparent glass with light text and a quiet border.
- **Cards:** glass surface over charcoal, subtle border, 16-24px radius, 16-24px padding.
- **Stats:** large Outfit numbers, compact labels, accent color only for meaningful deltas or current focus.
- **Lists and tables:** keep row separation subtle; prioritize legibility over decorative lines.
- **Modals:** darker or frosted card, clear title hierarchy, one obvious primary action.
- **Chips/badges:** pill radius; selected states use accent green or teal in modern theme.
- **Warnings/errors:** danger red only when action or state is genuinely negative.

## Do's and Don'ts

Do:

- Reuse the CSS custom properties in `src/index.css` whenever possible.
- Keep the football-manager feel: tactical, energetic, premium, slightly futuristic.
- Use green for progression and interaction, gold for glory, red for danger.
- Maintain strong contrast on dark backgrounds.
- Preserve the `modern` theme as a lighter glassmorphism variant rather than a separate brand.

Don't:

- Introduce unrelated accent colors for primary actions.
- Use gold as the default button color.
- Flatten every surface into plain black; the app depends on layered charcoal depth.
- Overuse glow effects on dense screens.
- Mix in random fonts; stay with Outfit and DM Sans unless the whole system is intentionally revised.
