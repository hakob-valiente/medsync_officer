import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Calendar, Search, Filter, Clock, MapPin,
    ShieldCheck, ChevronDown
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
    const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'calendar'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [campusFilter, setCampusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sort States
    const [pendingSortField, setPendingSortField] = useState<'date' | 'category'>('date');
    const [pendingSortOrder, setPendingSortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [acceptedSortField, setAcceptedSortField] = useState<'date' | 'category'>('date');
    const [acceptedSortOrder, setAcceptedSortOrder] = useState<'ASC' | 'DESC'>('DESC');

    const [acceptModal, setAcceptModal] = useState<any | null>(null);
    const [rejectDialog, setRejectDialog] = useState<any | null>(null);
    const [reasonModal, setReasonModal] = useState<any | null>(null);

    const [viewAcceptedModal, setViewAcceptedModal] = useState<any | null>(null);
    const [sendBackConfirm, setSendBackConfirm] = useState<any | null>(null);
    const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = activeTab === 'accepted' ? 6 : 8;

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
            // Add to accepted_appointments table
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

            addLog('Admin', `Accepted appointment for ${acceptModal.requester_name}`);
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
            addLog('Admin', `Rejected appointment for ${rejectDialog.requester_name}`);
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
        <div className="space-y-6">
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
                        onClick={() => setActiveTab('pending')}
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
                        onClick={() => setActiveTab('accepted')}
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
                        onClick={() => setActiveTab('calendar')}
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
                </div>
            )}

            {/* Content Area */}
            {activeTab === 'pending' ? (
                <div className="min-h-[500px] flex flex-col">
                    <div className="flex-1">
                        {paginatedPending.length === 0 ? (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                                <Calendar size={48} className="mb-4" style={{ color: 'var(--nav-cat)' }} />
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--nav-cat)' }}>No pending requests</h3>
                                <p className="text-xs mt-1" style={{ color: 'var(--nav-cat)' }}>New appointment requests will appear here.</p>
                            </div>
                        ) : (
                            <>
                                {/* Table View - Hidden on Mobile */}
                                <div className="appt-table-list-wrapper">
                                        <div className="rounded-2xl overflow-hidden flex flex-col min-h-[500px]" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                            <div className="flex-1">
                                                <div className="grid grid-cols-[6px_1.5fr_1.5fr_1fr_1.2fr_0.8fr_1.2fr] items-center px-5 py-3 gap-3"
                                                    style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--card-border)' }}>
                                                    <div />
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Patient</p>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Reason</p>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Contact</p>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] cursor-pointer hover:text-[var(--accent)] transition-colors"
                                                        style={{ color: 'var(--nav-cat)' }}
                                                        onClick={() => {
                                                            if (pendingSortField === 'date') setPendingSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC');
                                                            else { setPendingSortField('date'); setPendingSortOrder('DESC'); }
                                                        }}
                                                    >
                                                        Submitted {pendingSortField === 'date' && (pendingSortOrder === 'ASC' ? '↑' : '↓')}
                                                    </p>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] cursor-pointer hover:text-[var(--accent)] transition-colors"
                                                        style={{ color: 'var(--nav-cat)' }}
                                                        onClick={() => {
                                                            if (pendingSortField === 'category') setPendingSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC');
                                                            else { setPendingSortField('category'); setPendingSortOrder('ASC'); }
                                                        }}
                                                    >
                                                        Service {pendingSortField === 'category' && (pendingSortOrder === 'ASC' ? '↑' : '↓')}
                                                    </p>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-right" style={{ color: 'var(--nav-cat)' }}>Actions</p>
                                                </div>
                                                {paginatedPending.map((a, idx) => (
                                                    <div key={a.id}
                                                        className="grid grid-cols-[6px_1.5fr_1.5fr_1fr_1.2fr_0.8fr_1.2fr] items-center px-5 py-3.5 gap-3 group transition-colors"
                                                        style={{
                                                            background: 'transparent',
                                                            borderBottom: idx < paginatedPending.length - 1 ? '1px solid var(--card-border)' : 'none',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-subtle)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F59E0B' }} />
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden"
                                                                style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                                                                {a.profiles?.profile_picture_url ? (
                                                                    <img src={a.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    (a.requester_name || '?')[0].toUpperCase()
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.requester_name || 'Unknown'}</p>
                                                                <p className="text-[10px] font-medium" style={{ color: 'var(--nav-cat)' }}>#{a.requester_student_number}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-[13px] truncate" style={{ color: 'var(--nav-text)' }} title={a.visit_reason}>
                                                            {a.visit_reason && a.visit_reason.length > 20 ? `${a.visit_reason.slice(0, 20)}…` : (a.visit_reason || '—')}
                                                        </p>
                                                        <p className="text-[12px]" style={{ color: 'var(--nav-text)' }}>{a.contact_number || '—'}</p>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={12} style={{ color: 'var(--nav-cat)', flexShrink: 0 }} />
                                                            <p className="text-[12px]" style={{ color: 'var(--nav-text)' }}>{formatDate(a.request_timestamp)}</p>
                                                        </div>
                                                        <div className="flex justify-start">
                                                            <span className="w-fit inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                                                                style={{
                                                                    background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)',
                                                                    color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669'
                                                                }}>
                                                                {(a.category || 'General').split(' ')[0]}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button onClick={() => setRejectDialog(a)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-red-50" style={{ color: '#E25C5C', background: 'rgba(226,92,92,0.07)', border: '1px solid rgba(226,92,92,0.15)' }}>Decline</button>
                                                            <button onClick={() => setAcceptModal(a)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest text-white transition-all shadow-md active:scale-95" style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                                                                <ShieldCheck size={12} /> Schedule
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                </div>

                                {/* Grid View - Always Visible on Mobile */}
                                <div className="appt-grid-mobile-always">
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                                        {paginatedPending.map(a => (
                                            <div key={a.id} className="appointment-card group" style={{ padding: '14px', gap: '10px' }}>
                                                {/* Row 1: Status studentnumber DATE    Appointment categ */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="status-badge-modern status-badge-pending" style={{ fontSize: '9px', padding: '2px 8px' }}>Pending</span>
                                                        <span className="text-[10px] font-bold text-slate-400">#{a.requester_student_number}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase flex-1 text-center truncate px-2" title={formatDate(a.request_timestamp)}>
                                                        {formatDate(a.request_timestamp)}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0"
                                                        style={{ 
                                                            background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)', 
                                                            color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669', 
                                                            border: '1px solid currentColor' 
                                                        }}>
                                                        {(a.category || 'General').split(' ')[0]}
                                                    </span>
                                                </div>

                                                {/* Row 2: avatar name contact num */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden"
                                                            style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                                                            {a.profiles?.profile_picture_url ? (
                                                                <img src={a.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                (a.requester_name || '?')[0].toUpperCase()
                                                            )}
                                                        </div>
                                                        <h3 className="text-[14px] font-bold truncate text-slate-800" style={{ margin: 0 }}>{a.requester_name || 'Unknown Patient'}</h3>
                                                    </div>
                                                    <span className="text-[12px] font-semibold text-slate-600 shrink-0">{a.contact_number || '—'}</span>
                                                </div>

                                                {/* Row 3: Reason */}
                                                <div className="appointment-card-body p-0" style={{ gap: '0', minWidth: 0 }}>
                                                    <p className="text-[12px] px-3 py-2 rounded-xl italic leading-relaxed truncate" 
                                                       style={{ color: 'var(--nav-text)', background: 'var(--bg-wash)', border: '1px solid var(--card-border)', margin: 0, width: '100%' }}
                                                       title={a.visit_reason}>
                                                        "{a.visit_reason}"
                                                    </p>
                                                </div>

                                                {/* Row 4: Action buttons */}
                                                <div className="appointment-card-footer mt-0.5 pt-2 flex gap-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                                                    <button 
                                                        onClick={() => setRejectDialog(a)} 
                                                        className="flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-50" 
                                                        style={{ color: '#E25C5C', background: 'rgba(226,92,92,0.05)', border: '1px solid rgba(226,92,92,0.15)' }}
                                                    >
                                                        Decline
                                                    </button>
                                                    <button 
                                                        onClick={() => setAcceptModal(a)} 
                                                        className="flex-[2] flex items-center justify-center gap-2 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-md active:scale-95" 
                                                        style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}
                                                    >
                                                        <ShieldCheck size={12} /> Schedule
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-auto px-2 py-6 flex items-center justify-between border-t border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Showing <span className="text-slate-900">{Math.min(itemsPerPage, filteredPending.length - (currentPage - 1) * itemsPerPage)}</span> of <span className="text-slate-900">{filteredPending.length}</span> Results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                                style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all  ${currentPage === page ? 'bg-[var(--accent)] text-white shadow-md scale-110' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                                style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'accepted' ? (
                <div className="min-h-[500px] flex flex-col">
                    <div className="flex-1">
                        {paginatedAccepted.length === 0 ? (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                                <ShieldCheck size={48} className="mb-4" style={{ color: 'var(--nav-cat)' }} />
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--nav-cat)' }}>No scheduled appointments</h3>
                                <p className="text-xs mt-1" style={{ color: 'var(--nav-cat)' }}>Confirmed appointments will appear here.</p>
                            </div>
                        ) : (
                            <>
                                {/* Table View - Hidden on Mobile */}
                                <div className="appt-table-list-wrapper">
                                        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                            {/* Table header */}
                                            <div className="grid grid-cols-[6px_1.5fr_1.5fr_120px_110px_120px_120px_minmax(100px,auto)] items-center px-5 py-3 gap-3"
                                                style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--card-border)' }}>
                                                <div />
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Patient</p>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Reason</p>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] cursor-pointer hover:text-[var(--accent)] transition-colors"
                                                    style={{ color: 'var(--nav-cat)' }}
                                                    onClick={() => {
                                                        if (acceptedSortField === 'date') setAcceptedSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC');
                                                        else { setAcceptedSortField('date'); setAcceptedSortOrder('DESC'); }
                                                    }}
                                                >
                                                    Date {acceptedSortField === 'date' && (acceptedSortOrder === 'ASC' ? '↑' : '↓')}
                                                </p>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Time</p>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Location</p>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] cursor-pointer hover:text-[var(--accent)] transition-colors"
                                                    style={{ color: 'var(--nav-cat)' }}
                                                    onClick={() => {
                                                        if (acceptedSortField === 'category') setAcceptedSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC');
                                                        else { setAcceptedSortField('category'); setAcceptedSortOrder('ASC'); }
                                                    }}
                                                >
                                                    Service {acceptedSortField === 'category' && (acceptedSortOrder === 'ASC' ? '↑' : '↓')}
                                                </p>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-right" style={{ color: 'var(--nav-cat)' }}>Actions</p>
                                            </div>
                                            {paginatedAccepted.map((a, idx) => {
                                                const schedDate = new Date(a.appointment_sched);
                                                const isPast = schedDate < new Date();
                                                return (
                                                    <div key={a.id}
                                                        className="grid grid-cols-[6px_1.5fr_1.5fr_120px_110px_120px_120px_minmax(100px,auto)] items-center px-5 py-3.5 gap-3 group transition-colors cursor-pointer"
                                                        style={{
                                                            background: 'transparent',
                                                            borderBottom: idx < paginatedAccepted.length - 1 ? '1px solid var(--card-border)' : 'none',
                                                        }}
                                                        onClick={() => setViewAcceptedModal(a)}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-subtle)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        {/* Left indicator dot */}
                                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                            style={{ background: isPast ? '#6B7280' : '#10B981' }} />

                                                        {/* Patient */}
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden"
                                                                style={{ background: isPast ? 'linear-gradient(135deg,#94A3B8,#64748B)' : 'linear-gradient(135deg,#3BACED,#1E87C8)' }}>
                                                                {a.profiles?.profile_picture_url ? (
                                                                    <img src={a.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    (a.requester_name || '?')[0].toUpperCase()
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.requester_name || 'Unknown'}</p>
                                                                <p className="text-[10px] font-medium" style={{ color: 'var(--nav-cat)' }}>#{a.requester_student_number}</p>
                                                            </div>
                                                        </div>

                                                        {/* Reason — truncate at 20 chars */}
                                                        <p className="text-[12px] truncate italic" style={{ color: 'var(--nav-cat)' }}
                                                            title={a.visit_reason}>
                                                            {a.visit_reason && a.visit_reason.length > 20
                                                                ? `${a.visit_reason.slice(0, 20)}…`
                                                                : (a.visit_reason || '—')}
                                                        </p>

                                                        {/* Date */}
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
                                                            <Calendar size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                            <p className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>{formatDate(a.appointment_sched)}</p>
                                                        </div>

                                                        {/* Time */}
                                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md w-fit bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent-subtle)] shadow-sm">
                                                            {formatTime(a.appointment_sched)}
                                                        </span>

                                                        {/* Location */}
                                                        <div className="flex items-center gap-1">
                                                            <MapPin size={12} className="text-slate-400" />
                                                            <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{a.campus}</p>
                                                        </div>

                                                        {/* Service */}
                                                        <span className="w-fit inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight"
                                                            style={{
                                                                background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)',
                                                                color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669'
                                                            }}>
                                                            {(a.category || 'General').split(' ')[0]}
                                                        </span>

                                                        {/* Actions */}
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setViewAcceptedModal(a); }}
                                                                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                                                                style={{ background: 'var(--bg-wash)', color: 'var(--nav-text)', border: '1px solid var(--card-border)' }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.color = 'var(--accent)'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-wash)'; e.currentTarget.style.color = 'var(--nav-text)'; }}
                                                            >
                                                                Manage
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                </div>

                                {/* Grid View - Always Visible on Mobile */}
                                <div className="appt-grid-mobile-always">
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                                        {paginatedAccepted.map(a => {
                                            const schedDate = new Date(a.appointment_sched);
                                            const isPast = schedDate < new Date();
                                            return (
                                                <div key={a.id} className="appointment-card group" style={{ padding: '12px', gap: '12px' }}>
                                                    {/* Row 1: Status stud number category */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`ds-status ${isPast ? 'ds-status--success' : 'ds-status--accepted'}`} style={{ fontSize: '9px', padding: '2px 8px', ... (isPast ? { background: '#D1FAE5', color: '#065F46' } : {}) }}>
                                                                {isPast ? 'Completed' : 'Upcoming'}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{a.campus}</span>
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border"
                                                            style={{
                                                                background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)',
                                                                color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669',
                                                                borderColor: 'currentColor'
                                                            }}>
                                                            {(a.category || 'General').split(' ')[0]}
                                                        </span>
                                                    </div>

                                                    {/* Row 2: profilepic name campus */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-sm"
                                                            style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                                                            {a.profiles?.profile_picture_url ? (
                                                                 <img src={a.profiles.profile_picture_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                (a.requester_name || '?')[0].toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-[14px] font-bold truncate text-slate-800" style={{ margin: 0 }}>{a.requester_name || 'Unknown Patient'}</h3>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <span className="text-[10px] font-bold text-slate-400">#{a.requester_student_number}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Row 3: date time */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-100" style={{ background: 'var(--bg-wash)' }}>
                                                            <Calendar size={12} className="text-[var(--accent)] shrink-0" />
                                                            <p className="text-[11px] font-bold text-slate-700">{formatDate(a.appointment_sched)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-100" style={{ background: 'var(--bg-wash)' }}>
                                                            <Clock size={12} className="text-[var(--accent)] shrink-0" />
                                                            <p className="text-[11px] font-bold text-slate-700">{formatTime(a.appointment_sched)}</p>
                                                        </div>
                                                    </div>

                                                    {/* Row 4: Manage buttons */}
                                                    <div className="appointment-card-footer mt-0.5 pt-2 border-t border-slate-100">
                                                        <button onClick={() => setViewAcceptedModal(a)} className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95" style={{ background: 'var(--bg-wash)', color: 'var(--nav-text)', border: '1px solid var(--card-border)' }}>
                                                            Manage Appointment
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-8 px-2 py-6 flex items-center justify-between border-t border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Showing <span className="text-slate-900">{Math.min(itemsPerPage, filteredAccepted.length - (currentPage - 1) * itemsPerPage)}</span> of <span className="text-slate-900">{filteredAccepted.length}</span> Results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-slate-200 hover:bg-slate-50 transition-all "
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all  ${currentPage === page ? 'bg-[var(--accent)] text-white shadow-md scale-110 shadow-[var(--accent-subtle)]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-slate-200 hover:bg-slate-50 transition-all "
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="calendar-view-container fade-in">
                    <AppointmentsCalendarWidget />
                </div>
            )}

            {/* Accept Appointment Modal */}
            {acceptModal && (
                <AcceptAppointmentModal
                    appointment={acceptModal}
                    onClose={() => setAcceptModal(null)}
                    onConfirm={handleAccept}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Reject Confirmation */}
            {rejectDialog && (
                <RejectAppointmentModal
                    appointment={rejectDialog}
                    onClose={() => setRejectDialog(null)}
                    onConfirm={handleReject}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Expand Reason Modal */}
            {reasonModal && (
                <ExpandReasonModal
                    appointment={reasonModal}
                    onClose={() => setReasonModal(null)}
                />
            )}

            {/* Send Back Confirmation */}
            {sendBackConfirm && (
                <RejectAppointmentModal
                    appointment={{ ...sendBackConfirm, requester_name: sendBackConfirm.requester_name }}
                    title="Send Back Appointment"
                    description="Are you sure you want to send this confirmed appointment back to pending status? A reason is required."
                    actionLabel="Send Back"
                    onClose={() => {
                        const original = sendBackConfirm;
                        setSendBackConfirm(null);
                        setViewAcceptedModal(original);
                    }}
                    onConfirm={(reason: string) => handleSendBack(reason)}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* View Accepted Modal */}
            {viewAcceptedModal && (
                <ViewAcceptedAppointmentModal
                    appointment={viewAcceptedModal}
                    campuses={campuses}
                    onClose={() => setViewAcceptedModal(null)}
                    onSendBack={() => {
                        setSendBackConfirm(viewAcceptedModal);
                        setViewAcceptedModal(null);
                    }}
                    setSuccessToast={setSuccessToast}
                />
            )}

            {successToast.show && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                    <div className="bg-white rounded-2xl shadow-2xl px-6 py-3 border border-emerald-100 flex items-center gap-3 animate-bounce-subtle">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <ShieldCheck size={18} strokeWidth={3} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">{successToast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
