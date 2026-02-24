# 🧠 Canvaseru: The Messy Mind Organizer
**App Vision:** A frictionless, infinite spatial workspace where users can dump their thoughts, connect ideas, create flowcharts, and visually organize their "messy mind" without the constraints of linear documents. Like throwing sticky notes on a wall, but infinite and organically connected.

## 1. Tech Stack & Architecture

To achieve a seamless, 60fps infinite canvas without the complexity of Figma's C++/WASM stack, we will use modern JavaScript web technologies.

*   **Frontend Framework:** React 18+ with Next.js (or Vite for a pure SPA).
*   **Language:** TypeScript (Strict mode for rigorous state definitions).
*   **Canvas Rendering Engine:** `React-Konva` (HTML5 Canvas wrapper for React) OR `tldraw` SDK OR `React Flow` (specifically optimized for nodes + arrows). *Recommendation for AI: Choose the one that best handles dynamic node generation and edge (arrow) connections.*
*   **State Management:** `Zustand` (for handling massive arrays of object coordinates without re-rendering the whole DOM).
*   **Styling:** Tailwind CSS (for UI chrome, floating menus, and dashboards) + Framer Motion (for bouncy micro-interactions).
*   **Storage:** LocalStorage (MVP) → IndexedDB (for larger images) → Backend DB (Phase 2).

### The Core Math (Viewport Transform)
The canvas operates on a "Scene Graph" model.
*   **Camera State:** `{ x: number, y: number, zoom: number }`
*   **World Coordinates:** The absolute position of an object in the infinite space.
*   **Screen Coordinates:** Where the object appears on the user's monitor.
*   *Formula:* `ScreenX = (WorldX - CameraX) * Zoom + ScreenWidth/2`

---

## 2. Application Flow & Screen Specifications

### A. The Hub (Main Menu)
**Path:** `/`
*   **UI/Vibe:** Dark charcoal background (`#1a1a1a`). Centered layout.
*   **Header:** "Canvaseru" logo with the tagline *"Your mind, unboxed."*
*   **Hero Action:** A large, inviting "+ New Canvas" button with a subtle purple-to-pink pulsing gradient.
*   **Recent Canvases Grid:** A masonry or 3-column grid showing past canvases.
    *   Each card shows: Thumbnail preview, Editable Title, "Last edited" timestamp.
    *   Hover state reveals a Delete (Trash) button.
*   **Logic:** Auto-saves constantly. No manual "Save" button exists in the app.

### B. The Infinite Canvas Editor
**Path:** `/canvas/{id}`
*   **UI/Vibe:** Full-screen, chromeless (no native scrollbars). Dark mode default (`#0a0a0a`).
*   **Background:** A dot-grid pattern (`#333333` dots, 20px spacing). The grid stays fixed during panning but scales during zooming to provide spatial awareness.
*   **Coordinates:** On load, the center of the screen is coordinate `(0,0)`.

---

## 3. The Elements (Nodes)

All elements can be selected, dragged, resized, and deleted. 

1.  **📌 Sticky Notes:**
    *   Default size: 200x200px. Slight rounded corners (4px).
    *   Colors: Yellow, Pink, Blue, Purple, Dark Gray.
    *   Behavior: Double-click to type. Text auto-scales or wraps to fit the container. Drop shadow increases on drag/hover to simulate lifting.
2.  **🔷 Shapes:**
    *   Types: Rectangle, Circle, Diamond (crucial for flowchart decision nodes), Pill.
    *   Visuals: Semi-transparent fill with a solid 2px stroke. 
3.  **📝 Free Text:**
    *   Transparent background. Used for titles or floating paragraphs.
    *   Scaling changes font-size rather than just stretching a box.
4.  **🖼️ Image Containers:**
    *   Drag-and-drop support from the OS.
    *   Renders with `object-fit: cover`.

---

## 4. The Arrow System (Edges & Connections) - *CRITICAL*

This is the most important feature for the "Organizer/Flowchart" aspect.

*   **Trigger:** User right-clicks an element and selects "Add Arrow" (or presses a hotkey).
*   **Interaction Flow:**
    1.  An arrow originates from the edge of the source element.
    2.  The user's cursor becomes a crosshair. The arrow "rubber-bands" (follows the cursor).
    3.  **Magnetic Snapping:** As the cursor nears *another* element, the arrow snaps to the nearest bounding box edge or anchor point (Top, Bottom, Left, Right) of the target element.
    4.  Clicking locks the connection.
*   **Dynamic Routing:** If Node A and Node B are connected, and the user drags Node A across the screen, the arrow dynamically stretches, rotates, and maintains the connection.
*   **Visuals:** 2px stroke, bezier curve (smooth) or orthogonal (stepped) lines. Solid arrowhead at the destination.

---

## 5. Controls & Interactions

### Navigation
*   **Pan:** Middle-mouse click + drag OR hold `Spacebar` + drag (cursor turns to a grabbing hand).
*   **Zoom:** Mouse scroll wheel (zooms *towards* the cursor's coordinates, not the center of the screen). Range: 10% to 500%.

### Context Menu (The "Magic" Menu)
Triggered by `Right-Click` on any element. A small glassmorphic popup appears:
*   Change Color (Grid of color swatches).
*   Change Text Size/Style.
*   Duplicate (`Ctrl/Cmd + D`).
*   **Add Arrow** (Triggers connection mode).
*   Bring to Front / Send to Back.
*   Delete (`Del / Backspace`).

*Right-clicking on empty canvas space allows quickly adding a new Sticky Note, Shape, or Text block at those exact coordinates.*

### Floating Toolbar (Bottom Center or Top Left)
A pill-shaped, glassmorphic floating menu containing:
*   Selection Tool (Cursor).
*   Pan Tool (Hand).
*   Add Sticky Note.
*   Add Shape (Dropdown: Rect/Circle/Diamond).
*   Add Text.
*   Add Arrow/Line.
*   Add Image.

---

## 6. Data Structure (Zustand Schema)

The AI should construct the state roughly like this to ensure clean serialization:

```typescript
interface CanvasState {
  id: string;
  title: string;
  camera: { x: number; y: number; zoom: number };
  nodes: Record<string, Node>; // Objects on canvas
  edges: Record<string, Edge>; // Arrows connecting objects
}

type Node = {
  id: string;
  type: 'sticky' | 'shape' | 'text' | 'image';
  shapeType?: 'rectangle' | 'circle' | 'diamond';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // Text or Image URL
  style: {
    backgroundColor: string;
    strokeColor?: string;
    fontSize?: number;
  };
  zIndex: number;
}

type Edge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string; // If null, the arrow is dangling
  sourceAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  targetAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  style: {
    color: string;
    thickness: number;
  };
}