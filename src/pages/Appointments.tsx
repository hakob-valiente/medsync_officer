import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Calendar, Search, Filter, Clock, MapPin,
    ShieldCheck, X, ChevronDown, LayoutGrid, List, User, RotateCcw,
    School
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import {
    fetchAppointmentsFromDB,
    fetchAcceptedAppointmentsFromDB,
    updateAppointmentStatusDB,
    addAcceptedAppointmentDB,
    updateAcceptedAppointmentDB,
    sendBackAppointmentDB,
    addLog
} from '../store';
import { format } from 'date-fns';
import { notifyIndividual } from '../lib/notifications';



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

function parseTimeTo24h(time12h: string) {
    if (!time12h) return '09:00';
    const [time, period] = time12h.split(' ');
    let [h, m] = time.split(':');
    let hh = parseInt(h);
    if (period === 'PM' && hh < 12) hh += 12;
    if (period === 'AM' && hh === 12) hh = 0;
    return `${hh.toString().padStart(2, '0')}:${m}`;
}

function parseTimeFrom24h(time24h: string) {
    if (!time24h) return '09:00 AM';
    let [h, m] = time24h.split(':');
    let hh = parseInt(h);
    const period = hh >= 12 ? 'PM' : 'AM';
    let displayH = hh % 12;
    if (displayH === 0) displayH = 12;
    return `${displayH.toString().padStart(2, '0')}:${m} ${period}`;
}

function ScrollableColumn({ options, value, onChange, label, className }: { options: string[], value: string, onChange: (val: string) => void, label: string, className?: string }) {
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const index = options.indexOf(value);
        if (e.deltaY > 0) {
            // Scroll down -> next value
            onChange(options[(index + 1) % options.length]);
        } else {
            // Scroll up -> prev value
            onChange(options[(index - 1 + options.length) % options.length]);
        }
    };

    return (
        <div
            onWheel={handleWheel}
            className={`flex-1 flex flex-col items-center py-5 cursor-ns-resize transition-all hover:bg-black/5 select-none ${className}`}
        >
            <span className="text-[9px] uppercase font-black tracking-tighter mb-1.5 opacity-40">{label}</span>
            <span className="text-sm font-bold tracking-tight">{value}</span>
        </div>
    );
}

function TimeWheelPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const time12h = parseTimeFrom24h(value);
    const parts = time12h.split(' ');
    const hPart = parts[0].split(':')[0];
    const mPart = parts[0].split(':')[1];
    const pPart = parts[1];

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = ['00', '30'];
    const periods = ['AM', 'PM'];

    const handleChange = (newH: string, newM: string, newP: string) => {
        onChange(parseTimeTo24h(`${newH}:${newM} ${newP}`));
    };

    return (
        <div className="flex items-center rounded-2xl bg-[var(--bg-wash)] border border-[var(--border-light)] overflow-hidden shadow-inner">
            <ScrollableColumn
                label="Hour"
                options={hours}
                value={hPart}
                onChange={val => handleChange(val, mPart, pPart)}
            />
            <div className="w-[1px] h-10 bg-[var(--border-light)]" />
            <ScrollableColumn
                label="Min"
                options={minutes}
                value={mPart}
                onChange={val => handleChange(hPart, val, pPart)}
            />
            <div className="w-[1px] h-10 bg-[var(--border-light)]" />
            <ScrollableColumn
                label="Period"
                options={periods}
                value={pPart}
                onChange={val => handleChange(hPart, mPart, val)}
                className="text-[var(--accent)]"
            />
        </div>
    );
}

