import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CanvasDoc, CanvasNode, CanvasEdge, Camera, NodeType, ShapeType,
} from '../types/canvas';
import { uid } from '../utils/uid';

// ─── Default styles per node type ─────────────────────
const DEFAULT_COLORS: Record<NodeType, string> = {
  sticky: '#1a1a00',
  shape:  'rgba(255,255,255,0.06)',
  text:   'transparent',
  image:  '#0a0a0a',
};

// ─── Store shape ───────────────────────────────────────
interface CanvasState {
  docs: Record<string, CanvasDoc>;

  // Selectors
  getDoc: (id: string) => CanvasDoc | undefined;

  // Canvas-level
  initDoc:    (id: string) => void;
  setCamera:  (id: string, cam: Camera) => void;
  touchDoc:   (id: string) => void;

  // Nodes
  addNode:    (canvasId: string, type: NodeType, x: number, y: number, shapeType?: ShapeType) => string;
  updateNode: (canvasId: string, nodeId: string, patch: Partial<CanvasNode>) => void;
  deleteNode: (canvasId: string, nodeId: string) => void;
  bringToFront: (canvasId: string, nodeId: string) => void;
  sendToBack:   (canvasId: string, nodeId: string) => void;

  // Edges
  addEdge:    (canvasId: string, edge: Omit<CanvasEdge, 'id'>) => string;
  updateEdge: (canvasId: string, edgeId: string, patch: Partial<CanvasEdge>) => void;
  deleteEdge: (canvasId: string, edgeId: string) => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      docs: {},

      getDoc: (id) => get().docs[id],

      initDoc: (id) => {
        if (get().docs[id]) return;
        const doc: CanvasDoc = {
          id,
          title: 'Untitled Canvas',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          camera: { x: 0, y: 0, zoom: 1 },
          nodes: {},
          edges: {},
        };
        set(s => ({ docs: { ...s.docs, [id]: doc } }));
      },

      setCamera: (id, cam) =>
        set(s => ({
          docs: { ...s.docs, [id]: { ...s.docs[id], camera: cam } },
        })),

      touchDoc: (id) =>
        set(s => ({
          docs: { ...s.docs, [id]: { ...s.docs[id], updatedAt: Date.now() } },
        })),

      addNode: (canvasId, type, x, y, shapeType) => {
        const nodeId = uid('node');
        const isText = type === 'text';
        const node: CanvasNode = {
          id: nodeId,
          type,
          shapeType,
          x, y,
          width:  isText ? 240 : 200,
          height: isText ? 60  : 200,
          content: type === 'text' ? 'Your text here' : '',
          style: {
            backgroundColor: DEFAULT_COLORS[type],
            fontSize: isText ? 24 : 14,
          },
          zIndex: Date.now(),
        };
        set(s => {
          const doc = s.docs[canvasId];
          if (!doc) return s;
          return {
            docs: {
              ...s.docs,
              [canvasId]: {
                ...doc,
                updatedAt: Date.now(),
                nodes: { ...doc.nodes, [nodeId]: node },
              },
            },
          };
        });
        return nodeId;
      },

      updateNode: (canvasId, nodeId, patch) =>
        set(s => {
          const doc = s.docs[canvasId];
          if (!doc) return s;
          const node = doc.nodes[nodeId];
          if (!node) return s;
          return {
            docs: {
              ...s.docs,
              [canvasId]: {
                ...doc,
                updatedAt: Date.now(),
                nodes: { ...doc.nodes, [nodeId]: { ...node, ...patch } },
              },
            },
          };
        }),

      deleteNode: (canvasId, nodeId) =>
        set(s => {
          const doc = s.docs[canvasId];
          if (!doc) return s;
          const { [nodeId]: _, ...rest } = doc.nodes;
          // also remove connected edges
          const edges = Object.fromEntries(
            Object.entries(doc.edges).filter(
              ([, e]) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
            )
          );
          return {
            docs: {
              ...s.docs,
              [canvasId]: { ...doc, updatedAt: Date.now(), nodes: rest, edges },
            },
          };
        }),

      bringToFront: (canvasId, nodeId) =>
        set(s => {
          const doc = s.docs[canvasId];
          if (!doc) return s;
          const maxZ = Math.max(0, ...Object.values(doc.nodes).map(n => n.zIndex));
          const node = doc.nodes[nodeId];
          if (!node) return s;
          return {
            docs: {
              ...s.docs,
              [canvasId]: {
                ...doc,
                nodes: { ...doc.nodes, [nodeId]: { ...node, zIndex: maxZ + 1 } },
              },
            },
          };
        }),

      sendToBack: (canvasId, nodeId) =>
        set(s => {
          const doc = s.docs[canvasId];
          if (!doc) return s;
          const minZ = Math.min(0, ...Object.values(doc.nodes).map(n => n.zIndex));
          const node = doc.nodes[nodeId];
          if (!node) return s;
          return {
            docs: {
              ...s.docs,
              [canvasId]: {
                ...doc,
                nodes: { ...doc.nodes, [nodeId]: { ...node, zIndex: minZ - 1 } },
              },
            },
          };
        }),

      addEdge: (canvasId, edge) => {
        const edgeId = uid('edge');
        set(s => {
          const doc = s.docs[canvasId];
          if (!doc) return s;
          return {
            docs: {
              ...s.docs,
              [canvasId]: {
                ...doc,
                updatedAt: Date.now(),
                edges: { ...doc.edges, [edgeId]: { ...edge, id: edgeId } },
              },
            },
          };
        });
        return edgeId;
      },

      updateEdge: (canvasId, edgeId, patch) =>
        set(s => {
          const doc = s.docs[canvasId];
          if (!doc) return s;
          const edge = doc.edges[edgeId];
          if (!edge) return s;
          return {
            docs: {
              ...s.docs,
              [canvasId]: {
                ...doc,
                edges: { ...doc.edges, [edgeId]: { ...edge, ...patch } },
              },
            },
          };
        }),

      deleteEdge: (canvasId, edgeId) =>
        set(s => {
          const doc = s.docs[canvasId];
          if (!doc) return s;
          const { [edgeId]: _, ...rest } = doc.edges;
          return {
            docs: {
              ...s.docs,
              [canvasId]: { ...doc, updatedAt: Date.now(), edges: rest },
            },
          };
        }),
    }),
    { name: 'canvaseru-docs' }
  )
);
