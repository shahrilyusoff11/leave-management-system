import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { Button } from './Button';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

export interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'success' | 'info';
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info',
    isLoading = false,
}) => {

    // Prevent scrolling when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle className="h-6 w-6 text-red-600" />;
            case 'warning': return <AlertTriangle className="h-6 w-6 text-amber-600" />;
            case 'success': return <CheckCircle className="h-6 w-6 text-green-600" />;
            default: return <Info className="h-6 w-6 text-blue-600" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'danger': return 'bg-red-100';
            case 'warning': return 'bg-amber-100';
            case 'success': return 'bg-green-100';
            default: return 'bg-blue-100';
        }
    };



    const confirmButtonClass = () => {
        switch (type) {
            case 'danger': return 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20';
            case 'warning': return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20';
            case 'success': return 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20';
            default: return 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20';
        }
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className={cn("flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center", getIconBg())}>
                                {getIcon()}
                            </div>
                            <div className="flex-1 pt-1">
                                <h3 className="text-lg font-semibold text-slate-900 leading-6">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                    {message}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-500 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                                {cancelText}
                            </Button>
                            <Button
                                className={cn("shadow-lg transition-all duration-200", confirmButtonClass())}
                                onClick={onConfirm}
                                isLoading={isLoading}
                            >
                                {confirmText}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export { ConfirmationModal };
