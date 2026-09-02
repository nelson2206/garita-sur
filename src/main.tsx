import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { SesionProvider } from './lib/auth';
import App from './App';
import './styles.css';

if (import.meta.env.MODE !== 'artifact') registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <SesionProvider>
        <App />
      </SesionProvider>
    </HashRouter>
  </StrictMode>,
);
