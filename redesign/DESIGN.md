# Design System Specification: Tactile Minimalism

## 1. Overview & Creative North Star
**The Creative North Star: "The Sculpted Canvas"**

This design system moves away from the flat, ephemeral nature of modern web interfaces toward a world that feels physical, permanent, and "carved" from a single block of organic material. Inspired by claymorphism and modern skeuomorphism, the goal is to create a digital dashboard that feels like a high-end, physical control console made of warm, matte ceramic.

We break the "template" look by eschewing rigid borders and flat containers. Instead, we use intentional asymmetry and varying degrees of "extrusion" or "indentation" to guide the user's eye. The interface is not built; it is sculpted. High-contrast typography scales from *Plus Jakarta Sans* provide an editorial authority that balances the softness of the UI, ensuring the dashboard feels professional rather than toy-like.

---

## 2. Colors & Surface Philosophy

The palette is a sophisticated range of warm creams and earthy browns, designed to mimic natural light hitting a matte surface.

### Tonal Hierarchy
- **Base Surface:** `background` (#fff8f4) — The primary "clay" block.
- **Primary Accents:** `primary` (#75584d) — Used for high-priority interactive states and critical data points.
- **Soft UI Layers:** `surface_container` (#f9ebe0) and `surface_container_high` (#f5e5d8) are our primary tools for creating depth.

### The Rules of Engagement
- **The "No-Line" Rule:** Never use 1px solid borders for sectioning. Separation must be achieved through tonal shifts. A section should sit "lower" by using `surface_container_low` or "higher" by using `surface_bright` against the base.
- **Surface Hierarchy & Nesting:** Treat the dashboard as a series of physical tiers. A main data card (`surface_container_lowest`) sits on a navigation rail (`surface_container`), which sits on the base `background`. This nesting creates natural logic without visual clutter.
- **The "Glass & Gradient" Rule:** For floating modals or overlays, use a semi-transparent `surface` color with a `backdrop-blur` of 20px. To give CTAs "visual soul," use a subtle linear gradient from `primary` to `primary_dim`.

---

## 3. Typography

The typography strategy pairs the geometric precision of **Plus Jakarta Sans** with the rhythmic readability of **Manrope**.

- **Display & Headlines (Plus Jakarta Sans):** These are the "carved" headers. Use `display-lg` (3.5rem) for hero dashboard metrics and `headline-md` (1.75rem) for section titles. The wide aperture of this font complements the "expanded" feel of the soft UI.
- **Body & Labels (Manrope):** Use `body-lg` (1rem) for primary data and `label-md` (0.75rem) for micro-copy. The slightly condensed nature of Manrope provides a necessary counterpoint to the soft, expansive surfaces, keeping the data legible and grounded.

---

## 4. Elevation & Depth (The Tactile Engine)

Elevation is not a drop shadow; it is a displacement of light.

- **The Layering Principle:** Depth is achieved by stacking surface tokens.
    - *Raised:* `surface_container_lowest` on top of `surface_container`.
    - *Recessed:* `surface_dim` inside of `background`.
- **Ambient Shadows:** When an element must "float" (like a primary action button), use two shadows:
    1. **Light Side:** A white highlight (-5px, -5px, 15px) at 50% opacity.
    2. **Dark Side:** A diffused shadow (5px, 5px, 20px) using `on_surface` at 6% opacity. This mimics a soft-box studio light.
- **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline_variant` at 15% opacity. High-contrast outlines are strictly forbidden as they "cut" the clay and ruin the tactile illusion.

---

## 5. Components

### Buttons
- **Primary (Raised):** Uses `primary` background. In its default state, it features a subtle outer glow (light-source) and a soft shadow. On `:active`, it switches to a "pressed" state using an `inset` shadow to feel physically pushed into the surface.
- **Secondary (Flat-Tactile):** Same color as the background, defined only by its "raised" neumorphic shadows.

### Input Fields
- **Text Inputs:** Designed as "recessed" wells. Use an `inset` shadow with `surface_container_high` to make the field look carved into the dashboard.
- **Focus State:** The `outline` token at 20% opacity appears as a soft "glow" from within the well.

### Cards & Lists
- **Cards:** No dividers. Use `surface_container_low` for the card body and `surface_container_lowest` for the inner content area to create a "stepped" look.
- **Lists:** Use the Spacing Scale (specifically `spacing-4` or 1.4rem) to create separation. Content is grouped by proximity and tonal background shifts rather than lines.

### Progress & Sliders
- **The Track:** A recessed "groove" (`surface_dim`).
- **The Handle:** A high-gloss "bead" using `primary_container` that sits on top of the groove with a distinct ambient shadow.

---

## 6. Do's and Don'ts

### Do
- **Do** use `rounded-xl` (1.5rem) for large containers to emphasize the "soft clay" aesthetic.
- **Do** treat vertical white space as a structural element. Use `spacing-10` (3.5rem) between major dashboard modules.
- **Do** use `surface_tint` sparingly to highlight active navigation states.

### Don't
- **Don't** use pure black (#000) for shadows. Always tint shadows with the `on_surface` tone to maintain the warm, creamy atmosphere.
- **Don't** use 90-degree corners. Everything must feel "molded" and ergonomic.
- **Don't** overlap too many "raised" elements. If everything is raised, nothing is. Balance raised cards with recessed inputs to create a "topography" of data.