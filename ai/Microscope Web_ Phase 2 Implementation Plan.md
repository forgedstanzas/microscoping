# **Microscope Web: Phase 2 Implementation Plan**

Focus: Visualizations, Layout Engine (JSLA), SVG Threading, and Card Styling.  
Prerequisite: Phase 1 (Data Layer) completed successfully.

## **1\. Objectives**

1. **Render the Timeline:** Transform flat Y.js data into a structured 2D layout.  
2. **Card Visuals:** Implement specific styling (Borders, Tone, Ghosting) and "Fixed Width / Variable Height" logic.  
3. **Legacy Threading:** Parse tags (@Legacy) and draw connecting "subway map" lines between cards using parallel offsetting and variable thickness.

## **2\. Technical Strategy**

### **2.1 The Coordinate System (Two-Pass Render)**

To support "Variable Height" cards (where height expands to fit text) while maintaining a clean vertical stack in the Linear Layout, we cannot calculate Y-positions purely from the data. We must measure the DOM first.

1. **Measure Pass:** Render an invisible "Shadow DOM" of the cards with the fixed width (300px) to extract their scrollHeight.  
2. **Layout Pass:** The JSLA (Adapter) accepts \[Nodes \+ MeasuredDimensions\] and outputs { x, y } coordinates.  
3. **Render Pass:** React renders the visible cards at the calculated coordinates.

### **2.2 Layer Architecture (Z-Index)**

* **Layer 0 (Z=0):** Canvas Background (CSS Grid/Texture).  
* **Layer 1 (Z=10):** SVG Container (Legacy Threads). *Pointer-events: none* (unless hovering a line).  
* **Layer 2 (Z=20):** Node Container (Interactive Cards).

## **3\. Step-by-Step Implementation**

### **Step 1: The Parser Logic (Utilities)**

We need to extract tags to drive the visual threads.

* **Action:** Create src/utils/parser.ts.  
* **Function:** extractTags(text: string): string\[\]  
  * Regex: /@(\[\\w-\]+)/g (Matches @Tag-Name).  
  * Returns unique array of tags.  
* **Integration:** Update NodeService.ts to run this parser onChange and update the node's tags metadata field.

### **Step 2: The Card Component (Visuals)**

* **Action:** Create TimelineNode.tsx.  
* **Styling (CSS Modules):**  
  * width: 300px (Fixed User Preference).  
  * height: auto (Expands to fit text \- Default Phase 2 behavior).  
  * min-height: 150px.  
  * **Tone Classes:**  
    * .light: border: 4px solid var(--tone-light).  
    * .dark: border: 4px solid var(--tone-dark) (plus CSS background-image linear-gradient for hash effect).  
  * **Ghost Class:** .ghost \-\> border: 4px dotted rgba(255,255,255,0.5); backdrop-filter: blur(4px);.  
  * **Anchors:** Add invisible divs at top: 0, bottom: 0 on both Left and Right edges. These serve as calculation reference points for the SVG lines.

### **Step 3: The Linear JSLA (Layout Engine)**

* **Action:** Create src/layout/LinearAdapter.ts.  
* **Logic:**  
  1. **Group:** Organize nodes into a tree structure: Period \-\> Events \-\> Scenes.  
  2. **X-Axis (Periods):**  
     * Sort Periods by order.  
     * Period.x \= index \* (CardWidth \+ Gap).  
     * Period.y \= 0\.  
  3. **Y-Axis (Children):**  
     * Iterate through Events within a Period.  
     * Event.x \= Period.x.  
     * Event.y \= Period.y \+ Period.Height \+ Gap \+ (Sum of previous Events' measured heights \+ gaps).  
     * Repeat logic for Scenes nesting under Events (if using indentation) or stack Scenes directly under Events.  
  4. **Output:** Returns a Map of { \[id\]: { x, y, width, height } }.

### **Step 4: The SVG Threading Layer (LegacyOverlay)**

* **Action:** Create LegacyOverlay.tsx.  
* **Data Prep:**  
  * Iterate all nodes to count Tag Frequencies (e.g., @War appears 5 times).  
  * Create a Map: Tag \-\> Frequency.  
* **Geometry Logic:**  
  1. **Thickness Calculation:**  
     * baseThickness \= 2px  
     * factor \= 1px  
     * strokeWidth \= baseThickness \+ (TagFrequency \* factor). (Max cap: 12px).  
  2. **Offset Calculation (The "Parallel Lines" Logic):**  
     * For every Node, get its list of Tags.  
     * Sort Tags alphabetically (ensure consistent ordering across nodes).  
     * Calculate Vertical Offset on the edge:  
       * SlotSize \= 15px.  
       * StartY \= Node.y \+ (Node.height / 2\) \- ((Tags.length \* SlotSize) / 2).  
       * TagY \= StartY \+ (TagIndex \* SlotSize).  
  3. **Path Drawing:**  
     * Draw cubic bezier curves connecting the Right Edge of Node A to the Left Edge of Node B.  
     * **Control Points:** Add horizontal padding (CardWidth / 2\) to the control points to ensure lines exit horizontally before curving.

### **Step 5: Integration & Performance**

* **Action:** Update Canvas.tsx.  
  * Wrap the renderer in a ResizeObserver.  
  * **Optimization:** Since text editing changes height, debounce the "Layout Recalculation" by 100ms during typing to prevent jitter.  
  * Render LegacyOverlay inside the TransformComponent.

## **4\. Reversibility & Risk Analysis**

### **A. Switching from SVG to Canvas API for Lines**

* **Difficulty:** **Medium (5/10)**  
* **Why:** If the timeline grows to 1000+ nodes, thousands of SVG DOM elements might cause frame drops. Switching to HTML5 \<canvas\> (raster) is much faster but loses easy CSS styling (hover effects, glows).  
* *Mitigation:* We stick to SVG for Phase 2 as it is easier to debug. If performance lags in Phase 3, we abstract the line renderer.

### **B. Changing "Fixed Width" to "Variable Width"**

* **Difficulty:** **High (8/10)**  
* **Why:** Variable width breaks the "Stacking" logic of the Linear Layout. If an Event is wider than its Period, it visually bleeds into the next Period's column. We would need a complex collision detection algorithm (Masonry).

### **C. Changing Legacy Anchor Points (Edge \-\> Center)**

* **Difficulty:** **Low (2/10)**  
* **Why:** This is purely a coordinate calculation change in LegacyOverlay.tsx.

### **D. Thread Thickness Logic**

* **Difficulty:** **Trivial (1/10)**  
* **Why:** The formula base \+ (count \* factor) is isolated. We can tweak the multiplier anytime without affecting the rest of the app.