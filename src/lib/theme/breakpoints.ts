/**
 * The app's single breakpoint (docs/DESIGN_SYSTEM.md §2.7). Not a CSS custom property — media
 * queries can't read them — so this is the one place both `@media` queries and JS (e.g. `Dialog`'s
 * modal/sheet variant, the mobile view switcher) read it from.
 */
export const BREAKPOINT_DESKTOP = 900
