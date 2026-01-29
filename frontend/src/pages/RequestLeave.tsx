import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const requestSchema = z.object({
    leave_type: z.enum(['annual', 'sick', 'maternity', 'paternity', 'emergency', 'unpaid', 'special', 'hospitalization']),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    reason: z.string().min(1, 'Reason is required'),
});

type RequestFormData = z.infer<typeof requestSchema>;

const RequestLeave: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, formState: { errors }, watch } = useForm<RequestFormData>({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            leave_type: 'annual'
        }
    });

    const startDate = watch('start_date');
    const endDate = watch('end_date');

    const calculateDuration = () => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays > 0 ? diffDays : 0;
    };

    const onSubmit = async (data: RequestFormData) => {
        setIsLoading(true);
        setError(null);
        try {
            // Convert string dates to ISO strings for backend if needed, but backend takes Time?
            // Backend model takes time.Time. JSON unmarshaler usually handles RFC3339.
            // Native date input gives YYYY-MM-DD.
            // We need to append time or let backend handle it.
            // Let's send ISO string with T00:00:00Z to be safe.

            const payload = {
                ...data,
                start_date: new Date(data.start_date).toISOString(),
                end_date: new Date(data.end_date).toISOString(),
                duration_days: calculateDuration(), // Backend might recalculate this
            };

            await api.post('/leave-requests', payload);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Request Leave</h1>
            <Card>
                <CardHeader>
                    <CardTitle>New Leave Request</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                                <select
                                    {...register('leave_type')}
                                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                >
                                    <option value="annual">Annual Leave</option>
                                    <option value="sick">Sick Leave</option>
                                    <option value="emergency">Emergency Leave</option>
                                    <option value="unpaid">Unpaid Leave</option>
                                    <option value="maternity">Maternity Leave</option>
                                    <option value="paternity">Paternity Leave</option>
                                    <option value="hospitalization">Hospitalization</option>
                                    <option value="special">Special Leave</option>
                                </select>
                                {errors.leave_type && <p className="mt-1 text-sm text-red-500">{errors.leave_type.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="date"
                                    label="Start Date"
                                    {...register('start_date')}
                                    error={errors.start_date?.message}
                                />
                                <Input
                                    type="date"
                                    label="End Date"
                                    {...register('end_date')}
                                    error={errors.end_date?.message}
                                />
                            </div>

                            {startDate && endDate && (
                                <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-center justify-between">
                                    <span>Estimated Duration:</span>
                                    <span className="font-bold">{calculateDuration()} days</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                                <textarea
                                    {...register('reason')}
                                    className="flex min-h-[100px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                    placeholder="Please allow me to take leave because..."
                                />
                                {errors.reason && <p className="mt-1 text-sm text-red-500">{errors.reason.message}</p>}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>Cancel</Button>
                            <Button type="submit" isLoading={isLoading}>Submit Request</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default RequestLeave;
