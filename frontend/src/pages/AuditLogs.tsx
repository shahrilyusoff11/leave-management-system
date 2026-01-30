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
    path: string;
    status_code: number;
    duration: number;
    user_email: string;
    user_role: string;
    timestamp: string;
    client_ip: string;
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

    const getStatusVariant = (code: number) => {
        if (code >= 200 && code < 300) return 'success';
        if (code >= 300 && code < 400) return 'warning';
        if (code >= 400) return 'danger';
        return 'default';
    };

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
        log.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchQuery.toLowerCase())
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
                                <th className="px-6 py-4 font-semibold text-slate-600">Method</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Path</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Duration</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No logs found
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors font-mono text-xs">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">
                                            {log.user_email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={getMethodVariant(log.method) as any}>
                                                {log.method}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 truncate max-w-xs" title={log.path}>
                                            {log.path}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={getStatusVariant(log.status_code) as any}>
                                                {log.status_code}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {(log.duration / 1000000).toFixed(2)}ms
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {log.client_ip}
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
