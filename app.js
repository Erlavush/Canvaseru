/* ====================================================
   CANVASERU — Infinite Canvas App
   ==================================================== */

'use strict';

// ─── State ────────────────────────────────────────────
const state = {
  // Camera transform
  panX: 0,
  panY: 0,
  zoom: 1,

  // Interaction
  tool: 'select',      // 'select' | 'hand'
  isPanning: false,
  panStart: null,

  // Selected widgets
  selectedIds: new Set(),

  // Lasso selection
  lasso: null,
  lassoEl: null,

  // Drag state
  dragging: null,      // { id, startX, startY, origX, origY }

  // Resize state
  resizing: null,      // { id, handle, startX, startY, origW, origH, origX, origY }

  // Widgets map
  widgets: new Map(),
  zCounter: 10,
};

const ZOOM_MIN  = 0.1;
const ZOOM_MAX  = 4;
const ZOOM_STEP = 0.1;

// ─── DOM Refs ─────────────────────────────────────────
const viewport    = document.getElementById('viewport');
const world       = document.getElementById('canvas-world');
const zoomLabel   = document.getElementById('zoom-label');
const ctxMenu     = document.getElementById('context-menu');
const colorPalette= document.getElementById('color-palette');
const toastCont   = document.getElementById('toast-container');
const imageInput  = document.getElementById('image-input');

// ─── Helpers ──────────────────────────────────────────
function uid() {
  return 'w-' + Math.random().toString(36).slice(2, 9);
}

function applyTransform() {
  world.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  zoomLabel.textContent = Math.round(state.zoom * 100) + '%';

  // Update dot-grid background offset
  viewport.style.backgroundPosition =
    `${state.panX % state.zoom * 28}px ${state.panY % state.zoom * 28}px`;

  // Precisely shift dot grid with pan + zoom
  const gap  = 28 * state.zoom;
  const offX = ((state.panX % gap) + gap) % gap;
  const offY = ((state.panY % gap) + gap) % gap;
  viewport.style.backgroundSize = `${gap}px ${gap}px`;
  viewport.style.backgroundPosition = `${offX}px ${offY}px`;
}

