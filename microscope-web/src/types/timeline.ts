// As defined in the implementation plan

export type NodeTone = 'light' | 'dark';
export type NodeType = 'period' | 'event' | 'scene';

export interface TimelineNode {
  id: string;              // UUID
  type: NodeType;
  parentId: string | null; // Null for top-level Periods

  // Content
  title: string;
  description: string;

  // State
  tone: NodeTone;
  isGhost: boolean;        // Visual: dotted border
  isBookend: boolean;      // True for Start/End cards

  // Positioning
  order: number;           // Fractional index for sorting

  // Metadata
  tags: string[];          // Parsed tags, e.g., @Character-Name
}
