---
name: Light theme default
description: App defaults to light theme; dark mode available via toggle. No hardcoded dark classes.
type: preference
---
- Default theme is LIGHT (white background, green + saffron brand colors)
- Dark mode is available via ThemeToggle component (sun/moon icon)
- NEVER add hardcoded `className="dark"` to any component
- Theme is managed globally via next-themes ThemeProvider
- All layouts (student, creator, admin) use the same theme system