function viewportToWorld(vx, vy) {
  return {
    x: (vx - state.panX) / state.zoom,
    y: (vy - state.panY) / state.zoom,
  };
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastCont.appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

// ─── Widget Creation ──────────────────────────────────
function createWidget({ type='note', x=200, y=200, w=260, h=200, color='#1e1e2e', content='' } = {}) {
  const id  = uid();
  const z   = ++state.zCounter;

  const data = { id, type, x, y, w, h, color, z, content };
  state.widgets.set(id, data);

  const el = buildWidgetEl(data);
  world.appendChild(el);

  selectOnly(id);
  return id;
}

function buildWidgetEl(data) {
  const { id, type, x, y, w, h, color, z } = data;

  const el = document.createElement('div');
  el.className = `widget widget-${type}`;
  el.dataset.id = id;
  el.style.cssText = `
    left:${x}px; top:${y}px; width:${w}px; height:${h}px;
    background:${color}; z-index:${z};
  `;

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'widget-header';
  hdr.innerHTML = `
    <div class="widget-dots">
      <span></span><span></span><span></span>
    </div>
    <span class="widget-title">${typeLabel(type)}</span>
  `;

  // Body
  const body = document.createElement('div');
  body.className = 'widget-body';
  body.appendChild(buildWidgetContent(type, data));

  // Resize handles
  const handles = ['nw','n','ne','e','se','s','sw','w'];
  handles.forEach(dir => {
    const h = document.createElement('div');
    h.className = `resize-handle ${dir}`;
    h.dataset.dir = dir;
    el.appendChild(h);
  });

  el.appendChild(hdr);
  el.appendChild(body);

  bindWidgetEvents(el, id);
  return el;
}

function buildWidgetContent(type, data) {
  if (type === 'note') {
    const ta = document.createElement('textarea');
    ta.placeholder = 'Type a note…';
    ta.value = data.content || '';
    ta.addEventListener('input', () => {
      const d = state.widgets.get(data.id);
      if (d) d.content = ta.value;
    });
    ta.addEventListener('mousedown', e => e.stopPropagation());
    return ta;
  }

  if (type === 'text') {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.innerHTML = data.content || 'Double-click to edit';
    div.addEventListener('mousedown', e => e.stopPropagation());
    div.addEventListener('input', () => {
      const d = state.widgets.get(data.id);
      if (d) d.content = div.innerHTML;
    });
    return div;
  }

  if (type === 'image') {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';

    if (data.content) {
      const img = document.createElement('img');
      img.src = data.content;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      wrap.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'widget-image-placeholder';
      ph.innerHTML = `
        <svg width="40" height="40" fill="none" viewBox="0 0 40 40">
          <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="14" cy="17" r="3" fill="currentColor" opacity="0.5"/>
          <path d="M4 26l8-7 7 7 5-4 12 10" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" opacity="0.5"/>
        </svg>
        <span>Click to add image</span>
      `;
      ph.addEventListener('click', () => {
        imageInput._targetId = data.id;
        imageInput.click();
      });
      wrap.appendChild(ph);
    }
    return wrap;
  }

  if (type === 'box') {
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
    div.innerHTML = `<span style="font-size:11px;color:rgba(255,255,255,0.2);">Box</span>`;
    return div;
  }

  return document.createElement('div');
}

function typeLabel(type) {
  return { note:'Note', text:'Text', image:'Image', box:'Box' }[type] || type;
}

// ─── Widget DOM Events ────────────────────────────────
function bindWidgetEvents(el, id) {
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;

    // Resize handle
    const handle = e.target.closest('.resize-handle');
    if (handle) {
      e.preventDefault(); e.stopPropagation();
      startResize(id, handle.dataset.dir, e);
      return;
    }

    // Don't drag if clicking inside textarea / contenteditable
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'textarea') return;
    const ce = e.target.closest('[contenteditable="true"]');
    if (ce) return;

    e.preventDefault(); e.stopPropagation();

    // Multi-select with Shift
    if (e.shiftKey) {
      if (state.selectedIds.has(id)) {
        deselect(id);
      } else {
        addSelect(id);
      }
    } else {
      if (!state.selectedIds.has(id)) selectOnly(id);
      bringToFront(id);
      startDrag(id, e);
    }
  });

  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!state.selectedIds.has(id)) selectOnly(id);
    showContextMenu(e.clientX, e.clientY, id);
  });
}

// ─── Selection ────────────────────────────────────────
function selectOnly(id) {
  state.selectedIds.forEach(eid => {
    const w = world.querySelector(`[data-id="${eid}"]`);
    if (w) w.classList.remove('selected');
  });
  state.selectedIds.clear();
  addSelect(id);
  showPalette();
}

function addSelect(id) {
  state.selectedIds.add(id);
  const el = world.querySelector(`[data-id="${id}"]`);
  if (el) el.classList.add('selected');
  showPalette();
}

function deselect(id) {
  state.selectedIds.delete(id);
  const el = world.querySelector(`[data-id="${id}"]`);
  if (el) el.classList.remove('selected');
  if (state.selectedIds.size === 0) hidePalette();
}

function clearSelection() {
  state.selectedIds.forEach(id => {
    const el = world.querySelector(`[data-id="${id}"]`);
    if (el) el.classList.remove('selected');
  });
  state.selectedIds.clear();
  hidePalette();
}

// ─── Color Palette ────────────────────────────────────
function showPalette() {
  if (state.selectedIds.size === 0) return;
  colorPalette.classList.add('visible');
  const firstId = [...state.selectedIds][0];
  const data = state.widgets.get(firstId);
  if (data) {
    document.querySelectorAll('.palette-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === data.color);
    });
  }
}
function hidePalette() { colorPalette.classList.remove('visible'); }

