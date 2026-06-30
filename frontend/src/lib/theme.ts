const THEME_KEY = "theme";
const DEFAULT_THEME = "invoiceraider-dark";

const LEGACY_THEME_MAP: Record<string, string> = {
  "invio-dark": "invoiceraider-dark",
  "invio-light": "invoiceraider-light",
};

function migrateThemeName(theme: string): string {
  return LEGACY_THEME_MAP[theme] ?? theme;
}

function getStoredTheme(): string | null {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (!stored) return null;
    const migrated = migrateThemeName(stored);
    if (migrated !== stored) {
      localStorage.setItem(THEME_KEY, migrated);
    }
    return migrated;
  } catch (_err) {
    return null;
  }
}

export function setTheme(theme: string) {
  const normalizedTheme = theme ?? DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", normalizedTheme);
  try {
    localStorage.setItem(THEME_KEY, normalizedTheme);
  } catch (_err) {
    // ignore
  }
}

export function setThemeFromStorage() {
  const storedTheme = getStoredTheme();
  const currentTheme = document.documentElement.getAttribute("data-theme");

  if (storedTheme == null) {
    setTheme(DEFAULT_THEME);
  } else if (storedTheme != currentTheme) {
    setTheme(storedTheme);
  }
}

export function getTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  return currentTheme ?? getStoredTheme() ?? DEFAULT_THEME;
}
