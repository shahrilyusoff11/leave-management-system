import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

interface AuditLog {
    id: string;
    method: string;
    endpoint: string;
    action: string;
    actor_email: string;
    actor_role: string;
    created_at: string;
    ip_address: string;
}

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/audit-logs');
            // Handle response format: { logs: [], total, page, limit }
            if (response.data && response.data.logs) {
                setLogs(response.data.logs);
            } else if (Array.isArray(response.data)) {
                setLogs(response.data);
            } else {
                setLogs([]);
            }
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getMethodVariant = (method: string) => {
        switch (method) {
            case 'GET': return 'primary';
            case 'POST': return 'success';
            case 'PUT': return 'warning';
            case 'DELETE': return 'danger';
            default: return 'default';
        }
    };

    const filteredLogs = logs.filter(log =>
        (log.endpoint || log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.actor_email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">System Audit Logs</h1>
                    <p className="text-slate-500 mt-1">Monitor system activity and security events</p>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search logs..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 font-semibold text-slate-600">Time</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">User</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Role</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Action</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No logs found. Try performing some actions first (navigate around, submit leave, etc.)
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors text-xs">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono">
                                            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">
                                            {log.actor_email || 'System'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="capitalize">
                                                {log.actor_role || 'N/A'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div className="flex items-center gap-2">
                                                {log.method && (
                                                    <Badge variant={getMethodVariant(log.method) as any} className="text-[10px]">
                                                        {log.method}
                                                    </Badge>
                                                )}
                                                <span className="truncate max-w-xs font-mono" title={log.action}>
                                                    {log.endpoint || log.action}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono">
                                            {log.ip_address || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AuditLogs;

