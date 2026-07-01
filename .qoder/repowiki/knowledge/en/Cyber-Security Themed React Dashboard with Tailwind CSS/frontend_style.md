## Overview
The frontend for the Clinical Network Intrusion Detection System (NIDS) is a **React** application built with **Vite**, utilizing **Tailwind CSS** for styling. The design aesthetic is a "cyber-security" or "dark mode" theme, characterized by deep navy backgrounds, neon accent colors (blue, green, orange, red), and glassmorphism effects.

## Styling Architecture
### 1. Tailwind CSS Configuration
The project uses Tailwind CSS v3 with a custom configuration (`tailwind.config.js`) that defines:
- **Custom Color Palette**:
  - `navy`: A range of dark blues (`#0a0f1e` to `#22304e`) used for backgrounds and borders.
  - `cyber`: Semantic colors for status and accents:
    - `blue` (#3b82f6): Primary actions, links, active states.
    - `green` (#22c55e): Success, benign traffic, low severity.
    - `orange` (#f97316): Warnings, medium severity.
    - `red` (#ef4444): Critical alerts, high severity, danger actions.
    - `purple` (#8b5cf6) & `cyan` (#06b6d4): Secondary accents, data visualization.
- **Typography**: 
  - Sans-serif: 'Inter' for UI text.
  - Monospace: 'JetBrains Mono' for data values, IDs, and code-like elements.
- **Animations**: Custom keyframes for `slide-in`, `fade-in`, and `pulse-slow` to enhance interactivity without heavy libraries.

### 2. Global Styles & Component Utilities (`index.css`)
The `src/index.css` file leverages Tailwind's `@layer` directive to create reusable component classes:
- **Base Layer**: 
  - Sets default background to `bg-navy-900` and text to `text-gray-100`.
  - Customizes scrollbars to match the dark theme (thin, navy track, blue hover).
- **Component Layer**:
  - `.glass-card`: A recurring card style using `bg-navy-800/60`, `backdrop-blur-md`, and subtle borders, creating a modern glassmorphism effect.
  - `.stat-card`: Extends `.glass-card` with hover effects (border glow, shadow) for dashboard metrics.
  - `.severity-*`: Utility classes for badge components (Critical, High, Medium, Low) using color-coded text, background, and border combinations.
  - `.btn-primary`, `.btn-secondary`, `.btn-danger`: Standardized button styles with hover states and shadows.
  - `.input-field`: Consistent input styling with focus rings using the primary cyber-blue color.
- **Utility Layer**:
  - `.text-gradient`: Applies a gradient from cyber-blue to cyber-cyan for headings or highlighted text.

## Component Structure & Layout
- **Layout**: The main layout (`Layout.jsx`) uses a fixed sidebar (`w-64`) and a flexible main content area. The background is consistently `bg-navy-900`.
- **Sidebar**: Features a dark navy background (`bg-navy-800`) with active navigation items highlighted using `bg-cyber-blue/15` and a border.
- **Pages**: Pages like `Dashboard.jsx` heavily utilize the `.glass-card` and `.stat-card` utilities. Data visualization is handled by `recharts`, with tooltips and grids customized to match the dark theme (e.g., dark tooltip backgrounds, subtle grid lines).

## Design Conventions
1. **Dark Mode First**: The entire UI is designed around a dark palette. Light mode is not supported.
2. **Glassmorphism**: Cards and panels use semi-transparent backgrounds with blur effects to create depth.
3. **Semantic Coloring**: Colors are strictly mapped to security contexts (Red = Critical/Attack, Green = Benign/Safe).
4. **Monospace for Data**: Numerical data, IDs, and technical labels use the `font-mono` class for readability and a "technical" feel.
5. **Interactive Feedback**: Buttons and cards have consistent hover states (border color changes, slight shadows) to provide tactile feedback.

## Key Files
- `Mini_Project/clinical-nids-dashboard/tailwind.config.js`: Defines the design token system (colors, fonts, animations).
- `Mini_Project/clinical-nids-dashboard/src/index.css`: Contains global styles and reusable Tailwind component utilities.
- `Mini_Project/clinical-nids-dashboard/src/components/Layout.jsx`: Main layout structure.
- `Mini_Project/clinical-nids-dashboard/src/components/Sidebar.jsx`: Navigation styling.
- `Mini_Project/clinical-nids-dashboard/src/pages/Dashboard.jsx`: Example of comprehensive usage of the design system.