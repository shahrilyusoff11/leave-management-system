import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'secondary';
}

const Badge: React.FC<BadgeProps> = ({
    className,
    variant = 'default',
    children,
    ...props
}) => {
    const variants = {
        default: 'bg-slate-100 text-slate-800 border-slate-200',
        primary: 'bg-brand-50 text-brand-700 border-brand-200',
        secondary: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-red-50 text-red-700 border-red-200',
        outline: 'bg-transparent border-slate-200 text-slate-600'
    };

    return (
        <span
            className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
};

export { Badge };
