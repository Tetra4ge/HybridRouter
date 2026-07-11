d---
name: dashboard_style
description: "Applies the custom Butter and Cherry design system for building the HybridRouter React Dashboard."
---

# Butter & Cherry Design System for HybridRouter Dashboard

Use this system for all styling, styling tokens, components, and layouts of the dashboard frontend.

## 🎨 Theme Colors
*   **Dark Mode Colors:** Background `#0a0a0a` (almost pure black), text/accent `#f5f5f5` (off-white).
*   **Light Mode Colors:** Background `#f5f5f5` (off-white), text/accent `#0a0a0a` (almost pure black).
*   **Theme Toggle:** Implement a dynamic theme toggle to switch between the two contrasting modes.
*   **Icons:** **STRICTLY USE LUCIDE REACT ICONS**. Emojis or cheap icon packs are forbidden. Import clean vector icons from `lucide-react`.
*   **Theme Vibe:** A premium, ultra-high-contrast minimalist mono design system. Solid block colors, clean transitions, and no gradients.

## ✍️ Typography
*   **Headers & Titles:** **Ancola** (with **Cinzel** fallback) for display titles.
*   **Body & UI Text:** **Saira** for readable text.

## 🚀 Component Guidelines
*   **Micro-animations:** Always use `framer-motion` for transitions, card hover scales, and data list reveals.
*   **Borders & Corners:** **STRICTLY NO BORDERS AND NO BORDER RADIUS**. Set `border: none` (or `0`) and `border-radius: 0` everywhere. Corners must be perfectly sharp. Buttons should use solid background blocks (like card-bg) with only a shadow offset and no outline borders.
*   **Layout:** Keep layouts responsive, utilizing solid block backgrounds instead of outlines to separate content.

## ✨ Premium Feel & Rich Aesthetics
To ensure a stunning, unique developer dashboard:
1. **Solid block contrast:** Avoid gradients or rounded outlines. Use solid, high-contrast panels with sharp `#75070C` (Cherry) backgrounds floating over a clean `#FFEDAB` (Butter) background.
2. **Tactile interactive offsets:** Instead of glowing round outlines, use solid shadow shifts (e.g. `box-shadow: 6px 6px 0px #75070C` on hover) to create a premium, modern design.

