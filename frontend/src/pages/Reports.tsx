import React, { useState } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const Reports: React.FC = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);

    const handleDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.get('/hr/payroll-report', {
                params: { month, year },
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payroll_report_${year}_${month}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Failed to download report", error);
            alert("Failed to download report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                    <p className="text-slate-500 mt-1">Generate and download system reports</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-brand-100 rounded-lg text-brand-600">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Payroll Report</h3>
                            <p className="text-slate-500 mb-6 text-sm">
                                Export monthly payroll data including leave balances, unpaid leaves, and attendance summary.
                            </p>

                            <form onSubmit={handleDownload} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Month</label>
                                        <select
                                            className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                            value={month}
                                            onChange={(e) => setMonth(parseInt(e.target.value))}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>
                                                    {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Year</label>
                                        <Input
                                            type="number"
                                            value={year}
                                            onChange={(e) => setYear(parseInt(e.target.value))}
                                            min={2000}
                                            max={2100}
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" isLoading={loading}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download CSV
                                </Button>
                            </form>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 opacity-75 relative overflow-hidden">
                    <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-medium text-slate-500 shadow-sm border border-slate-200">Coming Soon</span>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Attendance Summary</h3>
                            <p className="text-slate-500 mb-4 text-sm">
                                Detailed breakdown of employee attendance, late logins, and early logouts.
                            </p>
                            <Button className="w-full" disabled>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
