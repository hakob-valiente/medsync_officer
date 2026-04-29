import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Calendar, Search, Filter, Clock, MapPin,
    ShieldCheck, ChevronDown, LayoutGrid, List,
    School
} from 'lucide-react';
import { AppointmentsCalendarWidget } from '../components/AppointmentsCalendarWidget';
import { useStore } from '../hooks/useStore';
import {
    fetchAppointmentsFromDB,
    fetchAcceptedAppointmentsFromDB,
    updateAppointmentStatusDB,
    addAcceptedAppointmentDB,
    sendBackAppointmentDB,
    addLog
} from '../store';
import { format } from 'date-fns';
import { notifyIndividual } from '../lib/notifications';
import { PaginationControl } from '../components/ui/PaginationControl';
import {
    AcceptAppointmentModal,
    ViewAcceptedAppointmentModal,
    RejectAppointmentModal,
    ExpandReasonModal
} from '../components/AppointmentModals';


function formatDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    try {
        return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
        return dateStr;
    }
}

function formatTime(dateStr: string) {
    if (!dateStr) return 'N/A';
    try {
        return format(new Date(dateStr), 'hh:mm a');
    } catch {
        return dateStr;
    }
}

export default function Appointments() {
    const { appointments, acceptedAppointments, campuses, users } = useStore();
    const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'calendar'>('calendar');
    const [searchTerm, setSearchTerm] = useState('');
    const [campusFilter, setCampusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('Upcoming');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sort States
    const [pendingSortField] = useState<'date' | 'category'>('date');
    const [pendingSortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [acceptedSortField] = useState<'date' | 'category'>('date');
    const [acceptedSortOrder] = useState<'ASC' | 'DESC'>('DESC');

    const [acceptModal, setAcceptModal] = useState<any | null>(null);
    const [rejectDialog, setRejectDialog] = useState<any | null>(null);
    const [reasonModal, setReasonModal] = useState<any | null>(null);

    const [viewAcceptedModal, setViewAcceptedModal] = useState<any | null>(null);
    const [sendBackConfirm, setSendBackConfirm] = useState<any | null>(null);
    const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

    const itemsPerPage = 6;

    useEffect(() => {
        fetchAppointmentsFromDB();
        fetchAcceptedAppointmentsFromDB();
    }, []);

    const location = useLocation();

    useEffect(() => {
        if (location.state?.viewId) {
            const acceptedItem = acceptedAppointments.find(a => a.appointment_id === location.state.viewId || a.id === location.state.viewId);
            if (acceptedItem) {
                setActiveTab('accepted');
                setViewAcceptedModal(acceptedItem);
            } else {
                const pendingItem = appointments.find(a => a.id === location.state.viewId);
                if (pendingItem) {
                    setActiveTab('pending');
                    setAcceptModal(pendingItem);
                }
            }
            window.history.replaceState({}, document.title);
        }
    }, [location.state, appointments, acceptedAppointments]);

    const filteredPending = useMemo(() => {
        const now = new Date();
        return appointments.filter(a => {
            const matchesStatus = a.status?.toUpperCase() === 'PENDING';
            const matchesSearch = ((a.requester_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.visit_reason.toLowerCase().includes(searchTerm.toLowerCase()));

            let matchesDate = true;
            const reqDate = new Date(a.request_timestamp);
            const diffHours = (now.getTime() - reqDate.getTime()) / (1000 * 60 * 60);

            if (dateFilter === '24h') matchesDate = diffHours <= 24;
            else if (dateFilter === '7d') matchesDate = diffHours <= 24 * 7;
            else if (dateFilter === '30d') matchesDate = diffHours <= 24 * 30;

            const firstWord = (a.category || '').split(' ')[0].toUpperCase();
            const matchesCategory = categoryFilter === 'ALL' || firstWord === categoryFilter;
            return matchesStatus && matchesSearch && matchesDate && matchesCategory;
        }).sort((a, b) => {
            if (pendingSortField === 'date') {
                const dateA = new Date(a.request_timestamp).getTime();
                const dateB = new Date(b.request_timestamp).getTime();
                return pendingSortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
            } else {
                const catA = (a.category || '').toLowerCase();
                const catB = (b.category || '').toLowerCase();
                return pendingSortOrder === 'ASC' ? catA.localeCompare(catB) : catB.localeCompare(catA);
            }
        });
    }, [appointments, searchTerm, dateFilter, categoryFilter, pendingSortField, pendingSortOrder]);

    const filteredAccepted = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 86400000);
        const endOfWeek = new Date(today.getTime() + (7 - today.getDay()) * 86400000);

        return acceptedAppointments.filter(a => {
            const matchesCampus = (campusFilter === 'All' || a.campus === campusFilter);
            const matchesSearch = ((a.requester_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.nurse_assigned || '').toLowerCase().includes(searchTerm.toLowerCase()));

            let matchesDate = true;
            const schedDate = new Date(a.appointment_sched);

            if (dateFilter === 'Today') {
                matchesDate = schedDate >= today && schedDate < tomorrow;
            } else if (dateFilter === 'Tomorrow') {
                const dayAfterTomorrow = new Date(tomorrow.getTime() + 86400000);
                matchesDate = schedDate >= tomorrow && schedDate < dayAfterTomorrow;
            } else if (dateFilter === 'ThisWeek') {
                matchesDate = schedDate >= today && schedDate <= endOfWeek;
            } else if (dateFilter === 'Upcoming') {
                matchesDate = schedDate >= today;
            }

            const firstWord = (a.category || '').split(' ')[0].toUpperCase();
            const matchesCategory = categoryFilter === 'ALL' || firstWord === categoryFilter;
            return matchesCampus && matchesSearch && matchesDate && matchesCategory;
        }).sort((a, b) => {
            if (acceptedSortField === 'date') {
                const dateA = new Date(a.appointment_sched).getTime();
                const dateB = new Date(b.appointment_sched).getTime();
                return acceptedSortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
            } else {
                const catA = (a.category || '').toLowerCase();
                const catB = (b.category || '').toLowerCase();
                return acceptedSortOrder === 'ASC' ? catA.localeCompare(catB) : catB.localeCompare(catA);
            }
        });
    }, [acceptedAppointments, searchTerm, campusFilter, dateFilter, categoryFilter, acceptedSortField, acceptedSortOrder]);

    const totalPages = Math.ceil((activeTab === 'pending' ? filteredPending.length : filteredAccepted.length) / itemsPerPage);
    const paginatedPending = filteredPending.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const paginatedAccepted = filteredAccepted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, campusFilter, activeTab, dateFilter]);

    const handleAccept = async (data: any) => {
        setIsSubmitting(true);
        try {
            const result = await addAcceptedAppointmentDB({
                requester_id: acceptModal.requester_id,
                appointment_id: acceptModal.id,
                nurse_assigned: data.nurse_assigned,
                appointment_sched: `${data.date}T${data.time}`,
                campus: data.campus,
                category: data.category,
            });

            const insertedRow = result?.[0];

            const student = users.find(u => u.studentId === acceptModal.requester_student_number);
            if (student) {
                await notifyIndividual(
                    student.id,
                    'Appointment Scheduled',
                    `Your appointment for ${acceptModal.visit_reason} has been scheduled on ${format(new Date(data.date), 'MMM dd, yyyy')} at ${data.time}.`,
                    'appointment_accepted',
                    insertedRow?.id || acceptModal.id
                );
            }

            addLog('Officer', `Accepted appointment for ${acceptModal.requester_name}`);
            setAcceptModal(null);
            setSuccessToast({ show: true, message: 'Appointment scheduled successfully!' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
        } catch (e: any) {
            alert(e.message || 'Failed to accept appointment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async (reason: string) => {
        if (!rejectDialog) return;
        setIsSubmitting(true);
        try {
            await updateAppointmentStatusDB(rejectDialog.id, 'REJECTED', reason || 'No reason provided');
            await notifyIndividual(
                rejectDialog.requester_id,
                'Appointment Update',
                `Your appointment has been declined. Reason: ${reason || 'No reason provided'}`,
                'appointment_declined',
                rejectDialog.id
            );
            addLog('Officer', `Rejected appointment for ${rejectDialog.requester_name}`);
            setRejectDialog(null);
            setSuccessToast({ show: true, message: 'Appointment declined.' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
        } catch (e: any) {
            alert(e.message || 'Failed to reject appointment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendBack = async (reason: string) => {
        if (!sendBackConfirm) return;
        setIsSubmitting(true);
        try {
            await sendBackAppointmentDB(sendBackConfirm.id, sendBackConfirm.appointment_id, reason);
            await notifyIndividual(
                sendBackConfirm.requester_id,
                'Appointment Update',
                `Your scheduled appointment has been sent back to pending for review. Wait for another update. Reason: ${reason}`,
                'appointment_declined',
                sendBackConfirm.appointment_id
            );
            addLog('Officer', `Sent back appointment for ${sendBackConfirm.requester_name}`);
            setSendBackConfirm(null);
            setViewAcceptedModal(null);
            setSuccessToast({ show: true, message: 'Appointment sent back to pending.' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
        } catch (e: any) {
            alert(e.message || 'Failed to send back appointment');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-2 md:p-6 min-h-screen" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Appointments</h2>
                    <p
                        className="text-sm mt-1 font-medium"
                        style={{ color: 'var(--text-secondary)', opacity: 0.85 }}
                    >
                        Manage consultation requests and staff coordination for your clinic.
                    </p>
                </div>
                <div
                    className="flex items-center p-1 rounded-xl border"
                    style={{ background: 'var(--bg-wash)', borderColor: 'var(--card-border)' }}
                >
                    <button
                        onClick={() => {
                            setActiveTab('pending');
                            setSelectedCalendarDate(undefined);
                        }}
                        className="px-5 py-2 rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-all duration-200"
                        style={{
                            background: activeTab === 'pending' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'pending' ? '#fff' : 'var(--nav-cat)',
                            boxShadow: activeTab === 'pending' ? '0 2px 8px rgba(59,172,237,0.30)' : 'none',
                        }}
                    >
                        Pending
                        {filteredPending.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
                                style={{
                                    background: activeTab === 'pending' ? 'rgba(255,255,255,0.25)' : 'rgba(226,92,92,0.12)',
                                    color: activeTab === 'pending' ? '#fff' : '#E25C5C',
                                }}>
                                {filteredPending.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('accepted');
                            setSelectedCalendarDate(undefined);
                        }}
                        className="px-5 py-2 rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-all duration-200"
                        style={{
                            background: activeTab === 'accepted' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'accepted' ? '#fff' : 'var(--nav-cat)',
                            boxShadow: activeTab === 'accepted' ? '0 2px 8px rgba(59,172,237,0.30)' : 'none',
                        }}
                    >
                        Scheduled
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('calendar');
                            setSelectedCalendarDate(undefined);
                        }}
                        className="px-5 py-2 rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-all duration-200"
                        style={{
                            background: activeTab === 'calendar' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'calendar' ? '#fff' : 'var(--nav-cat)',
                            boxShadow: activeTab === 'calendar' ? '0 2px 8px rgba(59,172,237,0.30)' : 'none',
                        }}
                    >
                        Calendar
                    </button>
                </div>
            </div>

            {/* Proportional Analytics Bar (Only for Pending) */}
            {activeTab === 'pending' && (
                <div className="px-1 mt-8 mb-6 fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="rounded-2xl p-4 shadow-sm border border-dashed flex flex-col justify-between" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-6">
                                    {(() => {
                                        const clinicCount = filteredPending.filter(a => (a.category || '').toLowerCase().includes('clinic')).length;
                                        const dentalCount = filteredPending.filter(a => (a.category || '').toLowerCase().includes('dental')).length;
                                        const total = clinicCount + dentalCount || 1;
                                        const clinicPct = Math.round((clinicCount / total) * 100);
                                        const dentalPct = Math.round((dentalCount / total) * 100);
                                        return (
                                            <>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Clinic</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xl font-bold leading-none">{clinicCount}</span>
                                                        <span className="text-[11px] font-bold text-emerald-500">{clinicPct}%</span>
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-slate-100" />
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dental</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xl font-bold leading-none">{dentalCount}</span>
                                                        <span className="text-[11px] font-bold text-blue-500">{dentalPct}%</span>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Pending Distribution</p>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1">Load Factor</p>
                                </div>
                            </div>
                            {(() => {
                                const clinicCount = filteredPending.filter(a => (a.category || '').toLowerCase().includes('clinic')).length;
                                const dentalCount = filteredPending.filter(a => (a.category || '').toLowerCase().includes('dental')).length;
                                const total = clinicCount + dentalCount || 1;
                                const clinicPct = (clinicCount / total) * 100;
                                const dentalPct = (dentalCount / total) * 100;
                                return (
                                    <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-50 border border-slate-100 p-[2px]">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out relative group" style={{ width: `${clinicPct}%`, background: '#10b981' }}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Clinic: {Math.round(clinicPct)}%</div>
                                        </div>
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out ml-1 relative group" style={{ width: `${dentalPct}%`, background: '#3b82f6' }}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Dental: {Math.round(dentalPct)}%</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="rounded-2xl p-4 shadow-sm border border-dashed flex flex-col justify-between" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-6">
                                    {(() => {
                                        const acceptedCount = acceptedAppointments.length;
                                        const rejectedCount = appointments.filter(a => a.status?.toUpperCase() === 'REJECTED').length;
                                        const total = acceptedCount + rejectedCount || 1;
                                        const acceptedPct = Math.round((acceptedCount / total) * 100);
                                        const rejectedPct = Math.round((rejectedCount / total) * 100);
                                        return (
                                            <>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Accepted</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xl font-bold leading-none">{acceptedCount}</span>
                                                        <span className="text-[11px] font-bold text-emerald-500">{acceptedPct}%</span>
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-slate-100" />
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rejected</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xl font-bold leading-none">{rejectedCount}</span>
                                                        <span className="text-[11px] font-bold text-red-500">{rejectedPct}%</span>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Completed Appts. Distribution</p>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1">Resolution Ratio</p>
                                </div>
                            </div>
                            {(() => {
                                const acceptedCount = acceptedAppointments.length;
                                const rejectedCount = appointments.filter(a => a.status?.toUpperCase() === 'REJECTED').length;
                                const total = acceptedCount + rejectedCount || 1;
                                const acceptedPct = (acceptedCount / total) * 100;
                                const rejectedPct = (rejectedCount / total) * 100;
                                return (
                                    <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-50 border border-slate-100 p-[2px]">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out relative group" style={{ width: `${acceptedPct}%`, background: '#10b981' }}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Accepted: {Math.round(acceptedPct)}%</div>
                                        </div>
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out ml-1 relative group" style={{ width: `${rejectedPct}%`, background: '#ef4444' }}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Rejected: {Math.round(rejectedPct)}%</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Row (Only for Scheduled) */}
            {activeTab === 'accepted' && (
                <div className="px-1 mb-5 fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-2xl p-4 shadow-sm border border-dashed flex flex-col justify-between" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                            {(() => {
                                const today = new Date();
                                const startOfWeek = new Date(today);
                                startOfWeek.setDate(today.getDate() - today.getDay());
                                startOfWeek.setHours(0, 0, 0, 0);
                                const endOfWeek = new Date(startOfWeek);
                                endOfWeek.setDate(startOfWeek.getDate() + 6);
                                endOfWeek.setHours(23, 59, 59, 999);
                                const thisWeekAppts = acceptedAppointments.filter(a => {
                                    const d = new Date(a.appointment_sched);
                                    return d >= startOfWeek && d <= endOfWeek;
                                });
                                const weekDays = Array.from({ length: 7 }, (_, i) => {
                                    const d = new Date(startOfWeek);
                                    d.setDate(startOfWeek.getDate() + i);
                                    return d;
                                });
                                const dailyCounts = weekDays.map(date => {
                                    return thisWeekAppts.filter(a => {
                                        const d = new Date(a.appointment_sched);
                                        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
                                    }).length;
                                });
                                const maxCount = Math.max(...dailyCounts, 1);
                                return (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center"><Calendar size={18} /></div>
                                                <div><h3 className="text-xs font-bold">Weekly Performance</h3><p className="text-[10px] text-slate-500">7-day volume</p></div>
                                            </div>
                                            <div className="text-right"><span className="text-xl font-black text-[var(--accent)]">{thisWeekAppts.length}</span></div>
                                        </div>
                                        <div className="flex-1 flex gap-3 pt-2">
                                            <div className="flex flex-col justify-between h-[65px] text-[8px] font-bold text-slate-400 py-0.5"><span>{maxCount}</span><span>{Math.round(maxCount / 2)}</span><span>0</span></div>
                                            <div className="flex-1 h-[65px] flex items-end gap-1 relative">
                                                {weekDays.map((date, i) => {
                                                    const count = dailyCounts[i];
                                                    const heightPct = (count / (maxCount * 1.2)) * 100;
                                                    const isToday = date.toDateString() === today.toDateString();
                                                    return (
                                                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                            <div className="w-full rounded-t-sm transition-all duration-500 relative hover:brightness-110" style={{ height: `${Math.max(heightPct, 8)}%`, background: isToday ? 'var(--accent)' : 'var(--bg-wash)', border: isToday ? 'none' : '1px solid var(--border)', boxShadow: isToday ? '0 4px 12px rgba(59,172,237,0.2)' : 'none' }}>
                                                                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: isToday ? 'var(--accent)' : 'var(--text-secondary)' }}>{count}</span>
                                                            </div>
                                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2"><p className="text-[9px] font-black uppercase tracking-tighter" style={{ color: isToday ? 'var(--accent)' : 'var(--text-faint)' }}>{format(date, 'EE').charAt(0)}</p></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        <div className="rounded-2xl p-4 shadow-sm border border-dashed flex flex-col justify-between md:col-span-2" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center"><Clock size={18} /></div>
                                <div><h3 className="text-xs font-bold">Hourly Traffic ({format(new Date(), 'MMMM d, yyyy')})</h3><p className="text-[10px] text-slate-500">Peak density across clinic hours</p></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                {(() => {
                                    const todayStr = new Date().toLocaleDateString('en-CA');
                                    const todayAppts = acceptedAppointments.filter(a => a.appointment_sched?.startsWith(todayStr));
                                    const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
                                    const hourlyData = hours.map(h => ({
                                        h, label: h > 12 ? `${h-12}PM` : (h === 12 ? '12PM' : `${h}AM`),
                                        count: todayAppts.filter(a => { try { return new Date(a.appointment_sched).getHours() === h; } catch { return false; } }).length
                                    }));
                                    const maxVal = Math.max(...hourlyData.map(d => d.count), 4);
                                    const chartHeight = 100;
                                    const chartWidth = 400;
                                    const points = hourlyData.map((d, i) => ({ x: (i / (hourlyData.length - 1)) * chartWidth, y: chartHeight - (d.count / maxVal) * chartHeight }));
                                    const dPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                    return (
                                        <div className="w-full flex gap-3">
                                            <div className="flex flex-col justify-between h-[75px] text-[8px] font-bold text-slate-400 py-0.5 min-w-[12px]"><span>{maxVal}</span><span>{Math.round(maxVal / 2)}</span><span>0</span></div>
                                            <div className="flex-1">
                                                <div className="h-[75px] relative">
                                                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                                        <defs><linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity="0.2" /><stop offset="100%" stopColor="#10B981" stopOpacity="0" /></linearGradient></defs>
                                                        {[0, 0.5, 1].map(v => (<line key={v} x1="0" y1={v * chartHeight} x2={chartWidth} y2={v * chartHeight} stroke="var(--border-light)" strokeWidth="0.5" strokeDasharray="3,3" />))}
                                                        <path d={`${dPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`} fill="url(#lineGradient)" />
                                                        <path d={dPath} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        {points.map((p, i) => (
                                                            <g key={i} className="group/point">
                                                                <circle cx={p.x} cy={p.y} r="3" fill="white" stroke="#10B981" strokeWidth="1.5" className="transition-all hover:r-5 cursor-help" />
                                                                <title>{hourlyData[i].count} Appointments at {hourlyData[i].label}</title>
                                                            </g>
                                                        ))}
                                                    </svg>
                                                </div>
                                                <div className="flex justify-between mt-3">{hourlyData.map((d, i) => (<span key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{d.label}</span>))}</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="rounded-2xl p-4 shadow-sm border border-dashed flex flex-col justify-between" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center"><MapPin size={18} /></div>
                                <div><h3 className="text-xs font-bold">Campus Split</h3><p className="text-[10px] text-slate-500">Weekly load</p></div>
                            </div>
                            {(() => {
                                const today = new Date();
                                const startOfWeek = new Date(today);
                                startOfWeek.setDate(today.getDate() - today.getDay());
                                startOfWeek.setHours(0, 0, 0, 0);
                                const endOfWeek = new Date(startOfWeek);
                                endOfWeek.setDate(startOfWeek.getDate() + 6);
                                endOfWeek.setHours(23, 59, 59, 999);
                                const thisWeekAppts = acceptedAppointments.filter(a => {
                                    const d = new Date(a.appointment_sched);
                                    return d >= startOfWeek && d <= endOfWeek;
                                });
                                const totalThisWeek = thisWeekAppts.length;
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                const campusData = campuses.map((c, i) => ({ name: c.name, count: thisWeekAppts.filter(a => a.campus === c.name).length, color: colors[i % colors.length] })).sort((a, b) => b.count - a.count).filter(c => c.count > 0);
                                let currentPct = 0;
                                const gradientStops = campusData.map(c => { const pct = (c.count / (totalThisWeek || 1)) * 100; const stop = `${c.color} ${currentPct}% ${currentPct + pct}%`; currentPct += pct; return stop; }).join(', ');
                                const pieStyle = totalThisWeek > 0 ? { background: `conic-gradient(${gradientStops})` } : { background: 'var(--bg-wash)' };
                                return (
                                    <div className="flex flex-col items-center gap-2 mt-0">
                                        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center"><div className="w-full h-full rounded-full shadow-inner" style={pieStyle}></div><div className="absolute w-10 h-10 rounded-full flex flex-col items-center justify-center shadow-sm" style={{ background: 'var(--card-bg)' }}><span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{totalThisWeek}</span></div></div>
                                        <div className="flex flex-col gap-0.5 w-full items-center">
                                            {campusData.map(c => (<div key={c.name} className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} /><span className="text-[9px] font-bold text-slate-500">{c.name}:</span><span className="text-[9px] font-black text-slate-700">{c.count}</span></div>))}
                                            {campusData.length === 0 && <p className="text-[9px] text-slate-400 italic text-center">No data</p>}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            {activeTab !== 'calendar' && (
                <div className="rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-colors mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="relative flex-1 min-w-[280px] max-w-md">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search patient name, ID, or campus..."
                            className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl outline-none font-normal transition-colors"
                            style={{ background: 'var(--bg-wash)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[140px]">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="appearance-none w-full pl-9 pr-9 py-2 text-[11px] font-semibold rounded-xl outline-none transition-colors shadow-sm"
                                style={{
                                    background: 'var(--bg-wash)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="ALL">All Services</option>
                                <option value="CLINIC">Clinic</option>
                                <option value="DENTAL">Dental</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" style={{ color: 'var(--text-faint)' }} />
                        </div>

                        {activeTab === 'accepted' && (
                            <div className="relative min-w-[150px]">
                                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                                <select
                                    value={campusFilter}
                                    onChange={(e) => setCampusFilter(e.target.value)}
                                    className="appearance-none w-full pl-9 pr-9 py-2 text-[11px] font-semibold rounded-xl outline-none transition-colors shadow-sm"
                                    style={{
                                        background: 'var(--bg-wash)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <option value="All">All Campuses</option>
                                    {campuses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        )}

                        <div className="relative min-w-[140px]">
                            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="appearance-none w-full pl-9 pr-9 py-2 text-[11px] font-bold rounded-xl outline-none transition-all shadow-sm"
                                style={{
                                    background: 'var(--bg-wash)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {activeTab === 'pending' ? (
                                    <>
                                        <option value="ALL">All Time</option>
                                        <option value="24h">Last 24 Hours</option>
                                        <option value="7d">Last 7 Days</option>
                                        <option value="30d">Last 30 Days</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="ALL">All Dates</option>
                                        <option value="Today">Today</option>
                                        <option value="Tomorrow">Tomorrow</option>
                                        <option value="ThisWeek">This Week</option>
                                        <option value="Upcoming">All Upcoming</option>
                                    </>
                                )}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                    </div>

                    <div className="flex items-center p-1 rounded-xl bg-slate-100/50 border border-slate-200 shadow-inner ml-auto self-end md:self-center">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'calendar' ? (
                <div className="min-h-[500px]">
                    <AppointmentsCalendarWidget initialDate={selectedCalendarDate} />
                </div>
            ) : activeTab === 'pending' ? (
                <div className="min-h-[500px] flex flex-col">
                    <div className="flex-1">
                        {paginatedPending.length === 0 ? (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                                <Calendar size={48} className="mb-4" style={{ color: 'var(--nav-cat)' }} />
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--nav-cat)' }}>No pending requests</h3>
                            </div>
                        ) : viewMode === 'list' ? (
                            <div className="rounded-2xl overflow-hidden flex flex-col min-h-[500px]" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                <div className="grid grid-cols-[6px_1.5fr_1.5fr_1fr_1.2fr_0.8fr_1.2fr] items-center px-5 py-3 gap-3" style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--card-border)' }}>
                                    <div /><p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Patient</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Reason</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Contact</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Submitted</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Service</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-right">Actions</p>
                                </div>
                                {paginatedPending.map((a) => (
                                    <div key={a.id} className="grid grid-cols-[6px_1.5fr_1.5fr_1fr_1.2fr_0.8fr_1.2fr] items-center px-5 py-3.5 gap-3 border-b border-slate-50 last:border-0 hover:bg-[var(--accent-subtle)] transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F59E0B' }} />
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>{a.profiles?.profile_picture_url ? <img src={a.profiles.profile_picture_url} className="w-full h-full object-cover" /> : (a.requester_name || '?')[0].toUpperCase()}</div>
                                            <div className="min-w-0"><p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.requester_name || 'Unknown'}</p><p className="text-[10px] font-medium" style={{ color: 'var(--nav-cat)' }}>#{a.requester_student_number}</p></div>
                                        </div>
                                        <div className="flex items-center gap-2"><p className="text-[13px] truncate italic max-w-[140px]" style={{ color: 'var(--nav-text)' }}>{a.visit_reason || '—'}</p></div>
                                        <p className="text-[12px]" style={{ color: 'var(--nav-text)' }}>{a.contact_number || '—'}</p>
                                        <div className="flex items-center gap-1.5"><Clock size={12} style={{ color: 'var(--nav-cat)' }} /><p className="text-[12px]">{formatDate(a.request_timestamp)}</p></div>
                                        <div><span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide" style={{ background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)', color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669' }}>{(a.category || 'General').split(' ')[0]}</span></div>
                                        <div className="flex items-center justify-end gap-1.5"><button onClick={() => setRejectDialog(a)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest text-[#E25C5C] hover:bg-red-50 border border-[rgba(226,92,92,0.15)] bg-[rgba(226,92,92,0.07)]">Decline</button><button onClick={() => setAcceptModal(a)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest text-white transition-all shadow-md active:scale-95" style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}><ShieldCheck size={12} /> Schedule</button></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                                {paginatedPending.map(a => (
                                    <div key={a.id} className="appointment-card group">
                                        <div className="appointment-card-header"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="status-badge-modern status-badge-pending">Pending</span><span className="text-[11px] font-medium tracking-widest" style={{ color: 'var(--nav-cat)' }}>#{a.requester_student_number}</span></div><h3 className="text-sm font-medium">{a.requester_name || 'Unknown Patient'}</h3></div><span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-md" style={{ background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)', color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669' }}>{(a.category || 'General').split(' ')[0]}</span></div>
                                        <div className="appointment-card-body space-y-3"><div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400"><span>Visit Reason</span><span className="text-[12px] font-medium text-slate-600">{a.contact_number || '—'}</span></div><p className="text-xs px-3 py-2.5 rounded-xl italic" style={{ color: 'var(--nav-text)', background: 'var(--bg-wash)', border: '1px solid var(--card-border)' }}>"{a.visit_reason}"</p><div className="flex items-center gap-2"><Clock size={12} style={{ color: 'var(--nav-cat)' }} /><span className="text-[12px] font-bold text-slate-500">{formatDate(a.request_timestamp)}</span></div></div>
                                        <div className="appointment-card-footer flex gap-2"><button onClick={() => setRejectDialog(a)} className="flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-[#E25C5C] hover:bg-red-50 border border-[rgba(226,92,92,0.2)]">Decline</button><button onClick={() => setAcceptModal(a)} className="flex-[2] flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-white transition-all shadow-md active:scale-95" style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}><ShieldCheck size={12} /> Schedule</button></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mt-auto px-2 py-6 flex items-center justify-between border-t border-slate-100"><p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Showing <span className="text-slate-900">{Math.min(itemsPerPage, filteredPending.length - (currentPage - 1) * itemsPerPage)}</span> of <span className="text-slate-900">{filteredPending.length}</span> Results</p><PaginationControl currentPage={currentPage} totalPages={Math.max(1, totalPages)} onPageChange={setCurrentPage} /></div>
                </div>
            ) : (
                <div className="min-h-[500px] flex flex-col">
                    <div className="flex-1">
                        {paginatedAccepted.length === 0 ? (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                                <ShieldCheck size={48} className="mb-4" style={{ color: 'var(--nav-cat)' }} />
                                <h3 className="text-sm font-semibold">No scheduled appointments</h3>
                            </div>
                        ) : viewMode === 'list' ? (
                            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                <div className="grid grid-cols-[6px_1.5fr_1.5fr_120px_110px_120px_120px_minmax(100px,auto)] items-center px-5 py-3 gap-3" style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--card-border)' }}>
                                    <div /><p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Patient</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Reason</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Date</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Time</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Location</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Service</p><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-right">Actions</p>
                                </div>
                                {paginatedAccepted.map((a) => {
                                    const schedDate = new Date(a.appointment_sched);
                                    const isPast = schedDate < new Date();
                                    return (
                                        <div key={a.id} className="grid grid-cols-[6px_1.5fr_1.5fr_120px_110px_120px_120px_minmax(100px,auto)] items-center px-5 py-3.5 gap-3 border-b last:border-0 hover:bg-[var(--accent-subtle)] cursor-pointer" onClick={() => setViewAcceptedModal(a)}>
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: isPast ? '#6B7280' : '#10B981' }} />
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold overflow-hidden" style={{ background: isPast ? 'linear-gradient(135deg,#94A3B8,#64748B)' : 'linear-gradient(135deg,#3BACED,#1E87C8)' }}>{a.profiles?.profile_picture_url ? <img src={a.profiles.profile_picture_url} className="w-full h-full object-cover" /> : (a.requester_name || '?')[0].toUpperCase()}</div>
                                                <div className="min-w-0"><p className="text-[13px] font-medium truncate">{a.requester_name || 'Unknown'}</p><p className="text-[10px] font-medium text-slate-400">#{a.requester_student_number}</p></div>
                                            </div>
                                            <p className="text-[12px] truncate italic">{a.visit_reason || '—'}</p>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100"><Calendar size={12} className="text-[var(--accent)]" /><p className="text-[12px] font-bold text-[var(--accent)]">{formatDate(a.appointment_sched)}</p></div>
                                            <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent-subtle)]">{formatTime(a.appointment_sched)}</span>
                                            <div className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /><p className="text-[11px] font-medium text-slate-600">{a.campus}</p></div>
                                            <div><span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight" style={{ background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)', color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669' }}>{(a.category || 'General').split(' ')[0]}</span></div>
                                            <div className="flex justify-end"><button className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-[var(--accent-light)] hover:text-[var(--accent)] transition-all">Manage</button></div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                                {paginatedAccepted.map(a => {
                                    const isPast = new Date(a.appointment_sched) < new Date();
                                    return (
                                        <div key={a.id} className="appointment-card group">
                                            <div className="appointment-card-header"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className={`ds-status ${isPast ? 'ds-status--success' : 'ds-status--accepted'}`} style={isPast ? { background: '#D1FAE5', color: '#065F46' } : {}}>{isPast ? 'Completed' : 'Upcoming'}</span><span className="text-[11px] font-medium">#{a.requester_student_number}</span></div><h3 className="text-sm font-medium">{a.requester_name || 'Unknown Patient'}</h3></div><span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">{formatTime(a.appointment_sched)}</span></div>
                                            <div className="appointment-card-body space-y-3"><div className="grid grid-cols-2 gap-2"><div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100"><Calendar size={14} className="text-[var(--accent)]" /><div><p className="text-[8px] uppercase font-black text-[#94A3B8]">Date</p><p className="text-[11px] font-bold">{formatDate(a.appointment_sched)}</p></div></div><div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100"><Clock size={14} className="text-[var(--accent)]" /><div><p className="text-[8px] uppercase font-black text-[#94A3B8]">Time</p><p className="text-[11px] font-bold">{formatTime(a.appointment_sched)}</p></div></div></div><div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><School size={14} className="text-[var(--accent)]" /><span className="text-[11px] font-bold text-slate-500">{a.campus}</span></div><span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md" style={{ background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)', color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669' }}>{(a.category || 'General').split(' ')[0]}</span></div></div>
                                            <div className="appointment-card-footer"><button onClick={() => setViewAcceptedModal(a)} className="w-full py-2 rounded-lg text-[12px] font-medium border border-slate-200 bg-slate-50 hover:bg-[var(--accent-light)] hover:text-[var(--accent)]">Manage Appointment</button></div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="mt-8 px-2 py-6 flex items-center justify-between border-t border-slate-100"><p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Showing <span className="text-slate-900">{Math.min(itemsPerPage, filteredAccepted.length - (currentPage - 1) * itemsPerPage)}</span> of <span className="text-slate-900">{filteredAccepted.length}</span> Results</p><PaginationControl currentPage={currentPage} totalPages={Math.max(1, totalPages)} onPageChange={setCurrentPage} /></div>
                </div>
            )}

            {acceptModal && (<AcceptAppointmentModal appointment={acceptModal} onClose={() => setAcceptModal(null)} onConfirm={handleAccept} isSubmitting={isSubmitting} />)}
            {rejectDialog && (<RejectAppointmentModal appointment={rejectDialog} onClose={() => setRejectDialog(null)} onConfirm={handleReject} isSubmitting={isSubmitting} />)}
            {reasonModal && (<ExpandReasonModal appointment={reasonModal} onClose={() => setReasonModal(null)} />)}
            {sendBackConfirm && (<RejectAppointmentModal appointment={sendBackConfirm} title="Send Back Appointment" description="Are you sure you want to send this confirmed appointment back to pending status? A reason is required." actionLabel="Send Back" onClose={() => { const original = sendBackConfirm; setSendBackConfirm(null); setViewAcceptedModal(original); }} onConfirm={(reason: string) => handleSendBack(reason)} isSubmitting={isSubmitting} />)}
            {viewAcceptedModal && (<ViewAcceptedAppointmentModal appointment={viewAcceptedModal} campuses={campuses} onClose={() => setViewAcceptedModal(null)} onSendBack={() => { setSendBackConfirm(viewAcceptedModal); setViewAcceptedModal(null); }} setSuccessToast={setSuccessToast} />)}

            {successToast.show && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                    <div className="bg-white rounded-2xl shadow-2xl px-6 py-3 border border-emerald-100 flex items-center gap-3 animate-bounce-subtle">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center"><ShieldCheck size={18} strokeWidth={3} /></div>
                        <span className="text-sm font-bold text-slate-800">{successToast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
