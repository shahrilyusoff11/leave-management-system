import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { LeaveBalance, LeaveRequest } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [balanceRes, requestsRes] = await Promise.all([
                    api.get('/leave-balance'),
                    api.get('/leave-requests')
                ]);

                // Ensure we get arrays
                setBalances(Array.isArray(balanceRes.data) ? balanceRes.data : []);
                setRecentRequests(Array.isArray(requestsRes.data) ? requestsRes.data.slice(0, 5) : []);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'text-green-600 bg-green-50 border-green-200';
            case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
            case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };


    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
    }

    // Calculate remaining days for standard types
    const annual = balances.find(b => b.leave_type === 'annual');
    const sick = balances.find(b => b.leave_type === 'sick');

    const getRemaining = (b?: LeaveBalance) => {
        if (!b) return 0;
        return b.total_entitlement - b.used + b.carried_forward + (b as any).adjusted || 0;
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-2">Welcome back, {user?.first_name}!</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Annual Leave */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="border-l-4 border-l-brand-500 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Calendar className="h-24 w-24 text-brand-600" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Annual Leave</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-slate-900">{getRemaining(annual)}</div>
                            <p className="text-sm text-slate-500 mt-1">days remaining</p>
                            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-500 rounded-full"
                                    style={{ width: `${(annual?.used || 0) / (annual?.total_entitlement || 1) * 100}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Sick Leave */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <Card className="border-l-4 border-l-emerald-500 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CheckCircle className="h-24 w-24 text-emerald-600" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Sick Leave</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-slate-900">{getRemaining(sick)}</div>
                            <p className="text-sm text-slate-500 mt-1">days remaining</p>
                            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${(sick?.used || 0) / (sick?.total_entitlement || 1) * 100}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Pending Requests */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <Card className="border-l-4 border-l-amber-500 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Clock className="h-24 w-24 text-amber-600" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pending Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-slate-900">
                                {recentRequests.filter(r => r.status === 'pending').length}
                            </div>
                            <p className="text-sm text-slate-500 mt-1">requests awaiting approval</p>
                            <div className="mt-4">
                                <Link to="/request-leave">
                                    <Button variant="outline" size="sm" className="w-full text-xs">New Request</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Requests</h2>
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 font-semibold text-slate-600">Type</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Dates</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Duration</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Date Applied</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            No leave requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    recentRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 capitalize text-base">
                                                {req.leave_type}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {req.duration_days} days
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                                                    getStatusColor(req.status)
                                                )}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-center">
                        <Link to="/my-leaves">
                            <Button variant="ghost" size="sm">View All History</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
