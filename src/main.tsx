// 引擎層必須最先載入：DataLayer / GameCore / GameEngine / SyncManager… 掛上 globalThis
import './engine';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
