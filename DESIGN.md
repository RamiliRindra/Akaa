# Design System Document: Akaa

## 1. Overview & Creative North Star

### The Creative North Star: "The Digital Atheneum"
This design system moves beyond the transactional nature of e-learning to create an environment of "Illuminated Focus." We are blending the prestige of a high-end editorial magazine with the immersive, dopamine-driven feedback loops of a modern gaming dashboard.

The system rejects the "boxed-in" feel of traditional SaaS. Instead, it utilizes **intentional asymmetry, overlapping glass layers, and high-contrast typography** to guide the learner's eye. We break the grid by allowing hero elements and "Quest Cards" to bleed across section boundaries, creating a sense of momentum and growth inspired by the upward-trajectory arrow in the branding logo.

---

## 2. Colors & Surface Architecture

Our palette is rooted in a professional foundation, punctuated by vibrant "Activation" colors that signal progress and achievement.

### The Palette
- **Primary Blue (#0050d6):** The color of Authority. Used for the primary action path and navigation anchors.
- **Secondary Purple (#655670):** The Gamification Engine. Used for mystery, challenges, and progress tracking.
- **Tertiary Gold (#775600):** The Reward. Used exclusively for badges, streaks, and high-value achievements. It must be used sparingly to maintain its perceived value.
- **Success Teal (#119DA4):** Used for completion states and "Path Clear" signals.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or regions. Structure must be achieved through:
1. **Background Shifts:** Transitioning from `surface` (#f5f7f9) to `surface-container-low` (#eef1f3).
2. **Negative Space:** Utilizing the spacing scale to create distinct cognitive groupings.
3. **Tonal Transitions:** Using subtle, large-scale gradients to lead the eye from one module to the next.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the `surface-container` tiers to create "nested" depth:
- **Base Layer:** `surface` (#f5f7f9) for the global backdrop.
- **Content Zones:** `surface-container-low` (#eef1f3) for sidebar or secondary content regions.
- **Interactive Cards:** `surface-container-lowest` (#ffffff) to provide the highest contrast and "lift" for the learner's primary focus.

### The "Glass & Gradient" Rule
To elevate the experience above "out-of-the-box" UI, utilize **Glassmorphism** for floating elements (like progress modals or navigation bars).
- **Glass Spec:** `surface-container-lowest` at 70% opacity with a `20px` backdrop-blur.
- **Signature Textures:** Use linear gradients (e.g., `primary` to `primary-container`) for Hero CTAs. This adds "visual soul" and a premium finish that flat colors cannot replicate.

---

## 3. Typography: Editorial Authority

We utilize a dual-typeface system to balance readability with brand character.

| Level | Typeface | Size | Intent |
| :--- | :--- | :--- | :--- |
| **Display** | Manrope | 3.5rem - 2.25rem | Cinematic headers for course titles and milestones. |
| **Headline** | Manrope | 2rem - 1.5rem | Section titles that require immediate attention. |
| **Title** | Inter | 1.375rem - 1rem | Card headers and navigational elements. |
| **Body** | Inter | 1rem - 0.875rem | High-density learning content and descriptions. |
| **Label** | Inter | 0.75rem - 0.68rem | Metadata, tags, and small utility text. |

**Editorial Contrast:** Always pair a `display-lg` headline with a `body-md` description. The extreme difference in scale creates the high-end, bespoke feel found in premium digital publications.

---

## 4. Elevation & Depth

We eschew traditional "drop shadows" in favor of **Tonal Layering** and **Ambient Light**.

- **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural, soft lift.
- **Ambient Shadows:** For floating elements (Modals/Popovers), use an extra-diffused shadow: `0 24px 48px -12px rgba(44, 47, 49, 0.08)`. The shadow should feel like a soft glow, not a dark stain.
- **The "Ghost Border":** If a container requires definition against a white background, use the `outline-variant` token at **10% opacity**. Never use a 100% opaque border.
- **Glassmorphism:** Use `backdrop-filter: blur(16px)` on any glass layer to allow background colors to bleed through, integrating the UI into a single cohesive environment.

---

## 5. Components (shadcn/ui Enhanced)

### Buttons
- **Primary:** High-radius (`lg: 2rem`), using the `primary` to `primary-container` gradient. Subtle `primary_dim` inner-glow on hover.
- **Secondary/Ghost:** No border. Use `surface-container-high` on hover.
- **Gamified Action:** Use `secondary` (Purple) for "Start Challenge" or "Enter Arena" actions.

### Cards (The "Learning Module")
- **Radius:** `lg` (2rem).
- **Style:** No borders. Background: `surface-container-lowest`.
- **Interaction:** On hover, apply a soft `surface-container-highest` tint and a 2px upward translation (Y-axis) to mimic "picking up" the card.

### Progress Indicators
- **Vibrancy:** Use `primary` for standard progress and `tertiary` (Gold) for "Elite" or "Bonus" progress.
- **Form:** Use thick, rounded tracks (`full` radius) with a `surface-container-high` background.

### Input Fields
- **Base Style:** `surface-container-low` background with `none` or `ghost` borders.
- **Focus State:** Transition background to `surface-container-lowest` and add a `2px` glow using the `primary` color at 20% opacity.

---

## 6. Do's and Don'ts

### Do
- **Do** use massive amounts of white space between course modules to reduce cognitive load.
- **Do** use the `lg` (2rem) and `xl` (3rem) corner radii for main layout containers to maintain the "Modern & Friendly" aesthetic.
- **Do** use the Warm Gold (`tertiary`) only for moments of genuine celebration.
- **Do** overlap images or illustrations across background color shifts to create a sense of depth.
- **Do** preserve clear interactive affordances: pointer cursor, subtle hover lift, and visible pending state on long-running actions.
- **Do** keep the brand logo image-led in navigation surfaces instead of retyping the product name beside it by default.

### Don't
- **Don't** use black (#000000) for text. Use `on-surface` (#2c2f31) for a softer, premium reading experience.
- **Don't** use 1px dividers. If you feel the need for a line, use a 24px gap of white space instead.
- **Don't** use standard "box-shadows" from CSS frameworks. Always use the Ambient Shadow spec defined in Section 4.
- **Don't** use sharp corners. Every interactive element must have a minimum radius of `sm` (0.5rem), favoring `lg` (2rem) for major containers.
- **Don't** hide loading behind silent buttons. Any action that triggers a server round-trip should communicate pending state inside the CTA or the destination section.

---

## 7. Implementation Notes — Avril 2026

These notes capture concrete decisions already applied in the product so the design direction remains stable across future iterations.

- **Navigation logo:** image-first treatment, no forced adjacent wordmark in sidebars and compact shells.
- **Hover feedback:** interactive elements must expose pointer intent through cursor change plus a subtle visual reaction.
- **Pending feedback:** long-running buttons use an inline spinner and disabled state instead of changing component family or layout.
- **Route feedback:** learner, trainer and admin zones provide localized loading surfaces during navigation instead of blocking the whole app with a single global loader.
- **Sidebar evolution (later):** `SidebarFooter`, `SidebarTrigger`, `SidebarRail` and collapsible groups remain valid structural candidates, but the current custom sidebar stays the baseline until a later refactor.

---
*This design system is a living document intended to evolve with the Akaa platform. Always prioritize the "Illuminated Focus" of the learner over decorative complexity.*
