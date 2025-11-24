import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get theme from local storage or default to 'system'
    const storedTheme = localStorage.getItem('theme');
    return (storedTheme as Theme) || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (themeValue: Theme) => {
      let activeTheme = themeValue;
      if (themeValue === 'system') {
        activeTheme = mediaQuery.matches ? 'dark' : 'light';
      }
      
      root.setAttribute('data-theme', activeTheme);
      localStorage.setItem('theme', themeValue);
    };

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newColorScheme = e.matches ? 'dark' : 'light';
        root.setAttribute('data-theme', newColorScheme);
      }
    };

    // Apply the theme when the component mounts or theme state changes
    applyTheme(theme);

    // Listen for changes in system theme
    mediaQuery.addEventListener('change', handleMediaChange);

    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [theme]);

  return { theme, setTheme };
};

export default useTheme;
