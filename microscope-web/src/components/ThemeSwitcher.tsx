import React from 'react';
import useTheme from '../hooks/useTheme';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as 'light' | 'dark' | 'system');
  };

  return (
    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000 }}>
      <label htmlFor="theme-switcher">Theme: </label>
      <select id="theme-switcher" value={theme} onChange={handleThemeChange}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
};

export default ThemeSwitcher;
