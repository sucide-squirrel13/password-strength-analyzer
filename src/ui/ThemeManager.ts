export type ThemeMode = 'light' | 'dark';
export type ThemeChangeListener = (theme: ThemeMode) => void;

/**
 * Manages light/dark theme strictly in memory using prefers-color-scheme.
 * Never persists theme selection to localStorage, sessionStorage, or cookies.
 */
export class ThemeManager {
  private currentTheme: ThemeMode;
  private hasManualOverride = false;
  private mediaQuery: MediaQueryList | null = null;
  private onChange: ThemeChangeListener | undefined;

  private readonly handleSystemChange = (event: MediaQueryListEvent): void => {
    if (this.hasManualOverride) {
      return;
    }
    this.currentTheme = event.matches ? 'dark' : 'light';
    this.applyTheme();
    this.onChange?.(this.currentTheme);
  };

  public constructor() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.currentTheme = this.mediaQuery.matches ? 'dark' : 'light';
      this.mediaQuery.addEventListener('change', this.handleSystemChange);
    } else {
      this.currentTheme = 'light';
    }
    this.applyTheme();
  }

  private applyTheme(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.currentTheme);
    }
  }

  public getTheme(): ThemeMode {
    return this.currentTheme;
  }

  public setOnChange(listener?: ThemeChangeListener): void {
    this.onChange = listener;
  }

  public toggle(): ThemeMode {
    this.hasManualOverride = true;
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.onChange?.(this.currentTheme);
    return this.currentTheme;
  }

  public destroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.handleSystemChange);
      this.mediaQuery = null;
    }
    this.onChange = undefined;
  }
}
