import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Settings, RefreshCw, Save, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface SystemConfig {
    max_carry_forward_days: number;
    working_days: string[];
    escalation_days: number;
}

const SystemSettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const { register, handleSubmit, reset, formState: { errors } } = useForm<SystemConfig>();

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/config');
            reset(response.data);
        } catch (err) {
            console.error("Failed to fetch config", err);
            setError("Failed to load system configuration");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const onSubmit = async (data: SystemConfig) => {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            await api.put('/admin/config', data);
            setMessage('System configuration updated successfully');
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to update configuration");
        } finally {
            setSaving(false);
        }
    };

    const handleYearEndProcess = async () => {
        if (!confirm(
            "⚠️ Year-End Process Warning\n\n" +
            "This will:\n" +
            "• Calculate carry-forward balances for all users\n" +
            "• Reset annual leave entitlements for the new year\n" +
            "• This action cannot be undone!\n\n" +
            "Are you sure you want to proceed?"
        )) return;

        setProcessing(true);
        setMessage('');
        setError('');
        try {
            await api.post('/admin/year-end-process', {});
            setMessage('Year-end process completed successfully! Leave balances have been carried forward.');
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to run year-end process");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
                    <p className="text-slate-500 mt-1">Configure system-wide settings and processes</p>
                </div>
            </div>

            {message && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
                    {message}
                </div>
            )}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leave Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-brand-600" />
                            Leave Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">
                                    Max Carry Forward Days
                                </label>
                                <Input
                                    type="number"
                                    {...register('max_carry_forward_days', {
                                        required: 'Required',
                                        min: { value: 0, message: 'Must be 0 or more' },
                                        max: { value: 30, message: 'Max 30 days' }
                                    })}
                                    error={errors.max_carry_forward_days?.message}
                                />
                                <p className="text-xs text-slate-400">
                                    Maximum number of unused leave days that can be carried to next year
                                </p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">
                                    Escalation Days
                                </label>
                                <Input
                                    type="number"
                                    {...register('escalation_days', {
                                        required: 'Required',
                                        min: { value: 1, message: 'Must be at least 1 day' },
                                        max: { value: 14, message: 'Max 14 days' }
                                    })}
                                    error={errors.escalation_days?.message}
                                />
                                <p className="text-xs text-slate-400">
                                    Days before pending requests are auto-escalated to HR
                                </p>
                            </div>

                            <Button type="submit" className="w-full" isLoading={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Configuration
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Year-End Process */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-indigo-600" />
                            Year-End Process
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-amber-800">Important Notice</h4>
                                        <p className="text-sm text-amber-700 mt-1">
                                            The year-end process should only be run once at the end of each year.
                                            This will calculate and apply carry-forward balances for all employees.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600">
                                <p><strong>This process will:</strong></p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Calculate unused leave days for each employee</li>
                                    <li>Apply carry-forward (up to max limit) to next year</li>
                                    <li>Create new leave balances for the upcoming year</li>
                                    <li>Reset entitlements based on years of service</li>
                                </ul>
                            </div>

                            <Button
                                onClick={handleYearEndProcess}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                isLoading={processing}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Run Year-End Process
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SystemSettings;
