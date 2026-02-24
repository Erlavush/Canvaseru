import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { useAppStore } from './store/useAppStore.ts';

// Apply persisted theme before first render to avoid flash
const theme = useAppStore.getState().theme;
document.documentElement.setAttribute('data-theme', theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
