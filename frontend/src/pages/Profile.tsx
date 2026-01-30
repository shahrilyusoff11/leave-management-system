import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Lock, Mail, Building, Calendar as CalendarIcon, Shield } from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { format } from 'date-fns';
import type { User as UserType } from '../types';

const Profile: React.FC = () => {
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/profile');
                setUser(response.data);
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const onChangePassword = async (data: any) => {
        setMessage('');
        setError('');

        if (data.new_password !== data.confirm_password) {
            setError("Passwords do not match");
            return;
        }

        try {
            await api.put('/change-password', {
                current_password: data.old_password,
                new_password: data.new_password
            });
            setMessage("Password changed successfully");
            reset();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to change password");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
    if (!user) return <div className="p-8 text-center text-slate-500">User not found</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                <p className="text-slate-500 mt-1">Manage your account settings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card className="p-6 text-center">
                        <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl font-bold text-brand-600">
                                {user.first_name[0]}{user.last_name[0]}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{user.first_name} {user.last_name}</h2>
                        <p className="text-slate-500 capitalize">{user.role}</p>
                        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 text-left px-4">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-slate-400" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-slate-400" />
                                <span>{user.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-slate-400" />
                                <span>{user.position}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-slate-400" />
                                <span>Joined {format(new Date(user.joined_date), 'MMM yyyy')}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Lock className="h-5 w-5 text-slate-400" />
                            Change Password
                        </h3>

                        {message && <div className="p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>}
                        {error && <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

                        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Current Password</label>
                                <Input
                                    type="password"
                                    {...register('old_password', { required: 'Required' })}
                                    error={errors.old_password?.message as string}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">New Password</label>
                                <Input
                                    type="password"
                                    {...register('new_password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
                                    error={errors.new_password?.message as string}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                                <Input
                                    type="password"
                                    {...register('confirm_password', { required: 'Required' })}
                                    error={errors.confirm_password?.message as string}
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" isLoading={isSubmitting}>Update Password</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Profile;
