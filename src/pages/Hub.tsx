import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

// ─── Helpers ──────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Canvas Card ──────────────────────────────────────
function CanvasCard({ id, title, updatedAt }: { id: string; title: string; updatedAt: number }) {
  const navigate   = useNavigate();
  const deleteCanvas = useAppStore(s => s.deleteCanvas);
  const renameCanvas = useAppStore(s => s.renameCanvas);
  const [editing, setEditing] = React.useState(false);
  const [draft,   setDraft]   = React.useState(title);
  const [hovered, setHovered] = React.useState(false);

  const commitRename = () => {
    setEditing(false);
    if (draft.trim()) renameCanvas(id, draft.trim());
    else setDraft(title);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-xl border cursor-pointer group overflow-hidden"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.35)' : 'var(--shadow)',
        transition: 'box-shadow 0.2s',
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()   => setHovered(false)}
      onClick={() => navigate(`/canvas/${id}`)}
    >
      {/* Thumbnail area */}
      <div
        className="w-full flex items-center justify-center"
        style={{ height: 140, background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.15 }}>
          <rect x="4" y="4" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2"/>
          <circle cx="14" cy="14" r="3" fill="currentColor"/>
          <path d="M4 28l8-7 6 6 5-4 13 9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1">
        {editing ? (
          <input
            className="text-sm font-semibold w-full bg-transparent outline-none border-b"
            style={{ borderColor: 'var(--accent)', color: 'var(--text)' }}
            value={draft}
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text)' }}
            onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
          >
            {title}
          </p>
        )}
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {timeAgo(updatedAt)}
        </p>
      </div>

      {/* Delete button (hover) */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            onClick={e => { e.stopPropagation(); deleteCanvas(id); }}
            title="Delete canvas"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 16 16">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Hub Page ─────────────────────────────────────────
export default function Hub() {
  const navigate      = useNavigate();
  const canvases      = useAppStore(s => s.canvases);
  const createCanvas  = useAppStore(s => s.createCanvas);
  const theme         = useAppStore(s => s.theme);
  const toggleTheme   = useAppStore(s => s.toggleTheme);

  const handleNew = () => {
    const id = createCanvas();
    navigate(`/canvas/${id}`);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-10 py-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Canvaseru</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Your mind, unboxed.</p>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </header>

      {/* New Canvas hero button */}
      <div className="px-10 mb-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNew}
          className="relative overflow-hidden rounded-2xl w-full py-5 font-semibold text-base tracking-wide"
          style={{
            background: theme === 'dark'
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.06)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          {/* Animated gradient glow */}
          <motion.div
            animate={{ x: ['0%', '100%', '0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.15), transparent)',
            }}
          />
          <span className="relative flex items-center justify-center gap-2">
            <svg width="18" height="18" fill="none" viewBox="0 0 20 20">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New Canvas
          </span>
        </motion.button>
      </div>

      {/* Canvas grid */}
      <div className="flex-1 overflow-y-auto px-10 pb-10">
        {canvases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <svg width="48" height="48" fill="none" viewBox="0 0 48 48">
              <rect x="6" y="6" width="36" height="36" rx="6" stroke="currentColor" strokeWidth="2"/>
              <path d="M24 16v16M16 24h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium">No canvases yet — create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {canvases.map(c => (
                <CanvasCard key={c.id} {...c} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
