---
name: Voltage Industrial
colors:
  surface: '#210e0c'
  surface-dim: '#210e0c'
  surface-bright: '#4b3330'
  surface-container-lowest: '#1b0907'
  surface-container-low: '#2a1613'
  surface-container: '#2f1a17'
  surface-container-high: '#3a2421'
  surface-container-highest: '#462f2b'
  on-surface: '#ffdad4'
  on-surface-variant: '#e9bcb5'
  inverse-surface: '#ffdad4'
  inverse-on-surface: '#412b27'
  outline: '#b08781'
  outline-variant: '#5f3f3a'
  surface-tint: '#ffb4a8'
  primary: '#ffb4a8'
  on-primary: '#690000'
  primary-container: '#e60000'
  on-primary-container: '#fff7f5'
  inverse-primary: '#c00000'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b6b5b4'
  tertiary: '#b2c5ff'
  on-tertiary: '#002c72'
  tertiary-container: '#0068f9'
  on-tertiary-container: '#f8f7ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930100'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#dae2ff'
  tertiary-fixed-dim: '#b2c5ff'
  on-tertiary-fixed: '#001847'
  on-tertiary-fixed-variant: '#0040a0'
  background: '#210e0c'
  on-background: '#ffdad4'
  surface-variant: '#462f2b'
  electric-red: '#e60000'
  pure-black: '#000000'
  charcoal: '#1a1c1c'
  concrete: '#474746'
typography:
  display-xl:
    fontFamily: Anybody
    fontSize: 72px
    fontWeight: '900'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Anybody
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Anybody
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Anybody
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.0'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
spacing:
  stack-unit: 8px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  section-gap: 120px
---

## Brand & Style

The visual identity is rooted in high-intensity performance and industrial grit, designed to evoke urgency, power, and discipline. It targets dedicated athletes and fitness enthusiasts who value professional-grade environments and straightforward, motivational communication.

The aesthetic combines **High-Contrast / Bold** elements with a **Brutalistic** structural foundation. This is manifested through:
- **Aggressive Motion:** Heavy use of italics and "speed-line" motifs to suggest forward momentum.
- **Industrial Rawness:** Deep, dark surfaces that mimic the matte finish of gym equipment and charcoal walls.
- **Kinetic Energy:** Geometric motifs inspired by high-voltage symbols are used for masking images and framing sections.
- **Zero-Friction Utility:** A professional interface that prioritizes actionable data and clear hierarchies over decorative fluff.

## Colors

The palette is strictly high-contrast to ensure maximum readability in low-light environments. The previous soft pink/coral accents have been completely replaced by a high-intensity brand red.

- **Electric Red (Primary):** #e60000. Used for critical calls to action, active states, and motivational highlights. This is the "Voltage" of the brand.
- **Pure Black (Background):** The foundation of the UI, creating a focused, immersive experience.
- **Dark Charcoal (Surface):** Used for cards, containers, and section dividers to provide subtle depth against the black background.
- **Crisp White (Text):** Reserved for primary content to ensure AAA accessibility against dark backgrounds.
- **Concrete Gray (Neutral/Secondary):** Used for secondary text, disabled states, and subtle borders to maintain the industrial feel without clashing with the red.

## Typography

The typography strategy is built on tension and clarity.

- **Headlines (Anybody):** Set in Extra Bold Italic to suggest speed and power. Display sizes utilize tight letter spacing to create dense, impactful blocks of text.
- **Body (Hanken Grotesk):** A modern, sharp sans-serif that provides clean contrast to the expressive headlines, ensuring technical data and instructions are easily digestible.
- **Utility (JetBrains Mono):** A monospaced font used for data points, timestamps, and "spec-sheet" style labels, reinforcing the industrial nature of the gym environment.

## Layout & Spacing

The layout follows a **Fixed Grid** model with a heavy emphasis on verticality and cinematic content blocks.

- **Grid System:** Use a 12-column system for desktop and a 4-column system for mobile.
- **Rhythm:** Spacing is strictly based on an 8px increment. Section gaps are intentionally oversized (120px+) to allow bold typography "room to breathe," preventing the dark UI from feeling claustrophobic.
- **Asymmetry:** Occasionally break the grid with diagonal edges or elements that bleed off the side of the screen to maintain a gritty, unconventional brand feel.

## Elevation & Depth

This system rejects soft shadows in favor of **Tonal Layering** and **Bold Outlines**.

- **Surface Levels:** 
  - Level 0: Pure Black (#000000) for the main canvas.
  - Level 1: Dark Charcoal (#1A1C1C) for cards and secondary sections.
- **Outlines:** Use 1px or 2px solid borders in Concrete Gray or Electric Red to define boundaries instead of shadows.
- **Hard Transitions:** Use high-contrast color blocks (Red against Black) to create a sense of layering without using gradients or blurs.
- **Industrial Textures:** Occasional use of low-opacity grain or "concrete" texture overlays on Charcoal surfaces to enhance the gritty feel.

## Shapes

The shape language is strictly **Sharp (0px)**. 

- All buttons, input fields, cards, and image containers must have 90-degree corners. 
- **The Bolt Motif:** For decorative elements and image masks, use 45-degree and 60-degree angles to create "lightning" shapes. 
- **Dividers:** Use thick (4px+) vertical or diagonal bars in Electric Red to separate content blocks, mimicking structural gym beams.

## Components

### Buttons
- **Primary:** Solid Electric Red (#e60000) background with White text (bold, uppercase). Sharp corners. On hover, add a 2px White inset border.
- **Secondary:** Transparent background with a 2px White border. White text.
- **Ghost:** White text with a Monospaced label, no background.

### Cards
- Background is always Dark Charcoal. No rounded corners. Borders are only used if the card sits on another Charcoal surface; otherwise, let the tonal shift from Black to Charcoal define the edge.

### Input Fields
- Solid Dark Charcoal box with sharp corners. Active focus state is indicated by a 2px Electric Red bottom border or outline. Labels use the Monospaced utility font.

### Progress Bars
- Background is Concrete Gray. The progress fill is solid Electric Red. Use sharp, vertical segments to show increments for a digital/industrial aesthetic.

### Chips & Tags
- Rectangular blocks with solid White or Electric Red backgrounds and inverted text. Used for "High Intensity" or "Strength" category labels.

### Imagery
- Photography should be high-contrast and desaturated, with Electric Red used as the only spot color for accents or lighting effects.