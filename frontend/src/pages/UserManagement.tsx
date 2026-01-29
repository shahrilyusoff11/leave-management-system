import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, MoreVertical } from 'lucide-react';
import api from '../services/api';
import type { User } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/hr/users');
            if (Array.isArray(response.data)) {
                setUsers(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500 mt-1">Manage system users and access controls</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                </Button>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search users..."
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
                                <th className="px-6 py-4 font-semibold text-slate-600">User</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Role</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Department</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Joined</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                                    {user.first_name[0]}{user.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{user.first_name} {user.last_name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={user.role === 'admin' || user.role === 'sysadmin' ? 'primary' : 'default'}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {user.department || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {format(new Date(user.joined_date), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => setEditUser(user)}
                                            >
                                                <MoreVertical className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchUsers}
            />

            {editUser && (
                <EditUserModal
                    user={editUser}
                    isOpen={!!editUser}
                    onClose={() => setEditUser(null)}
                    onSuccess={fetchUsers}
                />
            )}
        </div>
    );
};

const CreateUserModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setError('');
        try {
            await api.post('/hr/users', data);
            reset();
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create user");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New User">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">First Name</label>
                        <Input {...register('first_name', { required: 'Required' })} error={errors.first_name?.message as string} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Last Name</label>
                        <Input {...register('last_name', { required: 'Required' })} error={errors.last_name?.message as string} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <Input type="email" {...register('email', { required: 'Required' })} error={errors.email?.message as string} />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <Input type="password" {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} error={errors.password?.message as string} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Role</label>
                        <select
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            {...register('role', { required: 'Required' })}
                        >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            <option value="hr">HR</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Joined Date</label>
                        <Input type="date" {...register('joined_date', { required: 'Required' })} error={errors.joined_date?.message as string} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Department</label>
                        <Input {...register('department', { required: 'Required' })} error={errors.department?.message as string} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Position</label>
                        <Input {...register('position', { required: 'Required' })} error={errors.position?.message as string} />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={isSubmitting}>Create User</Button>
                </div>
            </form>
        </Modal>
    );
};

const EditUserModal = ({ user, isOpen, onClose, onSuccess }: { user: User, isOpen: boolean, onClose: () => void, onSuccess: () => void }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'probation' | 'balance'>('details');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const probationForm = useForm();
    const balanceForm = useForm();

    const handleConfirmProbation = async (data: any) => {
        setError('');
        setMessage('');
        try {
            await api.put(`/hr/users/${user.id}/probation`, {
                is_confirmed: true,
                notes: data.notes
            });
            setMessage('Probation confirmed successfully');
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to update probation");
        }
    };

    const handleUpdateBalance = async (data: any) => {
        setError('');
        setMessage('');
        try {
            await api.put(`/hr/users/${user.id}/leave-balance`, {
                leave_type: data.leave_type,
                year: parseInt(data.year),
                total_entitlement: parseFloat(data.total_entitlement),
                adjustment: parseFloat(data.adjustment || 0),
                reason: data.reason
            });
            setMessage('Leave balance updated successfully');
            balanceForm.reset();
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to update balance");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit User: ${user.first_name} ${user.last_name}`}>
            <div className="space-y-4">
                <div className="flex border-b border-slate-200">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Details
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'probation' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('probation')}
                    >
                        Probation
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'balance' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('balance')}
                    >
                        Leave Balance
                    </button>
                </div>

                {message && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>}
                {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

                {activeTab === 'details' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="block text-slate-500">Email</label>
                                <div className="font-medium text-slate-900">{user.email}</div>
                            </div>
                            <div>
                                <label className="block text-slate-500">Role</label>
                                <div className="font-medium text-slate-900">{user.role}</div>
                            </div>
                            <div>
                                <label className="block text-slate-500">Department</label>
                                <div className="font-medium text-slate-900">{user.department}</div>
                            </div>
                            <div>
                                <label className="block text-slate-500">Joined Date</label>
                                <div className="font-medium text-slate-900">{format(new Date(user.joined_date), 'MMM d, yyyy')}</div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 italic">Full profile editing is not yet enabled.</p>
                    </div>
                )}

                {activeTab === 'probation' && (
                    <form onSubmit={probationForm.handleSubmit(handleConfirmProbation)} className="space-y-4">
                        <p className="text-sm text-slate-600">Confirm successful completion of probation period.</p>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Notes (Optional)</label>
                            <Input {...probationForm.register('notes')} placeholder="Performance review notes..." />
                        </div>
                        <Button type="submit" isLoading={probationForm.formState.isSubmitting}>Confirm Probation</Button>
                    </form>
                )}

                {activeTab === 'balance' && (
                    <form onSubmit={balanceForm.handleSubmit(handleUpdateBalance)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Leave Type</label>
                                <select
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    {...balanceForm.register('leave_type', { required: true })}
                                >
                                    <option value="annual">Annual</option>
                                    <option value="sick">Sick</option>
                                    <option value="compassionate">Compassionate</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Year</label>
                                <Input type="number" {...balanceForm.register('year', { required: true })} defaultValue={new Date().getFullYear()} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Total Entitlement</label>
                                <Input type="number" step="0.5" {...balanceForm.register('total_entitlement', { required: true })} placeholder="e.g. 14" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Manual Adjustment</label>
                                <Input type="number" step="0.5" {...balanceForm.register('adjustment')} placeholder="e.g. +1 or -1" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Reason</label>
                            <Input {...balanceForm.register('reason', { required: true })} placeholder="Reason for change..." />
                        </div>

                        <Button type="submit" isLoading={balanceForm.formState.isSubmitting}>Update Balance</Button>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default UserManagement;
