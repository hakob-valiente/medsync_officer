import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, ClipboardList, LogOut, Bell,
    MessageSquare, Calendar, Moon, Sun, Users, ShieldCheck, ChevronLeft, ChevronRight,
    ShieldAlert, Menu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useAuth } from '../hooks/useAuth';
import { EmergencyModal } from './EmergencyModal';
import type { EmergencyReport } from '../types';

const ACCENT = '#059669';   // light mode
const ACCENT_DARK = '#10b981';   // dark mode

// WORKSPACE: First-touch daily items
const workspaceNav = [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard', permission: null },
    { to: '/appointments', icon: Calendar,         label: 'Appointments', permission: 'appointments' },
    { to: '/requests',     icon: ClipboardList,    label: 'Medical Requests', permission: 'medical requests' },
    { to: '/inquiries',    icon: MessageSquare,    label: 'Inquiries', permission: 'inquiries' },
];

const patientNav = [
    { to: '/users', icon: Users, label: 'Patient Records', permission: null },
];

const operationsNav = [
    { to: '/inventory', icon: Package,   label: 'Inventory', permission: 'inventory' },
];

function NavCategory({ label, isExpanded }: { label: string, isExpanded: boolean }) {
    if (!isExpanded) return <div className="h-4" />;
    return (
        <p
            className="px-3 pt-5 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.18em] select-none"
            style={{ color: 'var(--nav-cat)' }}
        >
            {label}
        </p>
    );
}

