import useTheme from './hooks/useTheme';
import ThemeSwitcher from './components/ThemeSwitcher';
import './App.css';

function App() {
  // Initialize the theme logic
  useTheme();

  return (
    <>
      <ThemeSwitcher />
      <div className="card">
        <h1>Microscope Web</h1>
        <p>Phase 1: Theming Setup Complete</p>
      </div>
    </>
  );
}

export default App;