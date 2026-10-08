export const themeStorageKey = 'disaster-replay:theme';

export type Theme = 'light' | 'dark';

const themeColor: Record<Theme, string> = {
  light: '#f7f8f6',
  dark: '#0e171e',
};

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Si el almacenamiento está bloqueado, el tema claro sigue siendo el de partida.
  }
  return 'light';
}

export function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // El atributo del documento cambia igual durante esta visita.
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor[theme]);
}
