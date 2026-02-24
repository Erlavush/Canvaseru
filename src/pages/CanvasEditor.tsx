import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCanvasStore } from '../store/useCanvasStore';

export default function CanvasEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const initDoc  = useCanvasStore(s => s.initDoc);
  const doc      = useCanvasStore(s => id ? s.docs[id] : undefined);

  useEffect(() => {
    if (!id) { navigate('/'); return; }
    initDoc(id);
  }, [id]);

  if (!id || !doc) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
        Loading canvas…
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Toolbar placeholder — Phase 2 */}
      <div
        className="flex items-center gap-2 px-4"
        style={{ height: 52, background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>{doc.title}</span>
      </div>

      {/* Canvas viewport — Phase 2 */}
      <div
        className="flex-1 dot-grid flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <div style={{ opacity: 0.2, textAlign: 'center' }}>
          <p style={{ color: 'var(--text)', fontSize: 14 }}>Canvas editor — coming in Phase 2 🚧</p>
        </div>
      </div>
    </div>
  );
}
