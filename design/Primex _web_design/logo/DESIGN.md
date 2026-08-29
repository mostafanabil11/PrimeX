---
name: Voltage Industrial
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#e9bcb5'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#b08781'
  outline-variant: '#5f3f3a'
  surface-tint: '#ffb4a8'
  primary: '#ffb4a8'
  on-primary: '#690000'
  primary-container: '#e60000'
  on-primary-container: '#fff7f5'
  inverse-primary: '#c00000'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#c9c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#737272'
  on-tertiary-container: '#fbf8f7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930100'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c9c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
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
  margin-desktop: 64px
  margin-mobile: 20px
  gutter: 24px
  stack-unit: 8px
  section-gap: 120px
---

## Brand & Style

The visual identity of the design system is rooted in high-intensity performance and industrial grit. It is designed to evoke a sense of urgency, power, and discipline. The target audience consists of dedicated athletes and fitness enthusiasts who value professional-grade environments and straightforward, motivational communication.

The aesthetic combines **High-Contrast / Bold** elements with a **Brutalistic** structural foundation. This is manifested through:
- **Aggressive Motion:** Heavy use of italics and "speed-line" motifs to suggest forward momentum.
- **Industrial Rawness:** Deep, dark surfaces that mimic the matte finish of gym equipment and charcoal walls.
- **Kinetic Energy:** The lightning bolt from the branding is used as a recurring geometric motif for masking images and framing sections.
- **Zero-Friction Utility:** A professional interface that prioritizes actionable data and clear hierarchies over decorative fluff.

## Colors

The palette is strictly high-contrast to ensure maximum readability in low-light environments. 

- **Electric Red (Primary):** Used for critical calls to action, active states, and motivational highlights. It represents the "Voltage" of the brand.
- **Deep Black (Background):** The foundation of the UI, creating a focused, immersive experience that eliminates distractions.
- **Dark Charcoal (Surface):** Used for cards, containers, and section dividers to provide subtle depth against the pure black background.
- **Crisp White (Text):** Reserved for primary content to ensure AAA accessibility.
- **Concrete Gray (Neutral):** Used for secondary text, disabled states, and subtle borders to maintain the industrial feel without clashing with the red.

## Typography

The typography strategy is built on tension and clarity.

- **Headlines (Anybody):** Set in Extra Bold Italic to mirror the "BREAK THE LIMIT" wall graphics. The aggressive slant suggests speed and power. Display sizes should utilize tight letter spacing to create a dense, impactful block of text.
- **Body (Hanken Grotesk):** A modern, sharp sans-serif that provides a clean contrast to the expressive headlines. It ensures that technical workout data and instructions are easily digestible.
- **Utility (JetBrains Mono):** A monospaced font used for data points, timestamps, and "spec-sheet" style labels, reinforcing the industrial, technical nature of the gym environment.

## Layout & Spacing

The layout follows a **Fixed Grid** model with a heavy emphasis on verticality and large, cinematic content blocks.

- **Grid:** A 12-column system for desktop and a 4-column system for mobile. 
- **Industrial Rhythm:** Spacing is strictly based on an 8px increment. However, section gaps are intentionally oversized (120px+) to allow the photography and bold typography "room to breathe," preventing the dark UI from feeling claustrophobic.
- **Asymmetry:** Layouts should occasionally break the grid with "lightning-cut" edges or elements that bleed off the side of the screen to maintain the gritty, unconventional brand feel.

## Elevation & Depth

This system rejects soft shadows and traditional depth in favor of **Tonal Layering** and **Bold Outlines**.

- **Surface Levels:** 
  - Level 0: Pure Black (#000000) for the main canvas.
  - Level 1: Dark Charcoal (#1A1A1A) for cards and secondary sections.
- **Outlines:** Instead of shadows, use 1px or 2px solid borders in Concrete Gray or Electric Red to define boundaries.
- **Hard Transitions:** Use high-contrast color blocks (Red against Black) to create a sense of layering without using gradients or blurs.
- **Industrial Textures:** Occasional use of low-opacity grain or "concrete" texture overlays on Charcoal surfaces to enhance the gritty feel.

## Shapes

The shape language is strictly **Sharp (0px)**. 

- All buttons, input fields, cards, and image containers must have 90-degree corners. 
- **The Bolt Motif:** For decorative elements and image masks, use 45-degree and 60-degree angles to create "lightning" shapes. 
- **Dividers:** Use thick (4px+) vertical or diagonal bars in Electric Red to separate content blocks, mimicking the structural beams of the gym.

## Components

### Buttons
- **Primary:** Solid Electric Red background, White text (bold, uppercase). Sharp corners. On hover, the background shifts to a slightly darker red or adds a 2px White inset border.
- **Secondary:** Transparent background with a 2px White border. White text.
- **Ghost:** White text with a Monospaced label, no background.

### Cards
- Background is always Dark Charcoal. No rounded corners. Borders are only used if the card sits on another Charcoal surface; otherwise, the tonal shift from Black to Charcoal is sufficient.

### Input Fields
- Underline style or solid Dark Charcoal box. Focus state is indicated by a 2px Electric Red bottom border or outline. Labels use the Monospaced utility font.

### Progress Bars (Workout Tracking)
- Background is Dark Gray. The progress fill is solid Electric Red. Use sharp, vertical segments to show increments, giving it a digital/industrial look.

### Chips & Tags
- Rectangular blocks with solid White or Red backgrounds and inverted text. Used for "High Intensity," "Pro," or "Strength" category labels.

### Imagery
- Photography should be high-contrast, desaturated (almost black and white), with Electric Red used as the only spot color for accents or lighting.