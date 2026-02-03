import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { useToast } from '../components/ui/Toast';

interface PublicHoliday {
    id: string;
    date: string;
    description: string;
    is_recurring: boolean;
}

const HolidayManagement: React.FC = () => {
    const { showToast } = useToast();
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/holidays');
            if (Array.isArray(response.data)) {
                setHolidays(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch holidays", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        try {
            await api.delete(`/admin/holidays/${id}`);
            showToast('Holiday deleted', 'success');
            fetchHolidays();
        } catch (error) {
            console.error("Failed to delete holiday", error);
            showToast('Failed to delete holiday', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Holiday Management</h1>
                    <p className="text-slate-500 mt-1">Configure public holidays and non-working days</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
                </Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 font-semibold text-slate-600">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Description</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Type</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        Loading holidays...
                                    </td>
                                </tr>
                            ) : holidays.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No holidays configured
                                    </td>
                                </tr>
                            ) : (
                                holidays.map((holiday) => (
                                    <tr key={holiday.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                {format(new Date(holiday.date), 'MMMM d, yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {holiday.description}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {holiday.is_recurring ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                    Recurring
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    One-time
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => handleDelete(holiday.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <CreateHolidayModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchHolidays}
                showToast={showToast}
            />
        </div>
    );
};

const CreateHolidayModal = ({ isOpen, onClose, onSuccess, showToast }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, showToast: (msg: string, type: 'success' | 'error') => void }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setError('');
        try {
            await api.post('/admin/holidays', {
                ...data,
                date: new Date(data.date).toISOString()
            });
            reset();
            onSuccess();
            onClose();
            showToast('Holiday added successfully', 'success');
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create holiday");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Public Holiday">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <Input {...register('description', { required: 'Required' })} error={errors.description?.message as string} placeholder="e.g. New Year's Day" />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Date</label>
                    <Input type="date" {...register('date', { required: 'Required' })} error={errors.date?.message as string} />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_recurring"
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        {...register('is_recurring')}
                    />
                    <label htmlFor="is_recurring" className="text-sm text-slate-700">Recurring yearly</label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={isSubmitting}>Add Holiday</Button>
                </div>
            </form>
        </Modal>
    );
};

export default HolidayManagement;
