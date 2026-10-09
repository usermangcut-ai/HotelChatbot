> **Ghi chú (2026-10-07):** đây là bản định hướng ban đầu do ChatGPT soạn. Bản gốc về giao diện hiện là
> các mockup trong `mockups/`; khác biệt (font Be Vietnam Pro, tiếng Việt, logic theo backend thật…) xem
> spec frontend của dự án. Khi hai nơi mâu thuẫn, mockup thắng.

# HotelChatbot — Design Reference Specification

## Purpose

This document translates the visual reference board into an implementation-oriented design direction for Claude Code.

The reference image is the visual source of truth for the overall feeling and composition. Do not copy individual screens literally when the existing product's information architecture requires something different. Preserve the visual language and interaction principles.

## Product Direction

Khaifrost Resort — Quiet Luxury Hospitality × Modern AI Concierge.

The interface should feel:
- calm
- refined
- spacious
- editorial
- human
- premium
- modern
- restrained

Avoid the cliché interpretation of luxury:
- black + gold everywhere
- excessive serif
- giant gradients
- glassmorphism
- excessive shadows
- oversized rounded cards
- decorative animation

The design should feel expensive because of proportion, typography, whitespace, consistency, and restraint.

## Typography

Primary UI/body font:
- Inter or the strongest existing modern sans-serif already available.

Display/editorial font:
- Playfair Display or an equivalent refined serif if it visually works with the existing application.

Suggested hierarchy:
- Display: 56–72px desktop, tight line-height around 0.95–1.05
- H1: 40–56px
- H2: 28–40px
- H3: 20–28px
- Body: 15–17px
- Small: 13–14px
- Label/caption: 11–13px

Do not make everything bold.
Use weight and contrast sparingly.

## Color Direction

Core:
- Ivory / warm off-white: approximately #F5F3EC
- Ink: approximately #171714
- Stone / secondary text: approximately #77756E
- Muted olive: approximately #58634C
- Warm bronze: approximately #A98952
- Soft border: approximately #DDD9CF

Existing navy/gold colors may be retained where they fit the product, but the overall interface should be quieter and warmer than a conventional corporate hotel UI.

Accent colors should be rare.

## Spacing

Use a consistent spacing scale rather than arbitrary values.

Suggested base scale:
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128

Large marketing/guest sections should have generous vertical spacing.

Operational dashboards can be denser.

## Layout

Guest:
- generous whitespace
- strong editorial composition
- large imagery
- clear content hierarchy
- restrained navigation
- strong alignment

Staff/Admin:
- compact but breathable
- clear sidebar
- strong content grid
- operational density
- scan-friendly tables/lists
- status and action hierarchy

Use a consistent max-width container around 1180–1280px where appropriate.

## Cards

Cards should be used selectively.

Prefer:
- background contrast
- whitespace
- subtle borders

over heavy shadows.

Avoid putting every section inside a card.

Suggested radii:
- 4–8px for editorial/structural surfaces
- 8–12px for interactive components
- larger radii only where they clearly improve the experience

## AI Concierge

The AI should feel like the resort's digital concierge, not a generic chatbot.

Desired visual behavior:
- calm conversational layout
- clear message hierarchy
- quick actions
- contextual recommendation cards
- booking/service confirmations
- useful status information
- minimal chrome

Example opening:
"Good evening. How may I assist your stay?"

Useful quick actions:
Dining / Room service / Spa / Experiences / My stay / Reservations

The AI should help guests discover what they can do, not merely provide a text box.

## Imagery

Use existing repository assets first.

Photography should feel:
- natural
- warm
- architectural
- calm
- hospitality-focused

Use imagery as composition, not decoration.

Do not randomly add stock images just to fill space.

## Motion

Motion should be subtle and purposeful.

Suggested ranges:
- Micro interaction: 120–180ms
- Standard interaction: 180–280ms
- Panel/layout transition: 300–450ms
- Page transition: 350–500ms

Prefer:
- opacity
- transform
- controlled height/clip transitions

Avoid:
- bouncing
- excessive scaling
- dramatic parallax
- unnecessary infinite animation

Respect prefers-reduced-motion.

## Visual Principles

1. Clarity before decoration.
2. Hierarchy before aesthetics.
3. Whitespace communicates structure.
4. Similar things should look similar.
5. Related things should be spatially grouped.
6. Make important things stand out by weakening surrounding noise.
7. Every element needs a reason to exist.
8. Do not solve poor hierarchy with more color.
9. Do not solve poor spacing with more borders.
10. Motion communicates state rather than decoration.
11. Guest UI prioritizes atmosphere and hospitality.
12. Staff/Admin UI prioritizes operational clarity.
13. Mobile is a first-class experience.

## Reference Screens

The visual board contains examples of:
1. Guest homepage
2. AI concierge
3. Booking details
4. Guest account
5. Login
6. Staff dashboard
7. Admin dashboard
8. Design tokens
9. Components
10. Motion
11. Mobile layout

Use these as a coherent system, not as isolated templates.

## Claude Code Instruction

Before implementation, inspect `design-reference.png` and this document.

Treat the image as the visual north star.

Then inspect the actual repository and adapt the system to:
- existing routes
- existing API contracts
- existing data
- existing authentication
- existing business logic

Do not invent backend behavior.

Do not replace real data with mock data.

Do not blindly reproduce text or fake values from the reference image.

Recreate the design language, hierarchy, spacing, typography, component behavior, and interaction quality using the real application data.
