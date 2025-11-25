import React from 'react';

interface LayoutSwitcherProps {
  currentLayout: string;
  onLayoutChange: (newLayout: string) => void;
}

export function LayoutSwitcher({ currentLayout, onLayoutChange }: LayoutSwitcherProps) {
  return (
    <>
      <label htmlFor="layout-select">Layout Mode:</label>
      <select
        id="layout-select"
        value={currentLayout}
        onChange={(e) => onLayoutChange(e.target.value)}
      >
        <option value="zigzag">Zig-Zag</option>
        <option value="linear">Linear</option>
      </select>
    </>
  );
}
