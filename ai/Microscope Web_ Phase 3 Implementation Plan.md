# **Microscope Web: Phase 3 Implementation Plan**

Focus: Logic Systems, Zig-Zag Layout, Responsive Sideboard, and Data Portability.  
Prerequisite: Phase 2 (Visuals/Linear Layout) completed.

## **1\. Objectives**

1. **Zig-Zag Layout:** Implement the "Tone-Divergent" JSLA (JavaScript Layout Adapter) using negative coordinates.  
2. **Palette Logic:** Implement fuzzy search to warn users of banned ingredients ("No" list).  
3. **Dynamic Sideboard:** Build a responsive UI panel that groups Meta/Palette/Legacies but splits them into tabs if vertical space is tight.  
4. **Data Portability:** Implement Session Export (Save) and Overwrite Import (Load).

## **2\. Technical Strategy**

### **2.1 The Zig-Zag Geometry (Tone-Divergent)**

Unlike the Linear adapter, which only grows \+Y (down), this adapter utilizes the full Cartesian plane.

* **Origin (0,0):** The vertical center of the canvas.  
* **Light Periods:** Shifted Y \= \-250px (Up). Events stack in \-Y direction.  
* **Dark Periods:** Shifted Y \= \+250px (Down). Events stack in \+Y direction.  
* **Bookends:** Respect their Tone setting.

### **2.2 Responsive Sideboard Logic**

To handle the "Peel-Off" requirement:

1. **Measure:** We use a ResizeObserver on the Sideboard container.  
2. **Priority Queue:** \[Meta, Palette, Legacies\].  
3. **Render Loop:** Attempt to render all in Tab 1\. If scrollHeight \> clientHeight, move the last item (Legacies) to a new Tab. Repeat check. If still overflowing, move Palette to a new Tab.  
4. **Settings:** Always resides in the final, pinned Tab.

## **3\. Step-by-Step Implementation**

### **Step 1: The Palette Logic (Fuse.js)**

* **Action:** Install fuse.js.  
* **Action:** Create src/logic/PaletteEnforcer.ts.  
  * **Input:** User Text, "No" List.  
  * **Config:** threshold: 0.2 (Matches "Aliens" to "Alien", but avoids false positives like "Alies").  
  * **Output:** Array of { start: index, end: index, word: string } matches.  
* **UI Integration:**  
  * In TimelineNode.tsx, wrap the textarea in a component that renders an Overlay div behind the text.  
  * Highlight matches in the Overlay with a red squiggly underline (text-decoration: wavy underline red).  
  * **Future Note:** In Phase 4+, add "Yes" list auto-complete/highlighting. For Phase 3, display "Yes" list passively in the Sideboard.

### **Step 2: The Zig-Zag JSLA (Layout Engine)**

* **Action:** Create src/layout/ZigZagAdapter.ts.  
* **Logic:**  
  1. **X-Axis:** Same as Linear (Index \* CardWidth).  
  2. **Period Y-Axis:**  
     * If tone \=== 'light': y \= \-250.  
     * If tone \=== 'dark': y \= \+250.  
  3. **Event/Scene Stacking:**  
     * **Light Parent:**  
       * Event\[0\].y \= Period.y \- (PeriodHeight/2) \- Gap \- (EventHeight/2). (Growing Upward).  
       * Subsequent events subtract height.  
     * **Dark Parent:**  
       * Event\[0\].y \= Period.y \+ (PeriodHeight/2) \+ Gap \+ (EventHeight/2). (Growing Downward).  
       * Subsequent events add height.  
  4. **Scene Indentation:** Scenes shift x \+ 50px relative to their parent Event to show hierarchy visually since vertical stacking is now bidirectional.

### **Step 3: The Dynamic Sideboard**

* **Action:** Create Sideboard.tsx and TabManager.tsx.  
* **State:** activeTab (string), groupedSections (array of arrays).  
* **Layout Calculation (The "Peel" Logic):**  
  useEffect(() \=\> {  
    const height \= window.innerHeight;  
    const metaH \= 200; // Approx rendered height  
    const paletteH \= 300;  
    const legacyH \= 300;

    if (height \> (metaH \+ paletteH \+ legacyH)) {  
       setTabs(\[{ id: 'main', content: \['meta', 'palette', 'legacy'\] }\]);  
    } else if (height \> (metaH \+ paletteH)) {  
       setTabs(\[  
         { id: 'main', content: \['meta', 'palette'\] },  
         { id: 'legacies', content: \['legacy'\] }  
       \]);  
    } else {  
       setTabs(\[  
         { id: 'main', content: \['meta'\] },  
         { id: 'palette', content: \['palette'\] },  
         { id: 'legacies', content: \['legacy'\] }  
       \]);  
    }  
    // Always append Settings tab at the end  
  }, \[windowHeight\]);

### **Step 4: Import/Export (Persistence)**

* **Action:** Create SessionManager.ts.  
* **Export (Save):**  
  * Function: exportSession().  
  * Logic: Serialize the entire Y.js Document state (Meta, Nodes, Palette) into a JSON blob.  
  * Output: Trigger browser download of microscope-session-\[date\].microscope.  
* **Import (Load):**  
  * Function: importSession(file).  
  * Logic:  
    1. Parse JSON.  
    2. **Transact:** yDoc.transact(() \=\> { ... }).  
    3. **Nuke:** Iterate all Maps (nodes, meta, palette) and clear() them.  
    4. **Rehydrate:** Iterate JSON keys and set() them into the Maps.  
  * **Alert:** Show a browser confirmation dialog ("This will overwrite the current session") before executing.

## **4\. Reversibility & Risk Analysis**

### **A. Changing "Overwrite" Import to "Merge"**

* **Difficulty:** **High (8/10)**  
* **Why:** "Merging" requires solving ID collisions (what if both files have a node with ID 1?) and Logic conflicts (what if File A says "No Aliens" and File B says "Yes Aliens"?). Overwrite avoids this entirely.

### **B. Modifying the "Peel-Off" Logic order**

* **Difficulty:** **Trivial (1/10)**  
* **Why:** The logic is explicitly defined in the useEffect hook in Step 3\. Changing the priority order is just swapping array elements.

### **C. Adjusting Zig-Zag Offsets (e.g., changing 250px)**

* **Difficulty:** **Low (2/10)**  
* **Why:** This is a constant in ZigZagAdapter.ts. We can expose this as a user-configurable variable in the View Settings later if desired.

### **D. Palette Performance**

* **Risk:** Typing in a massive document with hundreds of banned words causes lag.  
* **Mitigation:** The logic is **Debounced** (waits 500ms after typing stops) and runs in a WebWorker (optional optimization if main thread lags) or simply via Fuse.js which is highly optimized. Given the constraints (human typing speed), risk is low.