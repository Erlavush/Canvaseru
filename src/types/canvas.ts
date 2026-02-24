// ─── Node Types ───────────────────────────────────────

export type NodeType = 'sticky' | 'shape' | 'text' | 'image';
export type ShapeType = 'rectangle' | 'circle' | 'diamond';

export interface NodeStyle {
  backgroundColor: string;
  strokeColor?: string;
  fontSize?: number;
  textColor?: string;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  shapeType?: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;          // text content or image data-URL
  style: NodeStyle;
  zIndex: number;
}

// ─── Edge Types ───────────────────────────────────────

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';
export type EdgeStyle  = 'bezier' | 'straight' | 'orthogonal';
export type ArrowHead  = 'arrow' | 'open' | 'none' | 'dot' | 'diamond';

export interface EdgeStyleProps {
  edgeStyle:   EdgeStyle;
  arrowHead:   ArrowHead;   // at destination
  startArrow:  ArrowHead;   // at source (default: none)
  color:       string;
  thickness:   number;
  dashed:      boolean;
  label?:      string;
}

export interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string | null;  // null = dangling (being drawn)
  sourceAnchor: AnchorSide;
  targetAnchor: AnchorSide;
  style: EdgeStyleProps;
}

// ─── Camera ───────────────────────────────────────────

export interface Camera {
  x:    number;
  y:    number;
  zoom: number;
}

// ─── Canvas Document ──────────────────────────────────

export interface CanvasDoc {
  id:        string;
  title:     string;
  createdAt: number;
  updatedAt: number;
  camera:    Camera;
  nodes:     Record<string, CanvasNode>;
  edges:     Record<string, CanvasEdge>;
}

// ─── App-level ────────────────────────────────────────

export type Theme = 'dark' | 'light';

export interface CanvasMeta {
  id:        string;
  title:     string;
  updatedAt: number;
  thumbnail?: string;  // base64 snapshot, future
}
