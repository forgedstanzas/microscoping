export interface ViewSettings {
  theme?: Record<string, string>; // Optional: Maps to CSS vars (e.g., --node-bg)
  layout?: { // Optional: Layout configuration
    adapter?: 'linear' | 'zigzag'; // 'linear' or 'zigzag'
    constants?: { // Optional: Numerical constants for layout calculations
      cardWidth?: number;    // Default 300
      zigzagOffset?: number; // Default 250
      gapSize?: number;      // Default 50
    }
  }
}
