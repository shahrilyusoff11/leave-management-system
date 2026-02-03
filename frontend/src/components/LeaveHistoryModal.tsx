import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { History, X, CheckCircle, XCircle, Clock, MessageSquare, AlertTriangle, Send } from 'lucide-react';
import api from '../services/api';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';

interface ChronologyEntry {
    id: string;
    action: string;
    actor: {
        first_name: string;
        last_name: string;
        email: string;
    };
    comment: string;
    created_at: string;
}

interface LeaveHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestId: string | null;
    leaveType?: string;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    submitted: { icon: Send, color: 'text-blue-600 bg-blue-100', label: 'Submitted' },
    approved: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Approved' },
    rejected: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Rejected' },
    escalated: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-100', label: 'Escalated' },
    commented: { icon: MessageSquare, color: 'text-slate-600 bg-slate-100', label: 'Commented' },
    modified: { icon: Clock, color: 'text-indigo-600 bg-indigo-100', label: 'Modified' },
    cancelled: { icon: X, color: 'text-slate-600 bg-slate-100', label: 'Cancelled' },
};

const LeaveHistoryModal: React.FC<LeaveHistoryModalProps> = ({ isOpen, onClose, requestId, leaveType }) => {
    const [history, setHistory] = useState<ChronologyEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && requestId) {
            fetchHistory();
        }
    }, [isOpen, requestId]);

    const fetchHistory = async () => {
        if (!requestId) return;
        setLoading(true);
        try {
            const response = await api.get(`/leave-requests/${requestId}/chronology`);
            setHistory(response.data || []);
        } catch (error) {
            console.error("Failed to fetch history", error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const getActionConfig = (action: string) => {
        return actionConfig[action] || { icon: Clock, color: 'text-slate-600 bg-slate-100', label: action };
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Leave Request History${leaveType ? ` - ${leaveType}` : ''}`}>
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p>No history found for this request</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-slate-200"></div>

                        <div className="space-y-4">
                            {history.map((entry) => {
                                const config = getActionConfig(entry.action);
                                const Icon = config.icon;

                                return (
                                    <div key={entry.id} className="relative flex gap-4">
                                        {/* Icon */}
                                        <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.color} flex items-center justify-center ring-4 ring-white`}>
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 bg-slate-50 rounded-lg p-3 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <Badge variant="secondary" className="capitalize">
                                                    {config.label}
                                                </Badge>
                                                <span className="text-xs text-slate-500">
                                                    {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-900">
                                                {entry.actor?.first_name} {entry.actor?.last_name}
                                            </p>
                                            {entry.comment && (
                                                <p className="text-sm text-slate-600 mt-1 italic">
                                                    "{entry.comment}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default LeaveHistoryModal;
