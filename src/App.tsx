import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import Hub from './pages/Hub';
import CanvasEditor from './pages/CanvasEditor';

export default function App() {
  const theme = useAppStore(s => s.theme);

  // Sync theme attr on mount and every change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/canvas/:id" element={<CanvasEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
