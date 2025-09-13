
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage } from '../types';

interface ToastContextType {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const getBgColor = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'error': return 'bg-gradient-to-r from-red-500 to-pink-600';
      case 'info': return 'bg-gradient-to-r from-blue-500 to-purple-600';
    }
  };

  const getIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-times-circle';
        case 'info': return 'fa-info-circle';
    }
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div id="toast-container" className="fixed top-6 right-6 z-[100] space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 transition-all duration-300 animate-slide-in-right ${getBgColor(toast.type)}`}
          >
            <i className={`fas ${getIcon(toast.type)} text-xl`}></i>
            <span className="font-semibold">{toast.message}</span>
          </div>
        ))}
      </div>
       <style>{`
        @keyframes slide-in-right {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .animate-slide-in-right {
            animation: slide-in-right 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
    `}</style>
    </ToastContext.Provider>
  );
};