document.querySelectorAll('.palette-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    const color = swatch.dataset.color;
    state.selectedIds.forEach(id => {
      const data = state.widgets.get(id);
      const el   = world.querySelector(`[data-id="${id}"]`);
      if (data && el) {
        data.color = color;
        el.style.background = color;
      }
    });
    document.querySelectorAll('.palette-swatch').forEach(s =>
      s.classList.toggle('active', s.dataset.color === color));
  });
});

// ─── Drag Widgets ─────────────────────────────────────
function startDrag(id, e) {
  const data = state.widgets.get(id);
  state.dragging = {
    id,
    startX: e.clientX,
    startY: e.clientY,
    origX: data.x,
    origY: data.y,
  };
}

function onMouseMove(e) {
  // Panning
  if (state.isPanning) {
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    state.panX += dx;
    state.panY += dy;
    state.panStart = { x: e.clientX, y: e.clientY };
    applyTransform();
    return;
  }

  // Lasso
  if (state.lasso) {
    const rect = state.lasso;
    rect.x2 = e.clientX;
    rect.y2 = e.clientY;
    updateLassoEl(rect);
    return;
  }

  // Dragging widget(s)
  if (state.dragging) {
    const { id, startX, startY, origX, origY } = state.dragging;
    const dx = (e.clientX - startX) / state.zoom;
    const dy = (e.clientY - startY) / state.zoom;

    // Move all selected if multiple
    if (state.selectedIds.size > 1) {
      state.selectedIds.forEach(sid => {
        const sd = state.widgets.get(sid);
        if (!sd) return;
        const sel = world.querySelector(`[data-id="${sid}"]`);
        if (!sd._dragOrigX) { sd._dragOrigX = sd.x; sd._dragOrigY = sd.y; }
        sd.x = sd._dragOrigX + dx;
        sd.y = sd._dragOrigY + dy;
        if (sel) { sel.style.left = sd.x + 'px'; sel.style.top = sd.y + 'px'; }
      });
    } else {
      const data = state.widgets.get(id);
      const el   = world.querySelector(`[data-id="${id}"]`);
      if (data && el) {
        data.x = origX + dx;
        data.y = origY + dy;
        el.style.left = data.x + 'px';
        el.style.top  = data.y + 'px';
      }
    }
    return;
  }

  // Resizing
  if (state.resizing) {
    const { id, handle, startX, startY, origW, origH, origX, origY } = state.resizing;
    const dx = (e.clientX - startX) / state.zoom;
    const dy = (e.clientY - startY) / state.zoom;
    const data = state.widgets.get(id);
    const el   = world.querySelector(`[data-id="${id}"]`);
    if (!data || !el) return;

    let { x, y, w, h } = { x: origX, y: origY, w: origW, h: origH };

    if (handle.includes('e')) w = Math.max(80, origW + dx);
    if (handle.includes('s')) h = Math.max(50, origH + dy);
    if (handle.includes('w')) { w = Math.max(80, origW - dx); x = origX + (origW - w); }
    if (handle.includes('n')) { h = Math.max(50, origH - dy); y = origY + (origH - h); }

    data.x = x; data.y = y; data.w = w; data.h = h;
    el.style.left   = x + 'px'; el.style.top    = y + 'px';
    el.style.width  = w + 'px'; el.style.height = h + 'px';
    return;
  }
}

function onMouseUp(e) {
  if (state.dragging) {
    // Clear stored originals used in multi-drag
    state.selectedIds.forEach(sid => {
      const sd = state.widgets.get(sid);
      if (sd) { delete sd._dragOrigX; delete sd._dragOrigY; }
    });
    state.dragging = null;
  }
  if (state.resizing) { state.resizing = null; }

  if (state.isPanning) {
    state.isPanning = false;
    state.panStart  = null;
    viewport.classList.remove('panning');
  }

  if (state.lasso) {
    finalizeLasso();
  }
}

// ─── Resize ───────────────────────────────────────────
function startResize(id, handle, e) {
  const data = state.widgets.get(id);
  state.resizing = {
    id, handle,
    startX: e.clientX, startY: e.clientY,
    origW: data.w, origH: data.h,
    origX: data.x, origY: data.y,
  };
}