export default function Appointments() {
    const { appointments, acceptedAppointments, campuses, users } = useStore();
    const [activeTab, setActiveTab] = useState<'pending' | 'accepted'>('pending');
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

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

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

            const matchesCategory = categoryFilter === 'ALL' || (a.category || '').toUpperCase().includes(categoryFilter);
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

            const matchesCategory = categoryFilter === 'ALL' || (a.category || '').toUpperCase().includes(categoryFilter);
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
                        className="px-5 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all duration-200"
                        style={{
                            background: activeTab === 'pending' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'pending' ? '#fff' : 'var(--nav-cat)',
                            boxShadow: activeTab === 'pending' ? '0 2px 8px rgba(59,172,237,0.30)' : 'none',
                        }}
                    >
                        Pending Appointments
                        {filteredPending.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
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
                        className="px-5 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all duration-200"
                        style={{
                            background: activeTab === 'accepted' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'accepted' ? '#fff' : 'var(--nav-cat)',
                            boxShadow: activeTab === 'accepted' ? '0 2px 8px rgba(59,172,237,0.30)' : 'none',
                        }}
                    >
                        Scheduled
                    </button>
                </div>
            </div>

            {/* Filters */}
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
                    <div className="relative min-w-[160px]">
                        <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="appearance-none w-full pl-10 pr-10 py-2.5 text-xs font-semibold rounded-xl outline-none transition-colors shadow-sm"
                            style={{
                                background: 'var(--bg-wash)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="ALL">All Services</option>
                            <option value="MEDICAL">General</option>
                            <option value="DENTAL">Dental</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" style={{ color: 'var(--text-faint)' }} />
                    </div>

                    {activeTab === 'accepted' && (
                        <div className="relative min-w-[180px]">
                            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                            <select
                                value={campusFilter}
                                onChange={(e) => setCampusFilter(e.target.value)}
                                className="appearance-none w-full pl-10 pr-10 py-2.5 text-xs font-semibold rounded-xl outline-none transition-colors shadow-sm"
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

                    <div className="relative min-w-[170px]">
                        <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-faint)' }} />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="appearance-none w-full pl-11 pr-10 py-2.5 text-xs font-bold rounded-xl outline-none transition-all shadow-sm"
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

                {/* View Switcher */}
                <div className="flex items-center p-1.5 rounded-xl bg-slate-100/50 border border-slate-200 shadow-inner ml-auto self-end md:self-center">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="List View"
                    >
                        <List size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </div>

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
                        ) : viewMode === 'list' ? (
                            <div className="rounded-2xl overflow-hidden flex flex-col min-h-[500px]" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                <div className="flex-1">
                                <div className="grid grid-cols-[6px_1.5fr_1.5fr_1fr_1.2fr_0.8fr_1.2fr] items-center px-5 py-3 gap-3"
                                    style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--card-border)' }}>
                                    <div />
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Patient</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Reason</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Contact</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] cursor-pointer hover:text-[var(--accent)] transition-colors" 
                                        style={{ color: 'var(--nav-cat)' }}
                                        onClick={() => {
                                            if (pendingSortField === 'date') setPendingSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC');
                                            else { setPendingSortField('date'); setPendingSortOrder('DESC'); }
                                        }}
                                    >
                                        Submitted {pendingSortField === 'date' && (pendingSortOrder === 'ASC' ? '↑' : '↓')}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] cursor-pointer hover:text-[var(--accent)] transition-colors" 
                                        style={{ color: 'var(--nav-cat)' }}
                                        onClick={() => {
                                            if (pendingSortField === 'category') setPendingSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC');
                                            else { setPendingSortField('category'); setPendingSortOrder('ASC'); }
                                        }}
                                    >
                                        Service {pendingSortField === 'category' && (pendingSortOrder === 'ASC' ? '↑' : '↓')}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-right" style={{ color: 'var(--nav-cat)' }}>Actions</p>
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
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                                                {(a.requester_name || '?')[0].toUpperCase()}
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
                                            <button onClick={() => setRejectDialog(a)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-red-50" style={{ color: '#E25C5C', background: 'rgba(226,92,92,0.07)', border: '1px solid rgba(226,92,92,0.15)' }}>Decline</button>
                                            <button onClick={() => setAcceptModal(a)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white transition-all shadow-md active:scale-95" style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                                                <ShieldCheck size={12} /> Schedule
                                            </button>
                                        </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                                {paginatedPending.map(a => (
                                    <div key={a.id} className="appointment-card group">
                                        <div className="appointment-card-header">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="status-badge-modern status-badge-pending">Pending</span>
                                                    <span className="text-[10px] font-medium tracking-widest" style={{ color: 'var(--nav-cat)' }}>#{a.requester_student_number}</span>
                                                </div>
                                                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.requester_name || 'Unknown Patient'}</h3>
                                            </div>
                                            <span className="text-[9px] font-semibold uppercase px-2 py-1 rounded-md"
                                                style={{ background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)', color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669' }}>
                                                {(a.category || 'General').split(' ')[0]}
                                            </span>
                                        </div>
                                        <div className="appointment-card-body space-y-3">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <span>Visit Reason</span>
                                                <span className="text-[11px] font-medium text-slate-600">{a.contact_number || 'No Contact'}</span>
                                            </div>
                                            <p className="text-xs px-3 py-2.5 rounded-xl italic" style={{ color: 'var(--nav-text)', background: 'var(--bg-wash)', border: '1px solid var(--card-border)' }}>
                                                "{a.visit_reason}"
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} style={{ color: 'var(--nav-cat)' }} />
                                                <span className="text-[11px] font-bold text-slate-500">{formatDate(a.request_timestamp)}</span>
                                            </div>
                                        </div>
                                        <div className="appointment-card-footer flex gap-2">
                                            <button onClick={() => setRejectDialog(a)} className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-50" style={{ color: '#E25C5C', border: '1px solid rgba(226,92,92,0.2)' }}>Decline</button>
                                            <button onClick={() => setAcceptModal(a)} className="flex-[2] flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-md active:scale-95" style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}>
                                                <ShieldCheck size={12} /> Schedule
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-auto px-2 py-6 flex items-center justify-between border-t border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Showing <span className="text-slate-900">{Math.min(itemsPerPage, (activeTab === 'pending' ? filteredPending : filteredAccepted).length - (currentPage - 1) * itemsPerPage)}</span> of <span className="text-slate-900">{(activeTab === 'pending' ? filteredPending : filteredAccepted).length}</span> Results
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
            ) : (
                <div className="min-h-[500px] flex flex-col">
                    <div className="flex-1">
                        {paginatedAccepted.length === 0 ? (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                                <ShieldCheck size={48} className="mb-4" style={{ color: 'var(--nav-cat)' }} />
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--nav-cat)' }}>No scheduled appointments</h3>
                                <p className="text-xs mt-1" style={{ color: 'var(--nav-cat)' }}>Confirmed appointments will appear here.</p>
                            </div>
                        ) : viewMode === 'list' ? (
                            /* ── ACCEPTED TABLE ROWS ── */
                            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                {/* Table header */}
                                <div className="grid grid-cols-[6px_1.5fr_1.5fr_120px_110px_120px_120px_minmax(100px,auto)] items-center px-5 py-3 gap-3"
                                    style={{ background: 'var(--bg-wash)', borderBottom: '1px solid var(--card-border)' }}>
                                    <div />
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Patient</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Reason</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] cursor-pointer hover:text-[var(--accent)] transition-colors" 
                                        style={{ color: 'var(--nav-cat)' }}
                                        onClick={() => {
                                            if (acceptedSortField === 'date') setAcceptedSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC');
                                            else { setAcceptedSortField('date'); setAcceptedSortOrder('DESC'); }
                                        }}
                                    >
                                        Date {acceptedSortField === 'date' && (acceptedSortOrder === 'ASC' ? '↑' : '↓')}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Time</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nav-cat)' }}>Location</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] cursor-pointer hover:text-[var(--accent)] transition-colors" 
                                        style={{ color: 'var(--nav-cat)' }}
                                        onClick={() => {
                                            if (acceptedSortField === 'category') setAcceptedSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC');
                                            else { setAcceptedSortField('category'); setAcceptedSortOrder('ASC'); }
                                        }}
                                    >
                                        Service {acceptedSortField === 'category' && (acceptedSortOrder === 'ASC' ? '↑' : '↓')}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-right" style={{ color: 'var(--nav-cat)' }}>Actions</p>
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
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                    style={{ background: isPast ? 'linear-gradient(135deg,#94A3B8,#64748B)' : 'linear-gradient(135deg,#3BACED,#1E87C8)' }}>
                                                    {(a.requester_name || '?')[0].toUpperCase()}
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
                        ) : (
                            /* ── GRID VIEW ── */
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                                {paginatedAccepted.map(a => {
                                    const schedDate = new Date(a.appointment_sched);
                                    const isPast = schedDate < new Date();
                                    return (
                                        <div key={a.id} className="appointment-card group">
                                            <div className="appointment-card-header">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`ds-status ${isPast ? 'ds-status--success' : 'ds-status--accepted'}`} style={isPast ? { background: '#D1FAE5', color: '#065F46' } : {}}>{isPast ? 'Completed' : 'Upcoming'}</span>
                                                        <span className="text-[10px] font-medium" style={{ color: 'var(--nav-cat)' }}>#{a.requester_student_number}</span>
                                                    </div>
                                                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.requester_name || 'Unknown Patient'}</h3>
                                                </div>
                                                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                                    {formatTime(a.appointment_sched)}
                                                </span>
                                            </div>
                                            <div className="appointment-card-body space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--bg-wash)', border: '1px solid var(--card-border)' }}>
                                                        <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                        <div>
                                                            <p className="text-[8px] uppercase font-black tracking-widest text-[#94A3B8]">Date</p>
                                                            <p className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(a.appointment_sched)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--bg-wash)', border: '1px solid var(--card-border)' }}>
                                                        <Clock size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                        <div>
                                                            <p className="text-[8px] uppercase font-black tracking-widest text-[#94A3B8]">Time</p>
                                                            <p className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{formatTime(a.appointment_sched)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                                                            <School size={14} className="text-[var(--accent)]" />
                                                        </span>
                                                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>{a.campus}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md"
                                                        style={{
                                                            background: (a.category || '').toLowerCase().includes('dental') ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)',
                                                            color: (a.category || '').toLowerCase().includes('dental') ? '#2563EB' : '#059669'
                                                        }}>
                                                        {(a.category || 'General').split(' ')[0]}
                                                    </span>
                                            </div>
                                            </div>
                                            <div className="appointment-card-footer">
                                                <button onClick={() => setViewAcceptedModal(a)} className="w-full py-2 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'var(--bg-wash)', color: 'var(--nav-text)', border: '1px solid var(--card-border)' }}>
                                                    Manage Appointment
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
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

function ExpandReasonModal({ appointment, onClose }: any) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div
                className="rounded-3xl w-full max-w-md fade-in overflow-hidden border border-white/20 shadow-2xl"
                style={{
                    background: 'var(--card-bg)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex items-center justify-between border-b border-slate-100"
                    style={{ background: 'var(--bg-wash)' }}>
                    <div>
                        <h3 className="text-lg font-extrabold text-[var(--text-primary)]" style={{ fontFamily: 'Poppins' }}>Request Insight</h3>
                        <p
                            className="text-[10px] font-black uppercase tracking-widest mt-0.5"
                            style={{ color: 'var(--text-muted)', opacity: 0.85 }}
                        >
                            Full statement from patient
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex items-center gap-3 mb-6 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-blue-900 leading-none">{appointment.requester_name}</p>
                            <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wider">{appointment.category || 'Medical Request'}</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-[var(--accent)] rounded-full opacity-20" />
                        <p className="text-sm italic font-medium leading-relaxed text-slate-600 pl-2">
                            "{appointment.visit_reason}"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RejectAppointmentModal({ appointment, onClose, onConfirm, isSubmitting, title, description, actionLabel }: any) {
    const [reason, setReason] = useState('');

    const modalTitle = title || "Decline Appointment";
    const modalDesc = description || "Are you sure you want to decline this appointment? This action will notify the patient immediately.";
    const btnLabel = actionLabel || "Decline Request";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div
                className="rounded-3xl w-full max-w-md fade-in overflow-hidden border border-white/20 shadow-2xl"
                style={{
                    background: 'var(--card-bg)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex items-center justify-between border-b border-red-50"
                    style={{ background: 'var(--danger-bg)' }}>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight text-red-900">{modalTitle}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-700/60 mt-0.5">
                            Target: {appointment.requester_name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-red-900/40">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="p-4 rounded-2xl border border-red-100 bg-red-50/50">
                        <p className="text-xs text-red-800 leading-relaxed font-medium">
                            {modalDesc}
                        </p>
                    </div>

                    <div>
                        <label
                            className="block text-[10px] font-black uppercase tracking-widest mb-2 ml-1"
                            style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                        >
                            Reason for Rejection
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Please provide a brief explanation to the patient..."
                            className="w-full rounded-2xl px-5 py-4 text-sm font-medium outline-none transition-all min-h-[120px] resize-none border border-slate-100 bg-slate-50 focus:bg-white focus:border-red-200 focus:shadow-inner"
                        />
                    </div>
                </div>

                <div className="p-6 flex gap-3 border-t border-slate-50" style={{ background: 'var(--bg-wash)' }}>
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-100"
                    >
                        Keep Request
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-[2] py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:scale-100 "
                        style={{ background: 'var(--danger)', color: 'white' }}
                    >
                        {isSubmitting ? 'DECLINING...' : btnLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AcceptAppointmentModal({ appointment, onClose, onConfirm, isSubmitting }: any) {
    const { campuses, acceptedAppointments } = useStore();
    const contactNumber = appointment.contact_number || 'N/A';

    const [form, setForm] = useState({
        date: '',
        time: '',
        nurse_assigned: 'Nurse Sarah',
        campus: campuses[0]?.name || 'Main',
        category: appointment.category || 'Medical'
    });

    const findNearest = () => {
        let current = new Date();
        current.setMinutes(current.getMinutes() > 30 ? 60 : (current.getMinutes() > 0 ? 30 : 0));
        current.setSeconds(0, 0);

        for (let d = 0; d < 14; d++) {
            let day = new Date(current);
            day.setDate(day.getDate() + d);
            const dateStr = day.toISOString().split('T')[0];

            let startH = (d === 0) ? Math.max(7, day.getHours()) : 7;
            for (let h = startH; h < 17; h++) {
                for (let m of [0, 30]) {
                    if (d === 0 && h === day.getHours() && day.getMinutes() > m) continue;
                    const tStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    const isBooked = acceptedAppointments.some(a =>
                        a.campus === form.campus &&
                        a.appointment_sched?.startsWith(dateStr) &&
                        a.appointment_sched?.includes(tStr)
                    );
                    if (!isBooked) {
                        setForm(p => ({ ...p, date: dateStr, time: tStr }));
                        return;
                    }
                }
            }
        }
    };

    useEffect(() => {
        findNearest();
    }, [form.campus]);

    const allSlotsWithStatus = useMemo(() => {
        if (!form.date || !form.campus) return [];
        
        const slots = [];
        for (let h = 7; h < 17; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`);
        }
        slots.push('17:00');

        const booked = acceptedAppointments
            .filter(a => a.campus === form.campus && a.appointment_sched?.startsWith(form.date))
            .map(a => {
                try { 
                    const d = new Date(a.appointment_sched);
                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                } catch { return ''; }
            });
        
        const now = new Date();

        return slots.map(t => {
            let status = 'available';
            if (booked.includes(t)) status = 'occupied';
            
            const checkDate = new Date(`${form.date}T${t}:00`);
            if (!isNaN(checkDate.getTime()) && now > checkDate) {
                status = 'finished';
            }
            return { time: t, status };
        });
    }, [form.date, form.campus, acceptedAppointments]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl w-full max-w-xl fade-in overflow-hidden shadow-2xl border border-white/20" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100" style={{ background: 'var(--bg-wash)' }}>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Schedule Appointment</h3>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Booking Confirmation for {appointment.requester_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-slate-400"><X size={22} /></button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Info Summary */}
                    <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shadow-lg">
                                    <ShieldCheck size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-slate-900 truncate">{appointment.requester_name}</h4>
                                    <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mt-0.5">#{appointment.requester_student_number}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-600 truncate">{contactNumber}</span>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-100 italic text-[11px] leading-relaxed text-slate-500">
                                    "{appointment.visit_reason}"
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4
                                    className="text-[10px] uppercase font-black tracking-widest ml-1"
                                    style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                                >
                                    Staff Assignment
                                </h4>
                            </div>
                            <div className="space-y-2">
                                <label
                                    className="block text-[9px] uppercase font-black ml-1 mb-1"
                                    style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                                >
                                    Assign Personnel
                                </label>
                                <select
                                    value={form.nurse_assigned}
                                    onChange={e => setForm(p => ({ ...p, nurse_assigned: e.target.value }))}
                                    className="w-full rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50 border border-slate-200 shadow-sm outline-none focus:bg-white focus:border-[var(--accent)] transition-all"
                                >
                                    <option value="Nurse Sarah">Nurse Sarah</option>
                                    <option value="Nurse Abby">Nurse Abby</option>
                                    <option value="Dr. Garcia">Dr. Garcia</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Right: Booking Details */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4
                                className="text-[10px] uppercase font-black tracking-widest ml-1"
                                style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                            >
                                Schedule Details
                            </h4>
                            <button onClick={findNearest} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 hover:bg-emerald-500 hover:text-white transition-all active:scale-95">
                                <Clock size={12} /> Suggest Slot
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label
                                    className="block text-[9px] uppercase font-black ml-1 mb-1"
                                    style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                                >
                                    Location / Campus
                                </label>
                                <select value={form.campus} onChange={e => setForm(p => ({ ...p, campus: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-[var(--accent)] transition-all">{campuses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                            </div>
                            <div>
                                <label
                                    className="block text-[9px] uppercase font-black ml-1 mb-1"
                                    style={{ color: 'var(--text-muted)', opacity: 0.9 }}
                                >
                                    Appointment Date
                                </label>
                                <input type="date" value={form.date} min={new Date().toLocaleDateString('en-CA')} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-[var(--accent)] transition-all" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5 ml-1">
                                    <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Time Slot Selection</label>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                                        <Clock size={10} />
                                        <span className="text-[8px] font-black uppercase">07:00 AM - 05:00 PM</span>
                                    </div>
                                </div>
                                <TimeWheelPicker value={form.time || '07:00'} onChange={v => setForm(p => ({ ...p, time: v }))} />
                            </div>
                        </div>

                        {form.time && allSlotsWithStatus.find(x => x.time === form.time)?.status !== 'available' ? (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-500 border border-red-100 animate-pulse">
                                <X size={14} className="shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {allSlotsWithStatus.find(x => x.time === form.time)?.status === 'occupied' ? 'This slot is already occupied' : 'This slot is already finished/past'}
                                </span>
                            </div>
                        ) : form.time && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Selected Slot is Available</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-200 bg-white"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={() => onConfirm(form)}
                        disabled={!form.date || !form.time || allSlotsWithStatus.find(x => x.time === form.time)?.status !== 'available' || isSubmitting}
                        className="flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-[var(--accent-subtle)] active:scale-95 disabled:opacity-40 disabled:shadow-none"
                        style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}
                    >
                        {isSubmitting ? 'Confirming...' : 'Schedule Appointment'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ViewAcceptedAppointmentModal({ appointment, campuses, onClose, onSendBack, setSuccessToast }: any) {
    const { acceptedAppointments } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Parse existing date/time safely
    const existingDate = new Date(appointment.appointment_sched);
    const initDate = existingDate.toLocaleDateString('en-CA') !== 'Invalid Date' ? existingDate.toLocaleDateString('en-CA') : '';
    const initTime = !isNaN(existingDate.getTime()) ? `${existingDate.getHours().toString().padStart(2, '0')}:${existingDate.getMinutes().toString().padStart(2, '0')}` : '';

    const [form, setForm] = useState({
        date: initDate,
        time: initTime,
        nurse_assigned: appointment.nurse_assigned || 'Nurse Abby',
        campus: appointment.campus || 'Main',
        editReason: 'Sudden Changes'
    });

    const findNearest = () => {
        let current = new Date();
        current.setMinutes(current.getMinutes() > 30 ? 60 : (current.getMinutes() > 0 ? 30 : 0));
        current.setSeconds(0, 0);

        for (let d = 0; d < 14; d++) {
            let day = new Date(current);
            day.setDate(day.getDate() + d);
            const dateStr = day.toISOString().split('T')[0];

            let startH = (d === 0) ? Math.max(7, day.getHours()) : 7;
            for (let h = startH; h < 17; h++) {
                for (let m of [0, 30]) {
                    if (d === 0 && h === day.getHours() && m < day.getMinutes()) continue;
                    const tStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    const isBooked = acceptedAppointments.some(a =>
                        a.id !== appointment.id &&
                        a.campus === form.campus &&
                        a.appointment_sched?.startsWith(dateStr) &&
                        a.appointment_sched?.includes(tStr)
                    );
                    if (!isBooked) {
                        setForm(p => ({ ...p, date: dateStr, time: tStr }));
                        return;
                    }
                }
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateAcceptedAppointmentDB(appointment.id, {
                nurse_assigned: form.nurse_assigned,
                appointment_sched: `${form.date}T${form.time}`,
                campus: form.campus,
                category: appointment.category
            }, form.editReason);

            await notifyIndividual(
                appointment.requester_id,
                'Appointment Update',
                `Your appointment has been rescheduled on ${format(new Date(form.date), 'MMM dd, yyyy')} at ${form.time}.`,
                'appointment_accepted',
                appointment.appointment_id
            );

            addLog('Admin', `Updated schedule for ${appointment.requester_name}`);
            setSuccessToast({ show: true, message: 'Schedule updated successfully!' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
            setIsEditing(false);
        } catch (e: any) {
            alert(e.message || 'Failed to update appointment');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        // Only trigger if campus changes while editing, not on initial edit entry
        // We can check if the current date/time still matches initial to avoid overwriting on first entry
        // Actually, the user wants it to stay at default. Let's only call findNearest via button trigger.
    }, [form.campus]);

    const allSlotsWithStatus = useMemo(() => {
        if (!form.date || !form.campus) return [];
        const slots = [];
        for (let h = 7; h < 17; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`);
        }
        slots.push('17:00');

        const booked = acceptedAppointments
            .filter(a => a.id !== appointment.id && a.campus === form.campus && a.appointment_sched?.startsWith(form.date))
            .map(a => {
                try { 
                    const d = new Date(a.appointment_sched);
                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                } catch { return ''; }
            });
        
        const now = new Date();

        return slots.map(t => {
            // IF it is the original appointment slot, treat it as available even if it's in the past
            if (form.date === initDate && t === initTime) {
                return { time: t, status: 'available' };
            }

            let status = 'available';
            if (booked.includes(t)) status = 'occupied';
            
            const checkDate = new Date(`${form.date}T${t}:00`);
            if (!isNaN(checkDate.getTime()) && now > checkDate) {
                status = 'finished';
            }
            return { time: t, status };
        });
    }, [form.date, form.campus, acceptedAppointments, appointment.id, initDate, initTime]);

    const isChanged = form.date !== initDate ||
        form.time !== initTime ||
        form.nurse_assigned !== (appointment.nurse_assigned || 'Nurse Abby') ||
        form.campus !== (appointment.campus || 'Main');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
            <div className="rounded-3xl w-full max-w-xl fade-in overflow-hidden shadow-2xl border border-white/20" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100" style={{ background: 'var(--bg-wash)' }}>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Appointment Details</h3>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Official Managed Record</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-slate-400"><X size={22} /></button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Patient Context Summary */}
                    <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${(appointment.profiles?.gender || appointment.profiles?.sex || 'Male').toLowerCase() === 'female'
                            ? 'bg-rose-500' : 'bg-blue-600'
                            } text-white`}>
                            <User size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-[var(--accent-light)] text-[var(--accent)] text-[9px] font-black uppercase tracking-wider">
                                    {(appointment.category || 'Med').split(' ')[0]}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 tracking-widest">#{appointment.requester_student_number}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-900 truncate">{appointment.requester_name}</h4>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">{appointment.contact_number || 'No contact provided'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Booking Details */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Schedule Information</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5">Campus Location</label>
                                    {isEditing ? (
                                        <select value={form.campus} onChange={e => setForm(p => ({ ...p, campus: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-100 border border-slate-200 outline-none focus:bg-white focus:border-[var(--accent)] transition-all">{campuses.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                                    ) : (
                                        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-50 text-sm font-extrabold text-slate-700 border border-slate-100"><MapPin size={16} className="text-slate-400" /> {form.campus}</div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="col-span-1">
                                        <div className="mb-1.5 ml-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Scheduled Date</label>
                                        </div>
                                        {isEditing ? (
                                            <input 
                                                type="date" 
                                                value={form.date} 
                                                min={new Date().toLocaleDateString('en-CA') > form.date ? form.date : new Date().toLocaleDateString('en-CA')} 
                                                onChange={e => setForm(p => ({ ...p, date: e.target.value }))} 
                                                className="w-full rounded-2xl px-5 py-4 text-sm font-bold bg-white border border-slate-200 outline-none focus:border-[var(--accent)] transition-all shadow-sm" 
                                            />
                                        ) : (
                                            <div className="px-5 py-4 rounded-3xl bg-slate-900 border border-slate-700 shadow-xl">
                                                <div className="flex items-center gap-2 mb-1 opacity-60">
                                                    <Calendar size={12} className="text-white" />
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-white">Date</p>
                                                </div>
                                                <p className="text-lg font-black text-white">{formatDate(form.date)}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1">
                                        <div className="mb-1.5 ml-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Designated Time</label>
                                        </div>
                                        {isEditing ? (
                                            <>
                                                <TimeWheelPicker value={form.time || '07:00'} onChange={v => setForm(p => ({ ...p, time: v }))} />
                                                <div className="mt-3">
                                                    {form.time && allSlotsWithStatus.find(x => x.time === form.time)?.status !== 'available' ? (
                                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-500 border border-red-100 animate-pulse">
                                                            <X size={14} className="shrink-0" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">
                                                                {allSlotsWithStatus.find(x => x.time === form.time)?.status === 'occupied' ? 'This slot is already occupied' : 'This slot is already finished/past'}
                                                            </span>
                                                        </div>
                                                    ) : form.time && (
                                                        <div className={`flex items-center gap-2 p-3 rounded-xl border animate-pulse ${form.date === initDate && form.time === initTime ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full animate-ping ${form.date === initDate && form.time === initTime ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                                {form.date === initDate && form.time === initTime ? 'Currently Assigned Slot' : 'New Slot is Available'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isEditing && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 w-fit mt-3">
                                                        <Clock size={12} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Hours: 7AM - 5PM</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="px-5 py-4 rounded-3xl bg-[var(--accent)] border border-[var(--accent)] shadow-xl shadow-[var(--accent-subtle)]">
                                                <div className="flex items-center gap-2 mb-1 opacity-80">
                                                    <Clock size={12} className="text-white" />
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-white">Designated Arrival</p>
                                                </div>
                                                <p className="text-xl font-black text-white">{parseTimeFrom24h(form.time)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Staff & Status */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Staff Coordination</h4>
                                {isEditing && (
                                    <button onClick={findNearest} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5 hover:bg-blue-500 hover:text-white transition-all active:scale-95">
                                        <Clock size={12} /> Find Slot
                                    </button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {isEditing && (
                                    <div>
                                        <label className="block text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 tracking-widest">Modification Reason</label>
                                        <select value={form.editReason} onChange={e => setForm(p => ({ ...p, editReason: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-[var(--accent)] transition-all">
                                            <option value="Sudden Changes">Sudden Changes</option>
                                            <option value="Staff Unavailable">Staff Unavailable</option>
                                            <option value="Patient Request">Patient Request</option>
                                            <option value="Campus Holiday">Campus Holiday</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 tracking-widest">Assigned Professional</label>
                                    {isEditing ? (
                                        <select value={form.nurse_assigned} onChange={e => setForm(p => ({ ...p, nurse_assigned: e.target.value }))} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold bg-slate-100 border border-slate-200 outline-none focus:bg-white focus:border-[var(--accent)] transition-all">
                                            <option value="Nurse Sarah">Nurse Sarah</option>
                                            <option value="Nurse Abby">Nurse Abby</option>
                                            <option value="Dr. Garcia">Dr. Garcia</option>
                                        </select>
                                    ) : (
                                        <div className="px-5 py-4 rounded-2xl bg-slate-50 text-sm font-extrabold text-slate-700 border border-slate-100">{form.nurse_assigned}</div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] uppercase font-black text-slate-400 ml-1 tracking-widest">Visit Reason</label>
                                    <div className="p-4 rounded-2xl bg-[var(--bg-wash)] border border-slate-100 italic text-[12px] leading-relaxed text-slate-600 font-medium">
                                        "{appointment.visit_reason}"
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={onSendBack}
                                className="flex-1 py-4 rounded-2xl text-[10px] uppercase font-bold tracking-widest text-red-600 border border-red-200 bg-red-50/50 hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={12} /> Rollback
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-[2] py-4 rounded-2xl text-[10px] uppercase font-bold tracking-widest bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-subtle)] hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Edit Selection
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-200 bg-white shadow-sm"
                            >
                                Cancel Edit
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !isChanged || !form.date || !form.time || allSlotsWithStatus.find(x => x.time === form.time)?.status !== 'available'}
                                className="flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-[var(--accent-subtle)] active:scale-95 disabled:opacity-40 disabled:shadow-none"
                                style={{ background: 'linear-gradient(135deg, #3BACED, #1E87C8)' }}
                            >
                                {isSaving ? 'Saving Changes...' : 'Update Schedule'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
