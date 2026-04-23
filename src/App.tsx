import React from 'react';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default App;