/**
 * @typedef {Object} ColorPalette
 * @property {string} background
 * @property {string} surface
 * @property {string} card
 * @property {string} text
 * @property {string} textSecondary
 * @property {string} headerBg
 * @property {string} headerText
 * @property {string} accent
 * @property {string} accentText
 * @property {string} border
 * @property {string} bubbleBot
 * @property {string} bubbleUser
 * @property {string} success
 * @property {string} warning
 * @property {string} error
 */

/** LIGHT — same as your first version */
export const lightColors /** @type {ColorPalette} */ = {
  background: "#F5FAFF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#111827",
  textSecondary: "#475569",
  headerBg: "#CCFF00",
  headerText: "#FFFFFF",
  accent: "#0B3D91",
  accentText: "#FFFFFF",
  border: "#E5E7EB",
  bubbleBot:"#EAF4FF",
  bubbleUser:"#E8F7EC",
  success: "#148F3C",
  warning: "#B45309",
  error: "#B91C1C",
};

/** DARK — same as your first version */
export const darkColors /** @type {ColorPalette} */ = {
  background: "#0B1220",
  surface: "#111827",
  card: "#111827",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  headerBg: "#E1661A",
  headerText: "#FFFFFF",
  accent: "#66A3FF",
  accentText: "#0B1220",
  border: "#1F2937",
  bubbleBot:"#111827",
  bubbleUser:"#1F2937",
  success: "#30C36B",
  warning: "#F59E0B",
  error: "#EF4444",
};
/**
 * @typedef {"light"|"dark"} ThemeMode
 * @typedef {Object} AppTheme
 * @property {ThemeMode} mode
 * @property {ColorPalette} colors
 */

// React Navigation theme adapters (plain JS objects)
export const navThemeLight = {
  dark: false,
  colors: {
    primary: lightColors.accent,
    background: lightColors.background,
    card: lightColors.surface,
    text: lightColors.text,
    border: lightColors.border,
    notification: lightColors.accent
  },
};

export const navThemeDark = {
  dark: true,
  colors: {
    primary: darkColors.accent,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.accent
  },
};
