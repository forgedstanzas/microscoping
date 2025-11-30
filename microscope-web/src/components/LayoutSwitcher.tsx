

import type { LayoutMode } from '../context/UIStateContext';

interface LayoutSwitcherProps {
  currentLayout: LayoutMode;
  onLayoutChange: (newLayout: LayoutMode) => void;
}

export function LayoutSwitcher({ currentLayout, onLayoutChange }: LayoutSwitcherProps) {
  return (
    <>
      <label htmlFor="layout-select">Layout Mode:</label>
      <select
        id="layout-select"
        value={currentLayout}
        onChange={(e) => onLayoutChange(e.target.value as LayoutMode)}
      >
        <option value="zigzag">Zig-Zag</option>
        <option value="linear">Linear</option>
      </select>
    </>
  );
}
