import { useRef, useMemo, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useStore } from '../hooks/useStore';
import { 
    fetchAppointmentsFromDB, 
    fetchAcceptedAppointmentsFromDB, 
    addAcceptedAppointmentDB,
    updateAppointmentStatusDB,
    sendBackAppointmentDB
} from '../store';
import { isValid, isBefore, startOfDay } from 'date-fns';
import { 
    AcceptAppointmentModal, 
    ViewAcceptedAppointmentModal,
    RejectAppointmentModal
} from './AppointmentModals';
import { ShieldCheck, Calendar, X } from 'lucide-react';

export function AppointmentsCalendarWidget({ initialDate }: { initialDate?: Date }) {
    const calendarRef = useRef<FullCalendar>(null);

    useEffect(() => {
        if (initialDate && calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.gotoDate(initialDate);
            calendarApi.changeView('timeGridDay');
        }
    }, [initialDate]);
    const { appointments, acceptedAppointments, campuses } = useStore();

    // Modal States
    const [selectedPending, setSelectedPending] = useState<any | null>(null);
    const [selectedAccepted, setSelectedAccepted] = useState<any | null>(null);
    const [rejectDialog, setRejectDialog] = useState<any | null>(null);
    const [sendBackConfirm, setSendBackConfirm] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
    const [moreEventsModal, setMoreEventsModal] = useState<{ show: boolean; events: any[]; date: Date | null }>({ show: false, events: [], date: null });

    // Ensure data is fetched on mount
    useEffect(() => {
        fetchAppointmentsFromDB();
        fetchAcceptedAppointmentsFromDB();
    }, []);

    const handleAccept = async (data: any) => {
        if (!selectedPending) return;
        setIsSubmitting(true);
        try {
            await addAcceptedAppointmentDB({
                requester_id: selectedPending.requester_id,
                appointment_id: selectedPending.id,
                nurse_assigned: data.nurse_assigned,
                appointment_sched: `${data.date}T${data.time}`,
                campus: data.campus,
                category: data.category,
            });
            setSuccessToast({ show: true, message: 'Appointment scheduled successfully!' });
            setSelectedPending(null);
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setIsSubmitting(false), 500);
        }
    };

    const handleReject = async (reason: string) => {
        const target = rejectDialog || sendBackConfirm;
        if (!target) return;
        setIsSubmitting(true);
        try {
            if (sendBackConfirm) {
                await sendBackAppointmentDB(sendBackConfirm.id, sendBackConfirm.appointment_id, reason);
                setSuccessToast({ show: true, message: 'Appointment rolled back to pending.' });
                setSendBackConfirm(null);
            } else {
                await updateAppointmentStatusDB(rejectDialog.id, 'REJECTED', reason);
                setSuccessToast({ show: true, message: 'Appointment request declined.' });
                setRejectDialog(null);
            }
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const plugins = useMemo(() => [dayGridPlugin, timeGridPlugin, interactionPlugin], []);
    
    const headerToolbar = useMemo(() => ({
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
    }), []);

    const events = useMemo(() => {
        const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            const normalized = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
            const d = new Date(normalized);
            return isValid(d) ? d : null;
        };

        const acceptedApptIds = acceptedAppointments.map(a => a.appointment_id);

        const scheduled = acceptedAppointments.map(a => {
            const startDate = parseDate(a.appointment_sched);
            if (!startDate) return null;
            
            const isPast = isBefore(startDate, startOfDay(new Date()));

            return {
                id: `accepted-${a.id}`,
                title: `${a.requester_name || 'Patient'} ${a.category ? `[${a.category.split(' ')[0]}]` : ''}`,
                start: startDate,
                backgroundColor: isPast ? '#94A3B8' : '#10B981', 
                borderColor: 'transparent',
                textColor: isPast ? '#1E293B' : '#FFFFFF',
                classNames: isPast ? ['fc-bg-past'] : ['fc-bg-scheduled'],
                allDay: false,
                extendedProps: { ...a, type: 'scheduled' }
            };
        }).filter((ev): ev is any => ev !== null);

        const pending = appointments
            .filter(a => !acceptedApptIds.includes(a.id) && (a.status || '').toUpperCase() === 'PENDING')
            .map(a => {
                const startDate = parseDate(a.request_timestamp);
                if (!startDate) return null;
                return {
                    id: `pending-${a.id}`,
                    title: `${a.requester_name || 'Patient'}`,
                    start: startDate,
                    allDay: true, 
                    backgroundColor: '#F59E0B',
                    borderColor: 'transparent',
                    textColor: '#FFFFFF',
                    classNames: ['fc-bg-pending'],
                    extendedProps: { ...a, type: 'pending' }
                };
            }).filter((ev): ev is any => ev !== null);

        return [...scheduled, ...pending] as any[];
    }, [appointments, acceptedAppointments]);

    const handleEventClick = (info: any) => {
        const props = info.event.extendedProps;
        if (props.type === 'scheduled') {
            setSelectedAccepted(props);
        } else {
            setSelectedPending(props);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="calendar-widget-card p-5 bg-white rounded-2xl border shadow-sm relative">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full bg-[var(--accent)]" />
                        <div>
                            <h3 className="text-lg font-bold">Appointments Calendar</h3>
                            <p className="text-xs text-slate-500">Interactive confirmation & tracking</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Scheduled
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Past
                        </div>
                    </div>
                </div>

                <div className="calendar-container h-[600px]">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={plugins}
                        initialView="dayGridMonth"
                        headerToolbar={headerToolbar}
                        events={events}
                        eventTextColor="#ffffff"
                        height="100%"
                        navLinks={true}
                        selectable={true}
                        selectMirror={true}
                        dayMaxEvents={true}
                        eventClick={handleEventClick}
                        dayCellClassNames={(arg) => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            return arg.date < today ? 'fc-day-past-custom' : '';
                        }}
                        eventTimeFormat={{
                            hour: 'numeric',
                            minute: '2-digit',
                            meridiem: 'short'
                        }}
                        moreLinkClick={(info) => {
                            const evs = info.allSegs.map(s => s.event);
                            setMoreEventsModal({ show: true, events: evs, date: info.date });
                            return "none";
                        }}
                    />
                </div>

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

            {/* Modals */}
            {selectedPending && (
                <AcceptAppointmentModal
                    appointment={selectedPending}
                    onClose={() => setSelectedPending(null)}
                    onConfirm={handleAccept}
                    isSubmitting={isSubmitting}
                />
            )}

            {selectedAccepted && (
                <ViewAcceptedAppointmentModal
                    appointment={selectedAccepted}
                    campuses={campuses}
                    onClose={() => setSelectedAccepted(null)}
                    onSendBack={() => {
                        setSendBackConfirm(selectedAccepted);
                        setSelectedAccepted(null);
                    }}
                    setSuccessToast={setSuccessToast}
                />
            )}

            {/* Custom More Events Modal */}
            {moreEventsModal.show && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]" onClick={() => setMoreEventsModal({ ...moreEventsModal, show: false })}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center shadow-sm">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Appointments</h3>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        {moreEventsModal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setMoreEventsModal({ ...moreEventsModal, show: false })} className="w-10 h-10 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                            {moreEventsModal.events.map((event: any, i: number) => (
                                <div 
                                    key={i} 
                                    onClick={() => {
                                        handleEventClick({ event, jsEvent: { preventDefault: () => {} } });
                                        setMoreEventsModal({ ...moreEventsModal, show: false });
                                    }}
                                    className="p-3 rounded-2xl border border-slate-100 hover:border-[var(--accent)] hover:bg-blue-50/30 transition-all cursor-pointer group flex items-center gap-3"
                                >
                                    <div className="w-1.5 h-8 rounded-full" style={{ background: event.backgroundColor || 'var(--accent)' }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-[var(--accent)] transition-colors">{event.title}</p>
                                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                            {event.start?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="px-3 py-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-wider">View</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {sendBackConfirm && (
                <RejectAppointmentModal
                    appointment={sendBackConfirm}
                    title="Send Back Appointment"
                    description="Are you sure you want to send this confirmed appointment back to pending status? A reason is required."
                    actionLabel="Send Back"
                    onClose={() => {
                        const original = sendBackConfirm;
                        setSendBackConfirm(null);
                        setSelectedAccepted(original);
                    }}
                    onConfirm={handleReject}
                    isSubmitting={isSubmitting}
                />
            )}

            <style>{`
                .fc { font-family: inherit; }
                .fc-toolbar-title { font-size: 1.1rem !important; font-weight: 700 !important; color: #1e293b; }
                .fc .fc-button-primary { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: #475569 !important; font-size: 0.8rem; font-weight: 600; text-transform: capitalize; }
                .fc .fc-button-primary:hover { background: #f1f5f9 !important; }
                .fc .fc-button-active { background: var(--accent) !important; border-color: var(--accent) !important; color: white !important; }
                .fc-event { border: none !important; box-shadow: none !important; padding: 1px 4px !important; margin: 2px 5px !important; border-radius: 6px !important; cursor: pointer; transition: transform 0.1s; }
                .fc-daygrid-event { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; height: auto !important; border: none !important; background-image: none !important; }
                .fc-event:focus, .fc-event:active { outline: none !important; border: none !important; }
                .fc-v-event { border: none !important; }
                .fc-h-event { border: none !important; }
                .fc-bg-scheduled { background-color: #10B981 !important; color: #FFFFFF !important; }
                .fc-bg-pending { background-color: #F59E0B !important; color: #FFFFFF !important; }
                .fc-bg-past { background-color: #94A3B8 !important; color: #1E293B !important; opacity: 0.8; }
                .fc-event-title { font-size: 0.7rem !important; font-weight: 700 !important; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block !important; margin-left: 2px; max-width: 100%; }
                .fc-event-time { font-size: 0.7rem !important; font-weight: 600 !important; opacity: 0.9; }
                @media (max-width: 767px) {
                    .fc-event-title { font-size: 0.58rem !important; }
                    .fc-event-time { font-size: 0.58rem !important; }
                    .fc-event { padding: 1px 2px !important; margin: 1px 3px !important; }
                }
                .fc-daygrid-event-dot { border-color: white !important; }
                .fc-day-past-custom { 
                    background-color: #f1f5f9 !important; 
                }
                .fc-day-today { background: #eff6ff !important; border: 2px solid var(--accent) !important; z-index: 10; position: relative; }
                .fc-day-today::after { content: 'TODAY'; position: absolute; top: 2px; left: 2px; font-size: 8px; font-weight: 900; color: var(--accent); background: white; padding: 2px 4px; border-radius: 4px; border: 1px solid var(--accent); }
                .fc-daygrid-day-number { font-size: 0.8rem; font-weight: 700; color: #64748b; padding: 10px !important; }
                .fc-popover {
                    z-index: 1000 !important;
                    background: white !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
                    overflow: hidden !important;
                }
                .fc-popover-header {
                    background: #f8fafc !important;
                    padding: 8px 12px !important;
                    font-size: 0.8rem !important;
                    font-weight: 700 !important;
                    color: #1e293b !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                }
                .fc-popover-body {
                    padding: 8px !important;
                }
                .fc-daygrid-more-link {
                    font-size: 0.7rem !important;
                    font-weight: 800 !important;
                    color: var(--accent) !important;
                    margin-top: 2px !important;
                    display: block !important;
                    text-align: center !important;
                }
            `}</style>
        </div>
    );
}
