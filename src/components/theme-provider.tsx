import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';
type Font = 'inter' | 'system' | 'mono';

export const FONT_OPTIONS: { value: Font; label: string; family: string }[] = [
  { value: 'inter', label: 'Inter', family: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  { value: 'system', label: 'System', family: 'ui-sans-serif, system-ui, sans-serif' },
  { value: 'mono', label: 'Monospace', family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
];

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultFont?: Font;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  font: Font;
  setFont: (font: Font) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  font: 'inter',
  setFont: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultFont = 'inter',
  storageKey = 'condor-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [font, setFontState] = useState<Font>(
    () => (localStorage.getItem('condor-ui-font') as Font) || defaultFont
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const fontOption = FONT_OPTIONS.find(f => f.value === font);
    if (fontOption) {
      document.documentElement.style.setProperty('--font-sans', fontOption.family);
    }
  }, [font]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    font,
    setFont: (font: Font) => {
      localStorage.setItem('condor-ui-font', font);
      setFontState(font);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