// ─── Panning ──────────────────────────────────────────
function startPan(e) {
  state.isPanning = true;
  state.panStart  = { x: e.clientX, y: e.clientY };
  viewport.classList.add('panning');
}

// ─── Lasso Selection ──────────────────────────────────
function startLasso(e) {
  const wp = viewportToWorld(e.clientX, e.clientY);
  state.lasso = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY, wx: wp.x, wy: wp.y };

  const el = document.createElement('div');
  el.className = 'selection-rect';
  viewport.appendChild(el);
  state.lassoEl = el;
}

function updateLassoEl(rect) {
  const minX = Math.min(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const w    = Math.abs(rect.x2 - rect.x1);
  const h    = Math.abs(rect.y2 - rect.y1);
  const el   = state.lassoEl;
  el.style.left   = minX + 'px'; el.style.top    = minY + 'px';
  el.style.width  = w   + 'px'; el.style.height = h   + 'px';
}

function finalizeLasso() {
  const rect = state.lasso;
  if (state.lassoEl) state.lassoEl.remove();
  state.lassoEl = null;

  const vMinX = Math.min(rect.x1, rect.x2);
  const vMinY = Math.min(rect.y1, rect.y2);
  const vMaxX = Math.max(rect.x1, rect.x2);
  const vMaxY = Math.max(rect.y1, rect.y2);

  // Only select if user dragged meaningfully
  if (Math.abs(vMaxX - vMinX) < 5 && Math.abs(vMaxY - vMinY) < 5) {
    state.lasso = null;
    return;
  }

  clearSelection();
  state.widgets.forEach((data, id) => {
    // Widget corners in viewport space
    const wx1 = data.x * state.zoom + state.panX;
    const wy1 = data.y * state.zoom + state.panY;
    const wx2 = wx1 + data.w * state.zoom;
    const wy2 = wy1 + data.h * state.zoom;

    if (wx2 > vMinX && wx1 < vMaxX && wy2 > vMinY && wy1 < vMaxY) {
      addSelect(id);
    }
  });

  state.lasso = null;
  if (state.selectedIds.size > 0) showPalette();
}

// ─── Zoom ─────────────────────────────────────────────
function zoomBy(factor, cx, cy) {
  // cx, cy are viewport-space pivot point
  const prevZoom = state.zoom;
  state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, state.zoom * factor));

  // Adjust pan so the point under cursor stays fixed
  state.panX = cx - (cx - state.panX) * (state.zoom / prevZoom);
  state.panY = cy - (cy - state.panY) * (state.zoom / prevZoom);
  applyTransform();
}

function zoomTo(targetZoom) {
  const cx = viewport.clientWidth  / 2;
  const cy = viewport.clientHeight / 2;
  zoomBy(targetZoom / state.zoom, cx, cy);
}

// ─── Bring/Send z-order ───────────────────────────────
function bringToFront(id) {
  const data = state.widgets.get(id);
  const el   = world.querySelector(`[data-id="${id}"]`);
  if (data && el) {
    data.z = ++state.zCounter;
    el.style.zIndex = data.z;
  }
}

function sendToBack(id) {
  const data = state.widgets.get(id);
  const el   = world.querySelector(`[data-id="${id}"]`);
  if (data && el) {
    data.z = 1;
    el.style.zIndex = 1;
  }
}

// ─── Delete ───────────────────────────────────────────
function deleteSelected() {
  state.selectedIds.forEach(id => {
    state.widgets.delete(id);
    const el = world.querySelector(`[data-id="${id}"]`);
    if (el) el.remove();
  });
  state.selectedIds.clear();
  hidePalette();
  hideContextMenu();
}

// ─── Context Menu ─────────────────────────────────────
function showContextMenu(x, y, id) {
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top  = y + 'px';
  ctxMenu.classList.add('visible');
  ctxMenu._targetId = id;
}
function hideContextMenu() { ctxMenu.classList.remove('visible'); }

