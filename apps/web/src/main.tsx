/*
 * Fontlar npm paketinden gelir ve build'e gomulur.
 * Google Fonts gibi bir CDN'e ASLA baglanilmaz — sistem internetsiz calisir.
 */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

const container = document.getElementById('root');
if (!container) throw new Error('#root bulunamadı.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
