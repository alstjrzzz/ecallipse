import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { SipPhoneProvider } from './calls/SipPhoneContext';
import { PresetsProvider } from './presets/PresetsContext';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SipPhoneProvider>
          <PresetsProvider>
            <App />
          </PresetsProvider>
        </SipPhoneProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