document.getElementById('ctx-bring-front').addEventListener('click', () => {
  if (ctxMenu._targetId) bringToFront(ctxMenu._targetId);
  hideContextMenu();
});
document.getElementById('ctx-send-back').addEventListener('click', () => {
  if (ctxMenu._targetId) sendToBack(ctxMenu._targetId);
  hideContextMenu();
});
document.getElementById('ctx-delete').addEventListener('click', () => {
  deleteSelected();
});

// ─── Viewport Events ──────────────────────────────────
viewport.addEventListener('mousedown', e => {
  hideContextMenu();

  if (e.button === 1 || (e.button === 0 && state.tool === 'hand')) {
    e.preventDefault();
    startPan(e);
    return;
  }

  if (e.button === 0 && state.tool === 'select') {
    // Clicked on empty canvas
    if (e.target === viewport || e.target === world) {
      clearSelection();
      startLasso(e);
    }
  }
});

viewport.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);

// Zoom with mouse wheel
viewport.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
  const rect   = viewport.getBoundingClientRect();
  zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

// Spacebar → temporary hand mode
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
    e.preventDefault();
    viewport.classList.add('hand-mode');
    state._spaceHeld = true;
    // Temporary hand when space held in select mode
    if (state.tool === 'select') state._prevTool = state.tool;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
      if (state.selectedIds.size > 0) deleteSelected();
    }
  }

  // Keyboard zoom
  if (e.ctrlKey && e.key === '=') { e.preventDefault(); zoomTo(state.zoom + 0.1); }
  if (e.ctrlKey && e.key === '-') { e.preventDefault(); zoomTo(state.zoom - 0.1); }
  if (e.ctrlKey && e.key === '0') { e.preventDefault(); zoomTo(1); }

  // Shortcuts → shortcut for tools
  if (!e.ctrlKey) {
    if (e.key === 'v' || e.key === 'V') setTool('select');
    if (e.key === 'h' || e.key === 'H') setTool('hand');
  }
});

window.addEventListener('keyup', e => {
  if (e.code === 'Space') {
    viewport.classList.remove('hand-mode');
    state._spaceHeld = false;
    if (state._prevTool) { setTool(state._prevTool); state._prevTool = null; }
    if (state.isPanning) { state.isPanning = false; viewport.classList.remove('panning'); }
  }
});

viewport.addEventListener('mousemove', e => {
  // Override panning when space held
  if (state._spaceHeld && !state.isPanning && !state.dragging) {
    if (e.buttons === 1) startPan(e);
  }
});

// Middle mouse drag pan (also handled above via button===1)
viewport.addEventListener('auxclick', e => {
  if (e.button === 1) e.preventDefault();
});

// Double-click on canvas → add note
viewport.addEventListener('dblclick', e => {
  if (e.target !== viewport && e.target !== world) return;
  const wp = viewportToWorld(e.clientX, e.clientY);
  createWidget({ type: 'note', x: wp.x - 130, y: wp.y - 100 });
  toast('Note added! Double-click canvas anytime to add more.');
});

// ─── Toolbar Tool Buttons ─────────────────────────────
function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
  viewport.classList.toggle('hand-mode', tool === 'hand');
}

document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

// Add widget buttons
document.getElementById('add-note').addEventListener('click', () => {
  const cx = viewport.clientWidth  / 2;
  const cy = viewport.clientHeight / 2;
  const wp = viewportToWorld(cx, cy);
  createWidget({ type: 'note', x: wp.x - 130, y: wp.y - 100 });
  toast('Sticky note added!');
});

document.getElementById('add-text').addEventListener('click', () => {
  const cx = viewport.clientWidth  / 2;
  const cy = viewport.clientHeight / 2;
  const wp = viewportToWorld(cx, cy);
  createWidget({ type: 'text', x: wp.x - 100, y: wp.y - 40, w: 240, h: 80, color: 'transparent' });
  toast('Text block added!');
});