export default function Layout() {
    const { logout, user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [nightShift, setNightShift] = useState(() => {
        return localStorage.getItem('plv-theme') === 'dark';
    });
    // Sidebar state
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth > 768);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const [showNotifications, setShowNotifications] = useState(false);
    const [notifVisibleCount, setNotifVisibleCount] = useState(10);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const { appointments, medicineRequests, inquiries, notifications, readNotificationIds, emergencyReports } = useStore();
    
    // Emergency Modal State
    const [activeEmergency, setActiveEmergency] = useState<EmergencyReport | null>(null);
    const [dismissedEmergencyIds, setDismissedEmergencyIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const pendingEmergency = (emergencyReports || [])
            .filter(r => r.status === 'PENDING')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        if (pendingEmergency && !dismissedEmergencyIds.has(pendingEmergency.id)) {
            setActiveEmergency(pendingEmergency);
        } else {
            setActiveEmergency(null);
        }
    }, [emergencyReports, dismissedEmergencyIds]);

    
    const navigate = useNavigate();

    const unreadCount = notifications.filter(n => !readNotificationIds.includes(n.id)).length;

    const markAsRead = async (id: string) => {
        if (!readNotificationIds.includes(id)) {
            const { markAdminNotificationAsReadDB } = await import('../store');
            await markAdminNotificationAsReadDB(id);
        }
    };

    const handleNotificationClick = (notif: any) => {
        markAsRead(notif.id);
        setShowNotifications(false);
        
        const type = notif.notification_type || '';
        if (type.includes('appointment')) {
            navigate('/appointments', { state: { viewId: notif.target_id } });
        } else if (type.includes('medicine_request') || type.includes('medical_cert')) {
            navigate('/requests', { state: { viewId: notif.target_id, tab: type.includes('medical_cert') ? 'certificate' : 'medicine' } });
        } else if (type.includes('inquiry')) {
            navigate('/inquiries', { state: { viewId: notif.target_id } });
        } else {
            console.log('No specific route for type:', type);
        }
    };

    const markAllAsRead = async () => {
        const { markAdminNotificationAsReadDB } = await import('../store');
        for (const n of notifications) {
            if (!readNotificationIds.includes(n.id)) {
                await markAdminNotificationAsReadDB(n.id);
            }
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        
        const syncData = async () => {
            const { bootstrapSessionData } = await import('../store');
            bootstrapSessionData();
        };
        syncData();
        
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarExpanded(true); 
            } else {
                setIsSidebarExpanded(true);
                setIsMobileOpen(false);
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            clearInterval(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', nightShift ? 'dark' : 'light');
        localStorage.setItem('plv-theme', nightShift ? 'dark' : 'light');
    }, [nightShift]);

    const formattedDate = currentTime.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const formattedTime = currentTime.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
    });

    const pendingAppts = appointments.filter(a => a.status?.toUpperCase() === 'PENDING').length;
    const pendingMedReqs = medicineRequests.filter(r => r.status?.toUpperCase() === 'PENDING').length;
    const pendingInquiries = inquiries.filter(i => !i.completed_timestamp).length;

    const badgeMap: Record<string, number> = {
        '/appointments': pendingAppts,
        '/requests': pendingMedReqs,
        '/inquiries': pendingInquiries,
    };

    // Filter items based on permissions
    const filterNav = (items: any[]) => items.filter(item => {
        if (!item.permission) return true;
        return user?.permissions?.includes(item.permission);
    });

    const renderItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => {
        const badge = badgeMap[to] || 0;
        return (
            <NavLink
                key={to}
                to={to}
                onClick={() => { if (isMobile) setIsMobileOpen(false); }}
                title={!isSidebarExpanded && !isMobile ? label : undefined}
                className={({ isActive }) =>
                    `nav-pill relative flex items-center gap-2.5 mx-2 my-0.5 px-3 py-2 rounded-lg text-[15px] transition-all duration-200 select-none group overflow-hidden
                    ${isActive ? 'nav-pill--active' : 'nav-pill--idle'} ${!isSidebarExpanded && !isMobile ? 'justify-center' : ''}`
                }
            >
                {({ isActive }) => (
                    <>
                        {isActive && (
                            <span
                                className="absolute right-0 top-1 bottom-1 w-[3px] rounded-l-full"
                                style={{ background: nightShift ? ACCENT_DARK : ACCENT }}
                            />
                        )}

                        <Icon
                            size={isSidebarExpanded ? 15 : 20}
                            strokeWidth={isActive ? 2.1 : 1.7}
                            className="flex-shrink-0 transition-all duration-200"
                            style={{
                                color: isActive
                                    ? (nightShift ? ACCENT_DARK : ACCENT)
                                    : 'var(--nav-icon)',
                            }}
                        />

                        {isSidebarExpanded && (
                            <span
                                className="flex-1 font-medium leading-none transition-colors duration-200 whitespace-nowrap"
                                style={{
                                    color: isActive
                                        ? (nightShift ? ACCENT_DARK : ACCENT)
                                        : 'var(--nav-text)',
                                }}
                            >
                                {label}
                            </span>
                        )}

                        {badge > 0 && (
                            <span
                                className={`rounded-full font-semibold flex items-center justify-center tabular-nums flex-shrink-0
                                    ${isSidebarExpanded || isMobile ? 'min-w-[18px] h-[18px] text-[12px] px-1' : 'absolute top-1 right-1 min-w-[14px] h-[14px] text-[9px]'}`}
                                style={{
                                    background: isActive ? (nightShift ? ACCENT_DARK : ACCENT) : '#E25C5C',
                                    color: 'white',
                                    opacity: isActive ? 0.9 : 1,
                                }}
                            >
                                {isSidebarExpanded || isMobile ? badge : (badge > 9 ? '9+' : badge)}
                            </span>
                        )}
                    </>
                )}
            </NavLink>
        );
    };

    const hasWorkspaceItems = filterNav(workspaceNav).length > 0;
    const hasPatientItems = filterNav(patientNav).length > 0;
    const hasOperationsItems = filterNav(operationsNav).length > 0;

    return (
        <div
            className="flex h-screen overflow-hidden"
            style={{ background: nightShift ? '#0A1929' : '#EAEDF1' }}
        >
            {/* Mobile sidebar backdrop */}
            {isMobile && isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-[2px]"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside
                className={`flex flex-col flex-shrink-0 overflow-hidden z-50 transition-all duration-300
                    ${isMobile ? 'fixed inset-y-0 left-0 h-[calc(100vh-2rem)] my-4 ml-4 rounded-2xl shadow-2xl' : 'relative my-4 ml-4 rounded-2xl'}
                    ${isMobile && !isMobileOpen ? '-translate-x-[120%]' : 'translate-x-0'}`}
                style={{
                    width: isSidebarExpanded || isMobile ? '240px' : '72px',
                    background: 'var(--sidebar-bg)',
                    border: '1px solid var(--sidebar-border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
                }}
            >
                <div className="px-5 pt-5 pb-3 flex-shrink-0 relative">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{
                                background: '#fff',
                                boxShadow: `0 2px 10px rgba(5,150,105,0.18), inset 0 1px 0 rgba(255,255,255,0.6)`,
                                border: '1px solid rgba(5,150,105,0.15)',
                            }}
                        >
                            <img src="/logo.png" alt="PLV MedSync" className="w-7 h-7 object-contain" />
                        </div>
                        {isSidebarExpanded && (
                            <div className="min-w-0 transition-opacity duration-300">
                                <p
                                    className="text-[16px] font-bold leading-tight tracking-tight whitespace-nowrap"
                                    style={{ color: 'var(--brand-title)' }}
                                >
                                    PLV MedSync
                                </p>
                                <p
                                    className="text-[12px] font-semibold tracking-[0.16em] uppercase mt-0.5 whitespace-nowrap"
                                    style={{ color: nightShift ? ACCENT_DARK : ACCENT }}
                                >
                                    Officer Portal
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mx-4 mb-0.5" style={{ height: '1px', background: 'var(--sidebar-divider)' }} />

                <nav className="flex-1 overflow-y-auto pb-2 overflow-x-hidden" style={{ scrollbarWidth: 'none' }}>
                    {hasWorkspaceItems && (
                        <>
                            <NavCategory label="Workspace" isExpanded={isSidebarExpanded} />
                            {filterNav(workspaceNav).map(renderItem)}
                        </>
                    )}

                    {hasPatientItems && (
                        <>
                            <NavCategory label="Patient Care" isExpanded={isSidebarExpanded} />
                            {filterNav(patientNav).map(renderItem)}
                        </>
                    )}

                    {hasOperationsItems && (
                        <>
                            <NavCategory label="Operations" isExpanded={isSidebarExpanded} />
                            {filterNav(operationsNav).map(renderItem)}
                        </>
                    )}

                    <NavCategory label="Settings" isExpanded={isSidebarExpanded} />

                    <button
                        onClick={() => setNightShift(!nightShift)}
                        title={!isSidebarExpanded ? "Toggle dark mode" : undefined}
                        className={`relative flex items-center gap-2.5 mx-2 my-0.5 py-2 rounded-lg text-[15px] transition-all duration-200 group
                            ${isSidebarExpanded ? 'w-[calc(100%-16px)] px-3' : 'justify-center w-[calc(100%-16px)] px-0'}`}
                        style={{
                            background: nightShift ? `rgba(16,185,129,0.08)` : 'transparent',
                            border: nightShift ? `1px solid rgba(16,185,129,0.14)` : '1px solid transparent',
                        }}
                        onMouseEnter={e => {
                            if (!nightShift) e.currentTarget.style.background = 'var(--nav-hover-bg)';
                        }}
                        onMouseLeave={e => {
                            if (!nightShift) e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        {nightShift
                            ? <Moon size={isSidebarExpanded ? 15 : 20} strokeWidth={1.7} style={{ color: ACCENT_DARK, flexShrink: 0 }} />
                            : <Sun size={isSidebarExpanded ? 15 : 20} strokeWidth={1.7} style={{ color: 'var(--nav-icon)', flexShrink: 0 }} />
                        }
                        
                        {isSidebarExpanded && (
                            <>
                                <span className="flex-1 font-medium text-left whitespace-nowrap" style={{ color: 'var(--nav-text)' }}>
                                    {nightShift ? 'Dark Mode' : 'Light Mode'}
                                </span>
                                <div
                                    className="w-8 h-4 rounded-full relative flex-shrink-0 transition-colors duration-300"
                                    style={{ background: nightShift ? (ACCENT_DARK) : 'var(--sidebar-divider)' }}
                                >
                                    <div
                                        className="absolute top-[3px] w-[10px] h-[10px] rounded-full bg-white transition-all duration-300"
                                        style={{
                                            left: nightShift ? 'calc(100% - 13px)' : '3px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </button>
                    
                    {/* Expand/Collapse Toggle - Hidden on Mobile */}
                    {!isMobile && (
                        <button
                            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                            className={`relative flex items-center gap-2.5 mx-2 mt-2 px-3 py-2 rounded-lg text-[15px] transition-all duration-200 group border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800
                                ${!isSidebarExpanded ? 'justify-center px-0' : ''}`}
                        >
                            {isSidebarExpanded ? (
                                <ChevronLeft size={16} style={{ color: 'var(--nav-icon)' }} />
                            ) : (
                                <ChevronRight size={20} style={{ color: 'var(--nav-icon)' }} />
                            )}
                            {isSidebarExpanded && (
                                <span className="flex-1 font-medium text-left whitespace-nowrap" style={{ color: 'var(--nav-text)' }}>
                                    Collapse Sidebar
                                </span>
                            )}
                        </button>
                    )}
                </nav>

                <div className="flex-shrink-0">
                    <div className="mx-4" style={{ height: '1px', background: 'var(--sidebar-divider)' }} />

                    <div className={`px-4 pt-3 pb-2 flex items-center gap-2.5 ${!isSidebarExpanded ? 'justify-center' : ''}`}>
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0 relative"
                            style={{
                                fontSize: isSidebarExpanded ? '11px' : '13px',
                                background: `linear-gradient(135deg, ${ACCENT} 0%, #064e3b 100%)`,
                                boxShadow: `0 2px 8px rgba(5,150,105,0.3)`,
                            }}
                        >
                            {user?.fullName?.charAt(0)?.toUpperCase() || 'O'}
                            <div
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2"
                                style={{ borderColor: 'var(--sidebar-bg)' }}
                            />
                        </div>
                        {isSidebarExpanded && (
                            <>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-semibold leading-snug truncate" style={{ color: 'var(--brand-title)' }}>
                                        {user?.fullName || 'Officer'}
                                    </p>
                                    <p className="text-[12px] font-medium truncate" style={{ color: 'var(--nav-cat)' }}>
                                        {user?.username || ''}
                                    </p>
                                </div>
                                <ShieldCheck size={13} style={{ color: nightShift ? ACCENT_DARK : ACCENT, opacity: 0.7, flexShrink: 0 }} />
                            </>
                        )}
                    </div>

                    <div className={`px-4 pb-4 ${!isSidebarExpanded ? 'flex justify-center' : ''}`}>
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            title={!isSidebarExpanded ? "Sign Out" : undefined}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 active:scale-95 group
                                ${isSidebarExpanded ? 'w-full' : 'justify-center w-10 h-10 px-0'}`}
                            style={{ color: 'var(--logout-text)', background: 'var(--logout-bg)', border: '1px solid var(--logout-border)' }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--logout-hover-bg)';
                                e.currentTarget.style.color = '#DC2626';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'var(--logout-bg)';
                                e.currentTarget.style.color = 'var(--logout-text)';
                            }}
                        >
                            <LogOut size={isSidebarExpanded ? 14 : 18} strokeWidth={1.8} className="flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
                            {isSidebarExpanded && <span>Sign Out</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Content Area ── */}
            <div className="flex-1 flex flex-col overflow-hidden relative w-full">
                <header className="mobile-header flex-shrink-0 px-4 md:px-7 pt-4 pb-2 flex items-center justify-between z-30 relative" style={{ background: 'transparent' }}>
                    <div className="absolute bottom-0 left-4 md:left-7 right-4 md:right-7 h-[1px]" style={{ background: `linear-gradient(to right, transparent, ${nightShift ? ACCENT_DARK : ACCENT}, transparent)`, opacity: 0.15 }} />

                    {/* Mobile: Hamburger + Brand / Desktop: empty */}
                    <div className="flex items-center gap-3">
                        {isMobile && (
                            <button
                                onClick={() => setIsMobileOpen(true)}
                                className="mobile-hamburger w-10 h-10 -ml-1 rounded-xl flex items-center justify-center transition-all active:scale-95"
                                style={{ color: 'var(--text-primary)', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                            >
                                <Menu size={20} strokeWidth={2} />
                            </button>
                        )}
                        {isMobile && (
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(5,150,105,0.2)' }}>
                                    <img src="/logo.png" alt="PLV" className="w-5 h-5 object-contain" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold leading-none tracking-tight" style={{ color: 'var(--brand-title)' }}>MedSync</p>
                                    <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: nightShift ? ACCENT_DARK : ACCENT }}>Officer</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <div className="text-right hidden md:block">
                            <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{formattedDate}</p>
                            <p className="text-[13px] font-bold" style={{ color: 'var(--text-secondary)' }}>{formattedTime}</p>
                        </div>
                        <div style={{ height: '20px', width: '1px', background: 'var(--border)' }} className="mx-1 hidden md:block" />
                        <div className="relative">
                            <button
                                onClick={() => {
                                    if (showNotifications) setNotifVisibleCount(10);
                                    setShowNotifications(!showNotifications);
                                }}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 relative shadow-sm border"
                                style={{ color: 'var(--text-muted)', background: 'var(--card-bg)', borderColor: 'var(--border-light)' }}
                                onMouseOver={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                            >
                                <Bell size={18} strokeWidth={2} />
                                {unreadCount > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[12px] font-bold flex items-center justify-center border-2"
                                        style={{ borderColor: 'var(--sidebar-bg)' }}
                                    >
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                                    <div 
                                        className="absolute top-14 right-0 w-[340px] rounded-2xl shadow-2xl z-50 overflow-hidden fade-in-up origin-top-right border"
                                        style={{ 
                                            background: 'var(--card-bg)', 
                                            borderColor: 'var(--border-light)',
                                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                                            backdropFilter: 'blur(12px)' 
                                        }}
                                    >
                                        <div className="p-4 flex items-center justify-between relative" style={{ background: 'var(--bg-wash)' }}>
                                            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.1)', color: 'var(--accent)' }}>{unreadCount} NEW</span>
                                            <div className="absolute bottom-0 left-4 right-4 h-[1px]" style={{ background: 'var(--accent)' }} />
                                        </div>
                                        <div className="max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                        {notifications.slice(0, notifVisibleCount).map(notif => {
                                                const isRead = readNotificationIds.includes(notif.id);
                                                
                                                // Icon selection logic
                                                let Icon = Bell;
                                                let iconBg = 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700';
                                                let iconColor = 'text-slate-500';
                                                
                                                if (notif.notification_type?.includes('appointment')) {
                                                    Icon = Calendar;
                                                    iconBg = 'bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800';
                                                    iconColor = 'text-blue-500';
                                                } else if (notif.notification_type?.includes('inquiry')) {
                                                    Icon = MessageSquare;
                                                    iconBg = 'bg-amber-50 border-amber-100 dark:bg-amber-900/30 dark:border-amber-800';
                                                    iconColor = 'text-amber-500';
                                                } else if (notif.notification_type?.includes('medicine') || notif.notification_type?.includes('medical_cert')) {
                                                    Icon = ShieldCheck;
                                                    iconBg = 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800';
                                                    iconColor = 'text-emerald-500';
                                                }
                                                
                                                // Humanized time
                                                const notifDate = new Date(notif.created_at);
                                                const now = new Date();
                                                const diffMs = now.getTime() - notifDate.getTime();
                                                const diffMins = Math.floor(diffMs / 60000);
                                                let humanTime = `${diffMins}m ago`;
                                                if (diffMins > 60) {
                                                    const diffHours = Math.floor(diffMins / 60);
                                                    humanTime = diffHours > 24 ? `${Math.floor(diffHours / 24)}d ago` : `${diffHours}h ago`;
                                                }

                                                return (
                                                    <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-4 transition-colors duration-200 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 relative ${!isRead ? 'bg-emerald-50/10 dark:bg-emerald-900/10' : ''}`} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                        <div className="flex gap-3 relative">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${iconBg} ${iconColor}`}>
                                                                 <Icon size={16} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex justify-between items-start mb-0.5">
                                                                    <p className={`text-xs font-bold ${!isRead ? 'text-black dark:text-white' : ''}`} style={{ color: !isRead ? 'inherit' : 'var(--text-primary)' }}>{notif.title}</p>
                                                                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>{humanTime}</span>
                                                                </div>
                                                                <p className={`text-[11px] leading-relaxed ${!isRead ? 'font-medium' : ''}`} style={{ color: !isRead ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{notif.message}</p>
                                                            </div>
                                                            {!isRead && (
                                                                <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {notifications.length === 0 && (
                                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--bg-wash)', color: 'var(--text-faint)' }}>
                                                        <Bell size={20} />
                                                    </div>
                                                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No notifications</p>
                                                </div>
                                            )}
                                            {notifVisibleCount < notifications.length && (
                                                <div
                                                    className="p-3 text-center border-t cursor-pointer transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                                                    style={{ borderColor: 'var(--border-light)' }}
                                                    onClick={() => setNotifVisibleCount(c => c + 10)}
                                                >
                                                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                                                        Load More ({notifications.length - notifVisibleCount} remaining)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <div className="p-3 text-center border-t transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-wash)' }}>
                                                <button onClick={markAllAsRead} className="text-[11px] font-bold uppercase tracking-widest transition-colors w-full" style={{ color: 'var(--accent)' }}>Mark all as read</button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-7 pt-2 mobile-main-content page-content" style={{ transition: 'background 0.3s ease' }}>
                    <Outlet />
                </main>
            </div>

            {/* Global Emergency Modal */}
            {activeEmergency && (
                <EmergencyModal 
                    report={activeEmergency} 
                    onClose={() => {
                        setDismissedEmergencyIds(prev => new Set(prev).add(activeEmergency.id));
                        setActiveEmergency(null);
                    }} 
                />
            )}


            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="mobile-bottom-sheet bg-white dark:bg-slate-800 rounded-t-[28px] md:rounded-3xl w-full md:max-w-sm p-8 shadow-2xl flex flex-col items-center text-center animate-in slide-in-from-bottom md:zoom-in duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="md:hidden w-10 h-1 bg-slate-200 rounded-full mb-6" />
                        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <ShieldAlert size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Confirm Sign Out</h2>
                        <p className="text-[15px] text-slate-500 dark:text-slate-400 mb-8 font-medium">
                            Are you sure you want to sign out of the Officer Portal? Any unsaved changes may be lost.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3.5 text-[15px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    logout();
                                }}
                                className="flex-1 py-3.5 text-[15px] font-bold text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-red-500/20"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

