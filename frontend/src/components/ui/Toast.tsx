import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const toastStyles: Record<ToastType, { bg: string; icon: React.ElementType; iconColor: string }> = {
    success: { bg: 'bg-green-50 border-green-200', icon: CheckCircle, iconColor: 'text-green-600' },
    error: { bg: 'bg-red-50 border-red-200', icon: XCircle, iconColor: 'text-red-600' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600' },
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-600' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast container */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => {
                    const style = toastStyles[toast.type];
                    const Icon = style.icon;

                    return (
                        <div
                            key={toast.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-5 ${style.bg}`}
                        >
                            <Icon className={`h-5 w-5 ${style.iconColor}`} />
                            <span className="text-sm font-medium text-slate-800">{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="ml-2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};