document.getElementById('add-image').addEventListener('click', () => {
  const cx = viewport.clientWidth  / 2;
  const cy = viewport.clientHeight / 2;
  const wp = viewportToWorld(cx, cy);
  createWidget({ type: 'image', x: wp.x - 150, y: wp.y - 120, w: 300, h: 240, color: '#0d0d1a' });
});

document.getElementById('add-box').addEventListener('click', () => {
  const cx = viewport.clientWidth  / 2;
  const cy = viewport.clientHeight / 2;
  const wp = viewportToWorld(cx, cy);
  createWidget({ type: 'box', x: wp.x - 100, y: wp.y - 75, w: 200, h: 150, color: 'rgba(124,58,237,0.15)' });
  toast('Box added!');
});

// Zoom buttons
document.getElementById('zoom-in').addEventListener('click', () => zoomTo(state.zoom + 0.1));
document.getElementById('zoom-out').addEventListener('click', () => zoomTo(state.zoom - 0.1));
document.getElementById('zoom-fit').addEventListener('click', () => {
  state.zoom = 1; state.panX = 0; state.panY = 0; applyTransform();
  toast('View reset');
});

// Image file input
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;
  const id   = imageInput._targetId;
  const data = state.widgets.get(id);
  const el   = world.querySelector(`[data-id="${id}"]`);
  if (!data || !el) return;

  const reader = new FileReader();
  reader.onload = ev => {
    data.content = ev.target.result;
    const body = el.querySelector('.widget-body');
    body.innerHTML = '';
    const img = document.createElement('img');
    img.src = data.content;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:0 0 8px 8px;';
    body.appendChild(img);
  };
  reader.readAsDataURL(file);
  imageInput.value = '';
});

// Hide context menu on any click elsewhere
document.addEventListener('click', e => {
  if (!ctxMenu.contains(e.target)) hideContextMenu();
});

// ─── Touch Support (basic pan/zoom) ───────────────────
let lastTouches = null;
viewport.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
  }
});

viewport.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 2 && lastTouches) {
    const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };

    const prevDist = Math.hypot(lastTouches[1].x - lastTouches[0].x, lastTouches[1].y - lastTouches[0].y);
    const curDist  = Math.hypot(t2.x - t1.x, t2.y - t1.y);
    const factor   = curDist / prevDist;

    const midX = (t1.x + t2.x) / 2;
    const midY = (t1.y + t2.y) / 2;
    zoomBy(factor, midX, midY);

    const panDX = ((t1.x + t2.x) - (lastTouches[0].x + lastTouches[1].x)) / 2;
    const panDY = ((t1.y + t2.y) - (lastTouches[0].y + lastTouches[1].y)) / 2;
    state.panX += panDX;
    state.panY += panDY;
    applyTransform();

    lastTouches = [t1, t2];
  }
}, { passive: false });

viewport.addEventListener('touchend', () => { lastTouches = null; });

// ─── Init ─────────────────────────────────────────────
(function init() {
  // Center the canvas
  state.panX = viewport.clientWidth  / 2 - 400;
  state.panY = viewport.clientHeight / 2 - 280;
  applyTransform();

  // Seed with a couple of welcome widgets
  createWidget({
    type: 'note', x: 80, y: 60, w: 280, h: 180,
    color: '#1e1e2e',
    content: '👋 Welcome to Canvaseru!\n\nThis is your infinite canvas.\n\n• Drag to move\n• Scroll to zoom\n• Resize from corners\n• Double-click canvas to add note',
  });
  createWidget({
    type: 'text', x: 420, y: 70, w: 320, h: 80,
    color: 'transparent',
    content: 'Your ideas, your space.',
  });
  createWidget({
    type: 'box', x: 420, y: 180, w: 200, h: 120,
    color: 'rgba(37,99,235,0.18)',
  });
  createWidget({
    type: 'note', x: 420, y: 320, w: 240, h: 150,
    color: '#1a1a2e',
    content: '📌 Tips:\nH = Hand tool\nV = Select tool\nDel = Delete\nCtrl+Scroll = Zoom',
  });

  clearSelection();
  toast('Welcome to Canvaseru ✨');
})();
