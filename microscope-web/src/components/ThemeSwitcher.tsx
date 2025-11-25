import React from 'react';
import { useSharedTheme } from '../context/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useSharedTheme();

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as 'light' | 'dark' | 'system');
  };

  return (
    <>
      <label htmlFor="theme-switcher">Theme:</label>
      <select id="theme-switcher" value={theme} onChange={handleThemeChange}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </>
  );
};

export default ThemeSwitcher;
