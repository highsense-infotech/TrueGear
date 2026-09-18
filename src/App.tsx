import React from 'react';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/common/ErrorBoundary';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CurrencyProvider>
        {/* Last line of defence, INSIDE the providers so a caught error doesn't
            tear down auth/currency state. MainLayout carries a second, inner
            boundary that keeps the app chrome usable for the common case of a
            single page failing; this one covers everything above that. */}
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        {/* Outside the boundary: toasts must still be reachable if the routed
            tree is showing the fallback. */}
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default App;