import { useState, useRef, useMemo } from 'react';
import { X, Loader2, Clock, AlignLeft, Trash2, Calendar } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import googleCalendarPlugin from '@fullcalendar/google-calendar';
import { supabase } from '../lib/supabase';
import { Check } from 'lucide-react';
import { ConfirmationDialog } from './ui/ConfirmationDialog';
import { useStore } from '../hooks/useStore';

export function CalendarWidget() {
    const { acceptedAppointments } = useStore();
    const calendarRef = useRef<FullCalendar>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state handling
    const [isEditing, setIsEditing] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        isAllDay: true, // Default to true
    });
    const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
    const [confirmAction, setConfirmAction] = useState<{ show: boolean; type: 'save' | 'delete'; payload?: any }>({ show: false, type: 'save' });
    const [moreEventsModal, setMoreEventsModal] = useState<{ show: boolean; events: any[]; date: Date | null }>({ show: false, events: [], date: null });

    const GOOGLE_CALENDAR_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID;
    const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;

    // Handle clicking on an empty cell in the calendar
    const handleDateSelect = (selectInfo: any) => {
        setIsEditing(false);
        setSelectedEventId(null);

        // For all-day selection, FullCalendar provides dates like "2026-04-27"
        // We ensure we have a valid ISO-like string for our inputs
        const startStr = selectInfo.startStr.includes('T') ? selectInfo.startStr.slice(0, 16) : selectInfo.startStr + 'T00:00';
        const endStr = selectInfo.endStr.includes('T') ? selectInfo.endStr.slice(0, 16) : (selectInfo.endStr ? new Date(new Date(selectInfo.endStr).getTime() - 86400000).toISOString().slice(0, 10) : selectInfo.startStr) + 'T23:59';

        setFormData({ title: '', description: '', startTime: startStr, endTime: endStr, isAllDay: true });
        setIsModalOpen(true);
    };

    // Handle clicking on an existing event
    const handleEventClick = (clickInfo: any) => {
        const { event } = clickInfo;

        setIsEditing(true);
        // The id from google calendar events looks like strings. We need it for updates and deletes.
        setSelectedEventId(event.id);

        // Format dates into local datetime-local format string (YYYY-MM-DDTHH:mm)
        const formatForInput = (date: Date | null) => {
            if (!date) return '';
            const dt = new Date(date);
            // Convert to local ISO string minus the timezone Z part
            dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
            return dt.toISOString().slice(0, 16);
        };

        setFormData({
            title: event.title,
            description: event.extendedProps.description || '',
            startTime: formatForInput(event.start),
            endTime: formatForInput(event.end || event.start), // In case end is null
            isAllDay: event.allDay,
        });

        setIsModalOpen(true);
        // Prevent browser navigation if the event has a url
        clickInfo.jsEvent.preventDefault();
    };

    // Handle save (Create or Update)
    const handleSaveEvent = async () => {
        setIsSubmitting(true);

        try {
            const funcName = isEditing ? 'update-google-event' : 'create-google-event';
            const payload = {
                title: formData.title || '(No title)',
                description: formData.description,
                startTime: formData.isAllDay ? formData.startTime.split('T')[0] + 'T00:00:00' : new Date(formData.startTime).toISOString(),
                endTime: formData.isAllDay ? formData.endTime.split('T')[0] + 'T23:59:59' : new Date(formData.endTime).toISOString(),
                isAllDay: formData.isAllDay,
                ...(isEditing && selectedEventId ? { eventId: selectedEventId } : {})
            };

            console.log('[CalendarWidget] Invoking', funcName, 'with payload:', payload);

            const { error } = await supabase.functions.invoke(funcName, {
                body: payload
            });

            if (error) {
                // Try to read the response body for detailed error info
                console.error('[CalendarWidget] Edge Function error:', error);
                if (error.context) {
                    try {
                        const errorBody = await error.context.json();
                        console.error('[CalendarWidget] Error details:', errorBody);
                        alert(`Failed to ${isEditing ? 'update' : 'create'} event: ${errorBody.error || error.message}`);
                    } catch {
                        alert(`Failed to ${isEditing ? 'update' : 'create'} event: ${error.message}`);
                    }
                } else {
                    alert(`Failed to ${isEditing ? 'update' : 'create'} event: ${error.message}`);
                }
                return;
            }

            calendarRef.current?.getApi().refetchEvents();

            closeModal();
            setConfirmAction({ show: false, type: 'save' });
            setSuccessToast({ show: true, message: isEditing ? 'Event updated successfully' : 'Event created successfully!' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
        } catch (error: any) {
            alert(`Failed to ${isEditing ? 'update' : 'create'} calendar event. Check console for details.`);
            console.error('Edge Function Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Delete
    const handleDeleteEvent = async () => {
        if (!selectedEventId) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase.functions.invoke('delete-google-event', {
                body: { eventId: selectedEventId }
            });

            if (error) throw error;

            calendarRef.current?.getApi().refetchEvents();
            closeModal();
            setConfirmAction({ show: false, type: 'delete' });
            setSuccessToast({ show: true, message: 'Event deleted successfully!' });
            setTimeout(() => setSuccessToast({ show: false, message: '' }), 3000);
        } catch (error: any) {
            alert('Failed to delete calendar event. Check console for details.');
            console.error('Edge Function Error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ title: '', description: '', startTime: '', endTime: '', isAllDay: true });
        setIsEditing(false);
        setSelectedEventId(null);
    };

    const plugins = useMemo(() => [dayGridPlugin, timeGridPlugin, interactionPlugin, googleCalendarPlugin], []);
    const headerToolbar = useMemo(() => ({
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
    }), []);
    const localEvents = useMemo(() => {
        return acceptedAppointments.map(app => ({
            id: `local-${app.id}`,
            title: app.requester_name,
            start: app.appointment_sched,
            // default to 30 mins if end not specified
            end: new Date(new Date(app.appointment_sched).getTime() + 30 * 60000).toISOString(),
            extendedProps: {
                ...app,
                isLocal: true
            },
            backgroundColor: (app.category || '').toLowerCase().includes('dental') ? '#3b82f6' : '#10b981',
            borderColor: (app.category || '').toLowerCase().includes('dental') ? '#2563eb' : '#059669',
        }));
    }, [acceptedAppointments]);

    const eventSources = useMemo(() => [
        {
            googleCalendarId: GOOGLE_CALENDAR_ID,
            className: 'google-event'
        },
        {
            events: localEvents,
            className: 'local-appointment'
        }
    ], [GOOGLE_CALENDAR_ID, localEvents]);

    return (
        <div className="calendar-widget-card p-5 transition-all duration-300 w-full flex flex-col h-full bg-white rounded-2xl border shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--accent)' }} />
                    <div>
                        <h3 className="calendar-widget-header-title text-lg font-bold">Clinic Calendar</h3>
                        <p className="calendar-widget-header-subtitle text-xs text-slate-500">Official Interactive Schedule</p>
                    </div>
                </div>
                <span className="calendar-widget-pill px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    Interactive Mode
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Clinic Appointment</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Dental Appointment</span>
                </div>
                <div className="flex items-center gap-2 border-l border-slate-200 ps-4">
                    <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Events</span>
                </div>
            </div>

            <div className="calendar-container overflow-auto relative flex-1" style={{ minHeight: '500px' }}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={plugins}
                    initialView="dayGridMonth"
                    headerToolbar={headerToolbar}
                    googleCalendarApiKey={GOOGLE_API_KEY}
                    eventSources={eventSources}
                    eventColor="#6366f1"
                    eventTextColor="#ffffff"
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    height="100%"
                    slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
                    eventTimeFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
                    moreLinkClick={(info) => {
                        const evs = info.allSegs.map(s => s.event);
                        setMoreEventsModal({ show: true, events: evs, date: info.date });
                        return "none"; 
                    }}
                />
            </div>

            {/* Event Creation/Edit Modal - Google Calendar 1:1 Style */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent" onClick={closeModal}>
                    {/* Shadow overlay logic but keeping the center box like Google */}
                    <div
                        className="bg-white rounded-lg shadow-2xl w-full max-w-[450px] overflow-hidden relative"
                        style={{ boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header toolbar */}
                        <div className="flex bg-[#f1f3f4] h-9 items-center justify-between px-2">
                            <div className="flex items-center ps-2">
                                {/* Optional gripper or blank space */}
                            </div>
                            <div className="flex items-center gap-1">
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction({ show: true, type: 'delete' })}
                                        disabled={isDeleting}
                                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 text-slate-600 transition-colors"
                                        title="Delete event"
                                    >
                                        {isDeleting ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} className="text-red-500" />}
                                    </button>
                                )}
                                <button type="button" onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 text-slate-600 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                setConfirmAction({ show: true, type: 'save' });
                            }}
                            className="p-6 pt-2 space-y-5"
                        >
                            {/* Title Input */}
                            <div className="pt-2">
                                <input
                                    className="w-full text-[23px] text-slate-800 placeholder-slate-500 border-b-2 border-transparent hover:border-slate-200 focus:border-[#1a73e8] outline-none transition-colors pb-1 bg-transparent"
                                    placeholder="Add title"
                                    value={formData.title}
                                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                    autoFocus
                                />
                            </div>

                            {/* Date Selector */}
                            <div className="flex items-start gap-3 text-sm text-slate-700 mt-6">
                                <div className="w-5 flex justify-center text-slate-400 mt-2.5">
                                    <Calendar size={18} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg outline-none border border-slate-200 focus:border-[#1a73e8] transition-colors text-sm font-medium text-slate-700"
                                        value={formData.startTime ? formData.startTime.slice(0, 10) : ''}
                                        onChange={e => {
                                            const date = e.target.value;
                                            const startTime = formData.startTime?.slice(11) || '08:00';
                                            const endTime = formData.endTime?.slice(11) || '09:00';
                                            setFormData(p => ({
                                                ...p,
                                                startTime: date + 'T' + startTime,
                                                endTime: date + 'T' + endTime
                                            }));
                                        }}
                                    />
                                </div>
                            </div>

                            {/* All Day Toggle & Time Selectors */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm text-slate-700 ml-8">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                className="appearance-none w-4 h-4 rounded border border-slate-300 transition-all cursor-pointer"
                                                style={{ background: formData.isAllDay ? '#1a73e8' : 'transparent', borderColor: formData.isAllDay ? '#1a73e8' : '#cbd5e1' }}
                                                checked={formData.isAllDay}
                                                onChange={e => setFormData(p => ({ ...p, isAllDay: e.target.checked }))}
                                            />
                                            <Check 
                                                size={12} 
                                                className={`absolute text-white pointer-events-none transition-opacity ${formData.isAllDay ? 'opacity-100' : 'opacity-0'}`} 
                                                strokeWidth={4} 
                                            />
                                        </div>
                                        <span className="text-slate-600 font-medium group-hover:text-slate-800 transition-colors">All day</span>
                                    </label>
                                </div>

                                {!formData.isAllDay && (
                                    <div className="flex items-start gap-3 text-sm text-slate-700">
                                        <div className="w-5 flex justify-center text-slate-400 mt-2.5">
                                            <Clock size={18} />
                                        </div>
                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Start Time</label>
                                                <input
                                                    type="time"
                                                    required
                                                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg outline-none border border-slate-200 focus:border-[#1a73e8] transition-colors text-sm font-medium text-slate-700"
                                                    value={formData.startTime ? formData.startTime.slice(11, 16) : ''}
                                                    onChange={e => {
                                                        const date = formData.startTime?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                                                        setFormData(p => ({ ...p, startTime: date + 'T' + e.target.value }));
                                                    }}
                                                />
                                                {formData.startTime?.slice(11, 16) && (
                                                    <p className="text-[10px] font-semibold mt-1 text-slate-400">
                                                        {(() => {
                                                            const [h, m] = (formData.startTime.slice(11, 16)).split(':').map(Number);
                                                            const ampm = h >= 12 ? 'PM' : 'AM';
                                                            const h12 = h % 12 || 12;
                                                            return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                                                        })()}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">End Time</label>
                                                <input
                                                    type="time"
                                                    required
                                                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg outline-none border border-slate-200 focus:border-[#1a73e8] transition-colors text-sm font-medium text-slate-700"
                                                    value={formData.endTime ? formData.endTime.slice(11, 16) : ''}
                                                    onChange={e => {
                                                        const date = formData.endTime?.slice(0, 10) || formData.startTime?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                                                        setFormData(p => ({ ...p, endTime: date + 'T' + e.target.value }));
                                                    }}
                                                />
                                                {formData.endTime?.slice(11, 16) && (
                                                    <p className="text-[10px] font-semibold mt-1 text-slate-400">
                                                        {(() => {
                                                            const [h, m] = (formData.endTime.slice(11, 16)).split(':').map(Number);
                                                            const ampm = h >= 12 ? 'PM' : 'AM';
                                                            const h12 = h % 12 || 12;
                                                            return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                                                        })()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="flex items-start gap-4 text-sm text-slate-700 mt-4">
                                <div className="w-5 flex justify-center text-slate-400 mt-1.5">
                                    <AlignLeft size={20} />
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        className="w-full bg-slate-100 hover:bg-slate-200 focus:bg-white rounded-md px-3 py-2 text-sm outline-none border-b-2 border-transparent focus:border-[#1a73e8] transition-colors resize-none min-h-[80px]"
                                        placeholder="Add description"
                                        value={formData.description}
                                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button onClick={closeModal} type="button" className="px-4 py-2 hover:bg-slate-100 rounded text-sm font-medium text-slate-600 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isDeleting}
                                    className="px-6 py-2 bg-[#1a73e8] hover:bg-[#155b0] text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 min-w-[80px]"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationDialog
                isOpen={confirmAction.show}
                onClose={() => setConfirmAction({ ...confirmAction, show: false })}
                onConfirm={confirmAction.type === 'save' ? handleSaveEvent : handleDeleteEvent}
                title={confirmAction.type === 'save' ? (isEditing ? 'Update Event?' : 'Create Event?') : 'Delete Event?'}
                description={confirmAction.type === 'save'
                    ? `Are you sure you want to ${isEditing ? 'update' : 'create'} this event in the clinic calendar?`
                    : 'This action cannot be undone. The event will be permanently removed from Google Calendar.'}
                type={confirmAction.type === 'delete' ? 'danger' : 'info'}
                confirmText={confirmAction.type === 'save' ? (isEditing ? 'Update' : 'Create') : 'Delete Anyway'}
                isLoading={isSubmitting || isDeleting}
            />

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

            {/* Success Toast */}
            {successToast.show && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                    <div className="bg-white rounded-2xl shadow-2xl px-6 py-3 border border-emerald-100 flex items-center gap-3 animate-bounce-subtle">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">{successToast.message}</span>
                    </div>
                </div>
            )}

            {/* Adding basic overrides to match PLV interface */}
            <style>{`
                .fc { font-family: inherit; }
                .fc-toolbar-title { font-size: 1.15rem !important; font-weight: 700 !important; color: var(--text-primary); }
                .fc .fc-button-primary { background-color: var(--bg-wash) !important; border-color: var(--border-light) !important; color: var(--text-primary) !important; text-transform: capitalize; font-size: 0.85rem; font-weight: 600; box-shadow: none !important; }
                .fc .fc-button-active { background-color: var(--accent) !important; color: white !important; border-color: var(--accent) !important; }
                .fc-theme-standard th { background: var(--bg-wash); padding: 4px 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: var(--text-secondary); }
                .fc-daygrid-day-number { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
                .fc-event { cursor: pointer; transition: opacity 0.2s; }
                .fc-event:hover { opacity: 0.9; }
                .fc-daygrid-event {
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .fc-event-title {
                    font-size: 0.7rem !important;
                    font-weight: 600 !important;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .fc-event-time {
                    font-size: 0.7rem !important;
                    font-weight: 600 !important;
                    opacity: 0.9;
                }
                .fc-timegrid-slot-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
                .fc-popover {
                    z-index: 1000 !important;
                    background: var(--card-bg) !important;
                    border: 1px solid var(--border-light) !important;
                    border-radius: 12px !important;
                    box-shadow: var(--shadow-xl) !important;
                    overflow: hidden !important;
                }
                .fc-popover-header {
                    background: var(--bg-wash) !important;
                    padding: 8px 12px !important;
                    font-size: 0.8rem !important;
                    font-weight: 700 !important;
                    color: var(--text-primary) !important;
                    border-bottom: 1px solid var(--border-light) !important;
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
