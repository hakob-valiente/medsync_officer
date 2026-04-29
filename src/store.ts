import type { AppState, SystemUser, Officer, CampusRecord, InventoryItem, Request, VisitRecord, Clinic, AcceptedAppointment, HealthAdvisory, RunLog, MealLog } from './types';
import { supabase } from './lib/supabase';

// =====================
// SEED DATA
// =====================

const seedUsers: SystemUser[] = [];

const seedOfficers: Officer[] = [];

const seedCampuses: CampusRecord[] = [];
const seedClinics: Clinic[] = [];

const seedInventory: InventoryItem[] = [];

const seedRequests: Request[] = [];

// =====================
// STORE
// =====================

const STORAGE_KEY = 'plv_medsync_admin_state';

function getInitialState(): AppState {
    const defaults: AppState = {
        users: seedUsers,
        officers: seedOfficers,
        campuses: seedCampuses,
        clinics: seedClinics,
        inventory: seedInventory,
        requests: seedRequests,
        medicalCertRequests: [],
        medicineRequests: [],
        logs: [],
        visitRecords: [],
        appointments: [],
        acceptedAppointments: [],
        advisories: [],
        inquiries: [],
        notifications: [],
        readNotificationIds: [],
        runLogs: [],
        mealLogs: [],
        emergencyReports: []
    };

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...defaults,
                ...parsed,
                logs: [], // Do not load logs from local storage
                clinics: parsed.clinics || seedClinics,
                visitRecords: parsed.visitRecords || [],
                emergencyReports: []
            };
        }
    } catch (_e) { }
    return defaults;
}

// =====================
// REALTIME SUBSCRIPTIONS
// =====================

function setupRealtimeSubscriptions() {
    // Single shared channel for the entire schema to prevent multiple socket connections
    const channel = supabase.channel('global-schema-changes');
    
    // Listen to ANY table change in the public schema
    channel.on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const table = payload.table;
        
        // Refresh relevant data when changes happen in DB
        switch (table) {
            case 'inventory': fetchInventoryFromDB(); break;
            case 'profiles': fetchUsersFromDB(); break;
            case 'officers': fetchOfficersFromDB(); break;
            case 'requests': fetchRequestsFromDB(); break;
            case 'medical_cert_requests': fetchMedicalCertRequestsFromDB(); break;
            case 'medicine_requests': fetchMedicineRequestsFromDB(); break;
            case 'campuses': fetchCampusesFromDB(); break;
            case 'clinics': fetchClinicsFromDB(); break;
            case 'visit_records': fetchVisitRecords(); break;
            case 'logs': fetchLogsFromDB(); break;
            case 'appointments': fetchAppointmentsFromDB(); break;
            case 'accepted_appointments': fetchAcceptedAppointmentsFromDB(); break;
            case 'inquiries': fetchInquiriesFromDB(); break;
            case 'notifications': fetchNotificationsFromDB(); break;
            case 'run_logs': fetchRunLogsFromDB(); break;
            case 'meal_logs': fetchMealLogsFromDB(); break;
            case 'emergency_reports': fetchEmergencyReportsFromDB(); break;
            case 'admin_notification_reads': {
                fetchAdminReadNotificationsFromDB();
                break;
            }
        }
    });

    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime Subscribed to all public tables');
        } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Realtime Error! Ensure Replication is ON for the tables in Supabase.');
        }
    });
}

// =====================
// BACKGROUND TASKS
// =====================

async function checkOfficerDutyEnd() {
    const { officers } = store.getState();
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Find officers whose shift has ended
    const ended = officers.filter(o => o.dutyEnd && o.dutyEnd <= currentTimeStr);
    
    if (ended.length > 0) {
        for (const o of ended) {
            console.log(`Duty shift ended for ${o.fullName}, removing from active duty.`);
            await removeOfficerDB(o.id);
            await addLog('MedSync System', `Shift ended for ${o.fullName} — Automatically removed from duty.`);
        }
    }
}

function saveState(state: AppState): void {
    const { logs, notifications, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

// =====================
// SIMPLE REACTIVE STORE
// =====================

type Listener = () => void;

class Store {
    private state: AppState;
    private listeners: Set<Listener> = new Set();

    constructor() {
        this.state = getInitialState();
    }

    getState(): AppState {
        return this.state;
    }

    setState(updater: (prev: AppState) => AppState): void {
        this.state = updater(this.state);
        saveState(this.state);
        this.listeners.forEach((l) => l());
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

export const store = new Store();

// Initialize Realtime & Background tasks
setupRealtimeSubscriptions();
setInterval(checkOfficerDutyEnd, 60000); // Check every minute
setInterval(fetchInventoryFromDB, 60000); // Expiry check too
setInterval(fetchLogsFromDB, 300000); // Periodic full sync for insurance
fetchNotificationsFromDB(); 
fetchUsersFromDB();

// Try to fetch read states if possible
fetchAdminReadNotificationsFromDB();
fetchRunLogsFromDB();
fetchMealLogsFromDB();

// =====================
// HELPER GENERATORS
// =====================

export function genId(): string {
    return Math.random().toString(36).substring(2, 10);
}

export function nowISO(): string {
    return new Date().toISOString();
}

export function setAdvisories(advisories: HealthAdvisory[]) {
    // Final safety de-duplication by title to ensure clean state
    const unique = Array.from(new Map(advisories.map(a => [a.title.toLowerCase().trim(), a])).values());
    store.setState(prev => ({ ...prev, advisories: unique }));
}

export async function addLog(actor: string, action: string): Promise<void> {
    try {
        const { error } = await supabase.from('logs').insert([{
            timestamp: nowISO(),
            actor,
            action
        }]);
        if (error) throw error;
        // Local state update via realtime or manual fetch if needed
    } catch (e) {
        console.error('Error adding log:', e);
    }
}

export async function fetchLogsFromDB() {
    try {
        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100);
            
        if (error) throw error;
        if (data) {
            store.setState(prev => ({
                ...prev,
                logs: data.map(row => ({
                    id: row.id,
                    timestamp: row.timestamp,
                    actor: row.actor,
                    action: row.action
                }))
            }));
        }
    } catch (e) {
        console.error('Error fetching logs:', e);
    }
}

export async function fetchNotificationsFromDB() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or('target_type.eq.ADMIN,target_type.eq.OFFICER')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) throw error;
        if (data) {
            store.setState(prev => ({
                ...prev,
                notifications: data as any[]
            }));
            
            fetchAdminReadNotificationsFromDB();
        }
    } catch (e) {
        console.error('Error fetching notifications:', e);
    }
}

export async function fetchAdminReadNotificationsFromDB() {
    try {
        const { data, error } = await supabase
            .from('admin_notification_reads')
            .select('notification_id');
        
        if (error) throw error;
        if (data) {
            store.setState(prev => ({
                ...prev,
                readNotificationIds: data.map(r => r.notification_id)
            }));
        }
    } catch (e) {
        console.error('Error fetching admin read statuses:', e);
    }
}

export async function markAdminNotificationAsReadDB(notificationId: string) {
    try {
        const { error } = await supabase
            .from('admin_notification_reads')
            .upsert({
                notification_id: notificationId,
                read_at: nowISO()
            }, { onConflict: 'notification_id' });
        
        if (error) throw error;
        
        store.setState(prev => ({
            ...prev,
            readNotificationIds: Array.from(new Set([...prev.readNotificationIds, notificationId]))
        }));
    } catch (e) {
        console.error('Error marking admin notification as read:', e);
    }
}

export async function updateUserStatusDB(id: string, newStatus: string) {
    try {
        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
        if (error) {
            console.error('Error updating profile status:', error);
            return;
        }
        
        // update local state if successful
        store.setState((prev) => ({
            ...prev,
            users: prev.users.map((u) =>
                u.id === id ? { ...u, status: newStatus } : u
            ),
        }));
    } catch (e) {
        console.error('Exception updating profile status:', e);
    }
}

export async function fetchUsersFromDB() {
    try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) {
            console.error('Error fetching profiles:', error);
            return;
        }

        if (data) {
            store.setState((prev) => {
                // map 'profiles' to SystemUser, preserving existing checkup logs by matching IDs
                const mappedUsers: SystemUser[] = data.map((row: any) => {
                    // Try to preserve checkup logs from previous state or local storage
                    const existingUser = prev.users.find(u => u.id === row.id);
                    
                    const fullName = [row.first_name, row.middle_name, row.last_name, row.suffix]
                        .filter(Boolean)
                        .join(' ');

                    const address = [row.street_address, row.barangay, row.city, row.region]
                        .filter(Boolean)
                        .join(', ');
                        
                    // calculate age from birthdate
                    let age;
                    if (row.birthdate) {
                        const birthDate = new Date(row.birthdate);
                        const today = new Date();
                        age = today.getFullYear() - birthDate.getFullYear();
                        const m = today.getMonth() - birthDate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                        }
                    }

                    return {
                        id: row.id,
                        first_name: row.first_name,
                        middle_name: row.middle_name,
                        last_name: row.last_name,
                        suffix: row.suffix,
                        student_number: row.student_number,
                        section: row.section,
                        year_level: row.year_level,
                        course: row.course,
                        birthdate: row.birthdate,
                        gender: row.gender,
                        email: row.email,
                        region: row.region,
                        city: row.city,
                        barangay: row.barangay,
                        street_address: row.street_address,
                        id_front_url: row.id_front_url,
                        id_back_url: row.id_back_url,
                        ocr_raw_front: row.ocr_raw_front,
                        ocr_raw_back: row.ocr_raw_back,
                        profile_picture_url: row.profile_picture_url,
                        created_at: row.created_at || new Date().toISOString(),
                        updated_at: row.updated_at,
                        status: row.status || 'pending',
                        
                        // UI convenience fields
                        fullName: fullName || 'Unknown User',
                        studentId: row.student_number || 'N/A',
                        address: address || undefined,
                        contact: row.email, // email as contact for now
                        sex: row.gender,    // sex field mapped to gender
                        age: age,
                        checkupLogs: existingUser?.checkupLogs || [],
                        createdAt: row.created_at || new Date().toISOString(),

                        // Map health/contact info
                        height_cm: row.height_cm,
                        weight_kg: row.weight_kg,
                        blood_type: row.blood_type,
                        allergies: row.allergies,
                        chronic_conditions: row.chronic_conditions,
                        current_medications: row.current_medications,
                        ispwd: row.ispwd,
                        contact_person: row.contact_person,
                        contact_number: row.contact_number ? String(row.contact_number).padStart(11, '0') : undefined
                    };
                });
                
                return { ...prev, users: mappedUsers };
            });
        }
    } catch (e) {
        console.error('Exception fetching profiles:', e);
    }
}

export async function fetchVisitRecords(patientId?: string) {
    try {
        let query = supabase.from('visit_records').select('*');
        if (patientId) {
            query = query.eq('visit_patient', patientId);
        }

        const { data, error } = await query.order('visit_date', { ascending: false });
        if (error) {
            console.error('Error fetching visit records:', error);
            return [];
        }

        if (data) {
            store.setState((prev) => ({
                ...prev,
                visitRecords: data as VisitRecord[]
            }));
            return data as VisitRecord[];
        }
        return [];
    } catch (e) {
        console.error('Exception fetching visit records:', e);
        return [];
    }
}

export async function addVisitRecordDB(record: Partial<VisitRecord>) {
    try {
        const { data, error } = await supabase.from('visit_records').insert([record]).select();
        if (error) throw error;
        if (record.visit_patient) await fetchVisitRecords(record.visit_patient);
        await addLog('MedSync System', `New visit record added for patient ID: ${record.visit_patient}`);
        return data;
    } catch (e) {
        console.error('Error adding visit record:', e);
        throw e;
    }
}

export async function updateVisitRecordDB(id: string, updates: Partial<VisitRecord>) {
    try {
        const { error } = await supabase.from('visit_records').update(updates).eq('id', id);
        if (error) throw error;
        if (updates.visit_patient) await fetchVisitRecords(updates.visit_patient);
        await addLog('MedSync System', `Visit record updated: ${id}`);
    } catch (e) {
        console.error('Error updating visit record:', e);
        throw e;
    }
}

export async function deleteVisitRecordDB(id: string, patientId?: string) {
    try {
        const { error } = await supabase.from('visit_records').delete().eq('id', id);
        if (error) throw error;
        if (patientId) await fetchVisitRecords(patientId);
        await addLog('MedSync System', `Visit record deleted: ${id}`);
    } catch (e) {
        console.error('Error deleting visit record:', e);
        throw e;
    }
}

export async function deleteUserDB(id: string) {
    try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        store.setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
        await addLog('MedSync System', `Patient record deleted: ${id}`);
    } catch (e) {
        console.error('Error deleting profile:', e);
        throw e;
    }
}

export async function addUserDB(userData: any) {
    try {
        const { data, error } = await supabase.from('profiles').insert([userData]).select();
        if (error) throw error;
        await fetchUsersFromDB();
        await addLog('MedSync System', `New patient record added: ${userData.first_name} ${userData.last_name}`);
        return data;
    } catch (e) {
        console.error('Error adding profile:', e);
        throw e;
    }
}

export async function updateUserDB(id: string, updates: any) {
    try {
        const { error } = await supabase.from('profiles').update(updates).eq('id', id);
        if (error) throw error;
        await fetchUsersFromDB();
        await addLog('MedSync System', `Patient record updated: ${id}`);
    } catch (e) {
        console.error('Error updating profile:', e);
        throw e;
    }
}


// ---- Officer DB Actions ----

export async function fetchOfficersFromDB() {
    try {
        const { data, error } = await supabase.from('officers').select('*');
        if (error) {
            console.error('Error fetching officers:', error);
            return;
        }

        if (data) {
            const mapped: Officer[] = data.map((row: any) => ({
                id: row.id,
                userId: row.officer_id,
                fullName: row.officer_name,
                studentId: row.officer_id_num,
                dutyStart: row.duty_start ? row.duty_start.slice(0, 5) : '07:00',
                dutyEnd: row.duty_end ? row.duty_end.slice(0, 5) : '17:00',
                permissions: row.permissions || [],
                campus: row.campus || '',
                clinic: row.clinic || '',
                assignedAt: row.assigned_date,
                password: row.password
            }));
            store.setState(prev => ({ ...prev, officers: mapped }));
        }
    } catch (e) {
        console.error('Exception fetching officers:', e);
    }
}

export async function assignOfficerDB(officer: Partial<Officer>) {
    try {
        const { data, error } = await supabase.from('officers').insert([{
            officer_id: officer.userId,
            officer_name: officer.fullName,
            officer_id_num: officer.studentId,
            duty_start: officer.dutyStart,
            duty_end: officer.dutyEnd,
            permissions: officer.permissions,
            campus: officer.campus,
            clinic: officer.clinic,
            assigned_date: officer.assignedAt,
            password: officer.password, // Set birthdate as password
            status: true
        }]).select();

        if (error) throw error;
        
        await fetchOfficersFromDB();
        return data;
    } catch (e) {
        console.error('Error assigning officer:', e);
        throw e;
    }
}

export async function removeOfficerDB(id: string) {
    try {
        const { error } = await supabase.from('officers').delete().eq('id', id);
        if (error) throw error;
        
        store.setState(prev => ({
            ...prev,
            officers: prev.officers.filter(o => o.id !== id)
        }));
    } catch (e) {
        console.error('Error removing officer:', e);
        throw e;
    }
}

export async function updateOfficerPermissionsDB(id: string, permissions: string[]) {
    try {
        const { error } = await supabase.from('officers').update({ permissions }).eq('id', id);
        if (error) throw error;
        
        store.setState(prev => ({
            ...prev,
            officers: prev.officers.map(o => o.id === id ? { ...o, permissions } : o)
        }));
    } catch (e) {
        console.error('Error updating permissions:', e);
        throw e;
    }
}

// ---- Campus & Clinic DB Actions ----

export async function fetchCampusesFromDB() {
    try {
        const { data, error } = await supabase.from('campuses').select('*');
        if (error) throw error;
        if (data) {
            const mapped: CampusRecord[] = data.map(row => ({
                id: row.id,
                name: row.name,
                location: row.location || 'N/A',
                contact: row.contact_number ? row.contact_number.toString().padStart(11, '0') : 'N/A',
                active: true,
                description: row.description,
                createdAt: new Date().toISOString()
            }));
            store.setState(prev => ({ ...prev, campuses: mapped }));
        }
    } catch (e) {
        console.error('Error fetching campuses:', e);
    }
}

export async function fetchClinicsFromDB() {
    try {
        const { data, error } = await supabase.from('clinics').select('*');
        if (error) throw error;
        if (data) {
            const mapped: Clinic[] = data.map(row => ({
                id: row.id,
                campusId: row.campus_id,
                name: row.name,
                location: 'Main Office', // Not in provided schema
                contact: row.contact_number ? row.contact_number.toString().padStart(11, '0') : 'N/A',
                active: true,
                createdAt: new Date().toISOString()
            }));
            store.setState(prev => ({ ...prev, clinics: mapped }));
        }
    } catch (e) {
        console.error('Error fetching clinics:', e);
    }
}

export async function addCampusDB(name: string, location: string, contact: string) {
    try {
        const { data, error } = await supabase.from('campuses').insert([{ 
            name, 
            location,
            contact_number: contact.padStart(11, '0') // Ensure leading zeros if parsed as number
        }]).select();
        if (error) throw error;
        await fetchCampusesFromDB();
        return data;
    } catch (e) {
        console.error('Error adding campus:', e);
        throw e;
    }
}

export async function addClinicDB(name: string, campusId: string, contact: string) {
    try {
        const { data, error } = await supabase.from('clinics').insert([{ 
            name, 
            campus_id: campusId,
            contact_number: contact.padStart(11, '0')
        }]).select();
        if (error) throw error;
        await fetchClinicsFromDB();
        return data;
    } catch (e) {
        console.error('Error adding clinic:', e);
        throw e;
    }
}

export async function deleteCampusDB(id: string) {
    try {
        const { error } = await supabase.from('campuses').delete().eq('id', id);
        if (error) throw error;
        await fetchCampusesFromDB();
        await addLog('MedSync System', `Campus deleted: ${id}`);
    } catch (e) {
        console.error('Error deleting campus:', e);
        throw e;
    }
}

export async function updateCampusDB(id: string, updates: any) {
    try {
        const { error } = await supabase.from('campuses').update({
            name: updates.name,
            location: updates.location,
            contact_number: updates.contact,
            description: updates.description
        }).eq('id', id);
        if (error) throw error;
        await fetchCampusesFromDB();
        await addLog('MedSync System', `Campus updated: ${updates.name}`);
    } catch (e) {
        console.error('Error updating campus:', e);
        throw e;
    }
}

export async function deleteClinicDB(id: string) {
    try {
        const { error } = await supabase.from('clinics').delete().eq('id', id);
        if (error) throw error;
        await fetchClinicsFromDB();
        await addLog('MedSync System', `Clinic deleted: ${id}`);
    } catch (e) {
        console.error('Error deleting clinic:', e);
        throw e;
    }
}

export async function updateClinicDB(id: string, updates: any) {
    try {
        const { error } = await supabase.from('clinics').update({
            name: updates.name,
            contact_number: updates.contact,
            campus_id: updates.campusId
        }).eq('id', id);
        if (error) throw error;
        await fetchClinicsFromDB();
        await addLog('MedSync System', `Clinic updated: ${updates.name}`);
    } catch (e) {
        console.error('Error updating clinic:', e);
        throw e;
    }
}


// ---- Requests DB Actions ----

export async function fetchRequestsFromDB() {
    try {
        const { data, error } = await supabase.from('requests').select('*').order('requested_tst', { ascending: false });
        if (error) throw error;
        if (data) {
            const mapped: Request[] = data.map(row => {
                // Normalize status: handle "PENDING" -> "Pending", etc.
                let s = row.status || 'Pending';
                if (s.toUpperCase() === 'PENDING') s = 'Pending';
                else if (s.toUpperCase() === 'ACCEPTED') s = 'Accepted';
                else if (s.toUpperCase() === 'COMPLETED') s = 'Completed';
                else if (s.toUpperCase() === 'REJECTED') s = 'Rejected';
                
                return {
                    id: row.id,
                    type: row.request_type as any,
                    requesterName: row.requester,
                    requesterStudentId: row.requester_id,
                    campus: row.campus as any,
                    date: row.requested_tst,
                    status: s as any,
                    details: '', // Removed based on request
                };
            });
            store.setState(prev => ({ ...prev, requests: mapped }));
        }
    } catch (e) {
        console.error('Error fetching requests:', e);
    }
}

export async function updateRequestStatusDB(id: string, status: string) {
    try {
        const { error } = await supabase.from('requests').update({ status }).eq('id', id);
        if (error) throw error;
        store.setState(prev => ({
            ...prev,
            requests: prev.requests.map(r => r.id === id ? { ...r, status: status as any } : r)
        }));
    } catch (e) {
        console.error('Error updating request status:', e);
        throw e;
    }
}

export async function deleteRequestDB(id: string) {
    try {
        const { error } = await supabase.from('requests').delete().eq('id', id);
        if (error) throw error;
        await fetchRequestsFromDB();
        await addLog('MedSync System', `Request deleted: ${id}`);
    } catch (e) {
        console.error('Error deleting request:', e);
        throw e;
    }
}

export async function addRequestDB(req: any) {
    try {
        const { error } = await supabase.from('requests').insert([req]);
        if (error) throw error;
        await fetchRequestsFromDB();
        await addLog('MedSync System', `New request added for ${req.requester}`);
    } catch (e) {
        console.error('Error adding request:', e);
        throw e;
    }
}

export async function updateRequestDB(id: string, updates: any) {
    try {
        const { error } = await supabase.from('requests').update(updates).eq('id', id);
        if (error) throw error;
        await fetchRequestsFromDB();
        await addLog('MedSync System', `Request updated: ${id}`);
    } catch (e) {
        console.error('Error updating request:', e);
        throw e;
    }
}

export async function fetchRunLogsFromDB() {
    try {
        const { data, error } = await supabase.from('run_logs').select('*');
        if (error) throw error;
        if (data) {
            store.setState(prev => ({ ...prev, runLogs: data as RunLog[] }));
        }
    } catch (e) {
        console.error('Error fetching run logs:', e);
    }
}

export async function fetchMealLogsFromDB() {
    try {
        const { data, error } = await supabase.from('meal_logs').select('*');
        if (error) throw error;
        if (data) {
            store.setState(prev => ({ ...prev, mealLogs: data as MealLog[] }));
        }
    } catch (e) {
        console.error('Error fetching meal logs:', e);
    }
}

// ---- Medical Certificate Requests DB Actions ----

export async function fetchMedicalCertRequestsFromDB() {
    try {
        const { data, error } = await supabase
            .from('medical_cert_requests')
            .select('*, profiles(*)')
            .order('requested_tst', { ascending: false });
        if (error) throw error;
        if (data) {
            const mapped = data.map((row: any) => ({
                ...row,
                requester_name: row.profiles 
                    ? [row.profiles.first_name, row.profiles.last_name, row.profiles.suffix].filter(Boolean).join(' ')
                    : 'Unknown requester',
                requester_student_number: row.profiles?.student_number || 'N/A'
            }));
            store.setState(prev => ({ ...prev, medicalCertRequests: mapped }));
        }
    } catch (e) {
        console.error('Error fetching medical cert requests:', e);
    }
}

export async function updateMedicalCertStatusDB(id: string, status: string, rejection_reason?: string) {
    try {
        const payload: any = { status };
        if (status === 'COMPLETED') {
            payload.completed_timestamp = new Date().toISOString();
        }
        if (status === 'REJECTED' && rejection_reason) {
            payload.rejection_reason = rejection_reason;
        }
        const { error } = await supabase.from('medical_cert_requests').update(payload).eq('id', id);
        if (error) throw error;
        await fetchMedicalCertRequestsFromDB();
        await addLog('MedSync System', `Medical Cert Request status updated to ${status} for ID: ${id}`);
    } catch (e) {
        console.error('Error updating medical cert status:', e);
        throw e;
    }
}

// ---- Medicine Requests DB Actions ----

export async function fetchMedicineRequestsFromDB() {
    try {
        const { data, error } = await supabase
            .from('medicine_requests')
            .select('*, profiles(first_name, last_name, suffix, student_number)')
            .order('requested_tst', { ascending: false });
        if (error) throw error;
        if (data) {
            const mapped = data.map((row: any) => ({
                ...row,
                requester_name: row.profiles 
                    ? [row.profiles.first_name, row.profiles.last_name, row.profiles.suffix].filter(Boolean).join(' ')
                    : 'Unknown requester',
                requester_student_number: row.profiles?.student_number || 'N/A'
            }));
            store.setState(prev => ({ ...prev, medicineRequests: mapped }));
        }
    } catch (e) {
        console.error('Error fetching medicine requests:', e);
    }
}

export async function updateMedicineRequestStatusDB(id: string, status: string, medicineName?: string, qty?: number, rejection_reason?: string, generated_qr?: string) {
    try {
        const payload: any = { status };
        if (status === 'DISPENSED') {
            payload.completed_timestamp = new Date().toISOString();
        }
        if (status === 'REJECTED' && rejection_reason) {
            payload.rejection_reason = rejection_reason;
        }
        if (generated_qr) {
            payload.generated_qr = generated_qr;
        }
        const { error } = await supabase.from('medicine_requests').update(payload).eq('id', id);
        if (error) throw error;

        if (status === 'DISPENSED' && medicineName && qty) {
            // Subtract quantity from inventory
            const { data: invData, error: invFetchError } = await supabase
                .from('inventory')
                .select('id, quantity')
                .eq('item_name', medicineName)
                .single();
            
            if (invFetchError) {
                console.error('Could not find inventory item to subtract quantity:', invFetchError);
            } else if (invData) {
                const newQty = (Number(invData.quantity) || 0) - qty;
                const { error: invUpdateError } = await supabase
                    .from('inventory')
                    .update({ quantity: Math.max(0, newQty) })
                    .eq('id', invData.id);
                
                if (invUpdateError) {
                    console.error('Error updating inventory quantity:', invUpdateError);
                } else {
                    await fetchInventoryFromDB();
                    await addLog('MedSync System', `Inventory updated: Subtracted ${qty} ${medicineName} for dispensed request.`);
                }
            }
        }

        await fetchMedicineRequestsFromDB();
        await addLog('MedSync System', `Medicine Request status updated to ${status} for ID: ${id}`);
    } catch (e) {
        console.error('Error updating medicine request status:', e);
        throw e;
    }
}

export async function deleteMedicalCertRequestDB(id: string) {
    try {
        const { error } = await supabase.from('medical_cert_requests').delete().eq('id', id);
        if (error) throw error;
        await fetchMedicalCertRequestsFromDB();
        await addLog('MedSync System', `Medical Cert Request deleted: ${id}`);
    } catch (e) {
        console.error('Error deleting medical cert request:', e);
        throw e;
    }
}

export async function deleteMedicineRequestDB(id: string) {
    try {
        const { error } = await supabase.from('medicine_requests').delete().eq('id', id);
        if (error) throw error;
        await fetchMedicineRequestsFromDB();
        await addLog('MedSync System', `Medicine Request deleted: ${id}`);
    } catch (e) {
        console.error('Error deleting medicine request:', e);
        throw e;
    }
}

export async function addMedicalCertRequestDB(req: any) {
    try {
        const { error } = await supabase.from('medical_cert_requests').insert([req]);
        if (error) throw error;
        await fetchMedicalCertRequestsFromDB();
        await addLog('MedSync System', `Manual Medical Cert Request added.`);
    } catch (e) {
        console.error('Error adding medical cert request:', e);
        throw e;
    }
}

export async function updateMedicalCertRequestDB(id: string, updates: any) {
    try {
        const { error } = await supabase.from('medical_cert_requests').update(updates).eq('id', id);
        if (error) throw error;
        await fetchMedicalCertRequestsFromDB();
        await addLog('MedSync System', `Medical Cert Request updated: ${id}`);
    } catch (e) {
        console.error('Error updating medical cert request:', e);
        throw e;
    }
}

export async function addMedicineRequestDB(req: any) {
    try {
        const { error } = await supabase.from('medicine_requests').insert([req]);
        if (error) throw error;
        await fetchMedicineRequestsFromDB();
        await addLog('MedSync System', `Manual Medicine Request added.`);
    } catch (e) {
        console.error('Error adding medicine request:', e);
        throw e;
    }
}

export async function updateMedicineRequestDB(id: string, updates: any) {
    try {
        const { error } = await supabase.from('medicine_requests').update(updates).eq('id', id);
        if (error) throw error;
        await fetchMedicineRequestsFromDB();
        await addLog('MedSync System', `Medicine Request updated: ${id}`);
    } catch (e) {
        console.error('Error updating medicine request:', e);
        throw e;
    }
}


// ---- Inventory DB Actions ----

export async function fetchInventoryFromDB() {
    try {
        const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
            // Check expirations
            const now = new Date();
            const updatedData = data.map((item: any) => {
                let status = item.status || 'Available';
                if (item.expiry_date) {
                    const expDate = new Date(item.expiry_date);
                    if (expDate <= now) {
                        status = 'Expired';
                    } else {
                        // Check if it's not manually set to some other status.
                        // We will auto-set Available if it's not Expired and originally Available.
                        if (status === 'Expired') status = 'Available';
                    }
                }
                return {
                    id: item.id,
                    item_name: item.item_name,
                    asset_type: item.asset_type || 'Medicine',
                    status: status,
                    quantity: Number(item.quantity) || 0,
                    expiry_date: item.expiry_date,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    unit_measure: item.unit_measure || 'By pieces',
                    campus: item.campus || 'Main'
                };
            });
            store.setState(prev => ({ ...prev, inventory: updatedData }));
            
            // Optionally update the DB for things that newly expired:
            const newlyExpired = updatedData.filter(i => i.status === 'Expired' && data.find(d => d.id === i.id)?.status !== 'Expired');
            for (const x of newlyExpired) {
                await updateInventoryStatusDB(x.id, 'Expired');
            }
        }
    } catch (e) {
        console.error('Error fetching inventory:', e);
    }
}

export async function addInventoryDB(item: Partial<InventoryItem>) {
    try {
        const { error } = await supabase.from('inventory').insert([{
            item_name: item.item_name,
            asset_type: item.asset_type,
            status: item.status,
            quantity: item.quantity,
            expiry_date: item.expiry_date,
            unit_measure: item.unit_measure,
            campus: item.campus
        }]);
        if (error) throw error;
        await fetchInventoryFromDB();
    } catch (e) {
        console.error('Error adding inventory:', e);
        throw e;
    }
}

export async function updateInventoryStatusDB(id: string, status: string) {
    try {
        const { error } = await supabase.from('inventory').update({ status }).eq('id', id);
        if (error) throw error;
        store.setState(prev => ({
            ...prev,
            inventory: prev.inventory.map(i => i.id === id ? { ...i, status } : i)
        }));
    } catch (e) {
        console.error('Error updating inventory status:', e);
        throw e;
    }
}

export async function deleteInventoryDB(id: string) {
    try {
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) throw error;
        await fetchInventoryFromDB();
        await addLog('MedSync System', `Inventory item deleted: ${id}`);
    } catch (e) {
        console.error('Error deleting inventory:', e);
        throw e;
    }
}

export async function updateInventoryDB(id: string, updates: any) {
    try {
        const { error } = await supabase.from('inventory').update(updates).eq('id', id);
        if (error) throw error;
        await fetchInventoryFromDB();
        await addLog('MedSync System', `Inventory item updated: ${updates.item_name || id}`);
    } catch (e) {
        console.error('Error updating inventory:', e);
        throw e;
    }
}


export async function bulkInsertInventoryDB(items: Partial<InventoryItem>[]) {
    try {
        const payload = items.map(item => ({
            item_name: item.item_name,
            asset_type: item.asset_type || 'Medicine',
            status: item.status || 'Available',
            quantity: item.quantity || 0,
            expiry_date: item.expiry_date || null,
            unit_measure: item.unit_measure || 'By pieces',
            campus: item.campus || 'Main'
        }));
        const { error } = await supabase.from('inventory').insert(payload);
        if (error) throw error;
        await fetchInventoryFromDB();
        await addLog('MedSync System', `Bulk imported ${items.length} items to inventory.`);
    } catch (e) {
        console.error('Error bulk inserting inventory:', e);
        throw e;
    }
}

// ---- Appointments DB Actions ----

export async function fetchAppointmentsFromDB() {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*, profiles(first_name, last_name, suffix, student_number, profile_picture_url)')
            .order('request_timestamp', { ascending: false });
        if (error) throw error;
        if (data) {
            const mapped = data.map((row: any) => ({
                ...row,
                profiles: row.profiles ? {
                    ...row.profiles,
                    fullName: [row.profiles.first_name, row.profiles.last_name, row.profiles.suffix].filter(Boolean).join(' '),
                    studentId: row.profiles.student_number || 'N/A'
                } : undefined,
                requester_name: row.profiles 
                    ? [row.profiles.first_name, row.profiles.last_name, row.profiles.suffix].filter(Boolean).join(' ')
                    : 'Unknown requester',
                requester_student_number: row.profiles?.student_number || 'N/A',
                contact_number: row.contact_number || row.profiles?.contact_number || 'N/A'
            }));
            store.setState(prev => ({ ...prev, appointments: mapped }));
        }
    } catch (e) {
        console.error('Error fetching appointments:', e);
    }
}

export async function fetchAcceptedAppointmentsFromDB() {
    try {
        // EXTERNAL ISSUES THAT MAY AFFECT THIS:
        // 1. Missing Foreign Key: Supabase joins require a formal FK constraint in the database.
        // 2. RLS Policies: Restricted access to 'appointments' table can cause join results to be null.
        // 3. Data Integrity: If appointment_id refers to a deleted record, the join will fail.
        
        const { data, error } = await supabase
            .from('accepted_appointments')
            .select('*, appointments(contact_number, visit_reason, category), profiles(first_name, last_name, suffix, student_number, contact_number, profile_picture_url)')
            .order('appointment_sched', { ascending: true });
        
        if (error) throw error;
        if (data) {
            // Ensure we have the latest appointments for fallback mapping
            let currentAppointments = store.getState().appointments;
            if (currentAppointments.length === 0) {
                // Fetch them if not already loaded to support the fallback lookup
                const { data: appData } = await supabase.from('appointments').select('*');
                if (appData) currentAppointments = appData;
            }

            const mapped = data.map((row: any) => {
                // Priority fallback logic for contact and reason
                const parentAppFromJoin = row.appointments;
                const parentAppFromLookup = currentAppointments.find((a: any) => a.id === row.appointment_id);
                
                return {
                    ...row,
                    profiles: row.profiles ? {
                        ...row.profiles,
                        fullName: [row.profiles.first_name, row.profiles.last_name, row.profiles.suffix].filter(Boolean).join(' '),
                        studentId: row.profiles.student_number || 'N/A'
                    } : undefined,
                    requester_name: row.profiles 
                        ? [row.profiles.first_name, row.profiles.last_name, row.profiles.suffix].filter(Boolean).join(' ')
                        : 'Unknown requester',
                    requester_student_number: row.profiles?.student_number || 'N/A',
                    // Use join result first, then manual lookup from state/fetch, then profile data
                    contact_number: parentAppFromJoin?.contact_number || parentAppFromLookup?.contact_number || row.profiles?.contact_number || 'N/A',
                    visit_reason: parentAppFromJoin?.visit_reason || parentAppFromLookup?.visit_reason || 'N/A',
                    category: parentAppFromJoin?.category || parentAppFromLookup?.category || row.category || 'Consultation'
                };
            });
            store.setState(prev => ({ ...prev, acceptedAppointments: mapped }));
        }
    } catch (e) {
        console.error('Error fetching accepted appointments:', e);
    }
}

export async function updateAppointmentStatusDB(id: string, status: string, rejection_reason?: string) {
    try {
        const payload: any = { status };
        if (status === 'ACCEPTED') {
            payload.completed_timestamp = new Date().toISOString();
        }
        if (status === 'REJECTED' && rejection_reason) {
            payload.rejection_reason = rejection_reason;
        }
        const { error } = await supabase.from('appointments').update(payload).eq('id', id);
        if (error) throw error;
        await fetchAppointmentsFromDB();
        await addLog('MedSync System', `Appointment status updated to ${status} for ID: ${id}`);
    } catch (e) {
        console.error('Error updating appointment status:', e);
        throw e;
    }
}

export async function addAcceptedAppointmentDB(appt: Partial<AcceptedAppointment>) {
    try {
        const { data, error } = await supabase.from('accepted_appointments').insert([{
            requester_id: appt.requester_id,
            appointment_id: appt.appointment_id,
            nurse_assigned: appt.nurse_assigned,
            appointment_sched: appt.appointment_sched,
            campus: appt.campus,
            category: appt.category
        }]).select();

        if (error) throw error;
        
        // Also update the original appointment status to 'ACCEPTED' if not already
        if (appt.appointment_id) {
            await updateAppointmentStatusDB(appt.appointment_id, 'ACCEPTED');
        }
        
        await fetchAcceptedAppointmentsFromDB();
        await addLog('MedSync System', `Accepted appointment for requester ID: ${appt.requester_id} at ${appt.appointment_sched}`);
        return data; 
    } catch (e) {
        console.error('Error adding accepted appointment:', e);
        throw e;
    }
}

export async function sendBackAppointmentDB(acceptedAppointmentId: string, appointmentId: string, reason: string) {
    try {
        // Delete the accepted appointment
        const { error: delError } = await supabase.from('accepted_appointments').delete().eq('id', acceptedAppointmentId);
        if (delError) throw delError;
        
        // Push the original request back into PENDING state
        const { error: updError } = await fallbackUpdateAppointmentStatus(appointmentId, 'PENDING');
        if (updError) throw updError;

        await fetchAcceptedAppointmentsFromDB();
        await fetchAppointmentsFromDB();
        await addLog('MedSync System', `Appointment sent back to pending. Reason: ${reason}`);
    } catch (e) {
        console.error('Error sending back appointment:', e);
        throw e;
    }
}

async function fallbackUpdateAppointmentStatus(id: string, status: string) {
    return await supabase.from('appointments').update({ status }).eq('id', id);
}

export async function updateAcceptedAppointmentDB(id: string, updates: Partial<AcceptedAppointment>, reason: string) {
    try {
        const { error } = await supabase.from('accepted_appointments').update(updates).eq('id', id);
        if (error) throw error;
        await fetchAcceptedAppointmentsFromDB();
        await addLog('MedSync System', `Accepted appointment updated. Reason: ${reason}`);
    } catch (e) {
        console.error('Error updating accepted appointment:', e);
        throw e;
    }
}

// ---- Inquiries DB Actions ----

export async function fetchInquiriesFromDB() {
    try {
        const { data, error } = await supabase
            .from('inquiries')
            .select('*, profiles(first_name, last_name, suffix, student_number, email)')
            .order('inquiry_timestamp', { ascending: false });
        if (error) throw error;
        if (data) {
            const mapped = data.map((row: any) => ({
                ...row,
                inquirer_name: row.profiles 
                    ? [row.profiles.first_name, row.profiles.last_name, row.profiles.suffix].filter(Boolean).join(' ')
                    : 'Unknown inquirer',
                inquirer_student_number: row.profiles?.student_number || 'N/A',
                inquirer_email: row.profiles?.email || 'N/A'
            }));
            store.setState(prev => ({ ...prev, inquiries: mapped }));
        }
    } catch (e) {
        console.error('Error fetching inquiries:', e);
    }
}

export async function updateInquiryStatusDB(id: string) {
    try {
        const { error } = await supabase.from('inquiries').update({ 
            completed_timestamp: new Date().toISOString() 
        }).eq('id', id);
        if (error) throw error;
        await fetchInquiriesFromDB();
    } catch (e) {
        console.error('Error updating inquiry status:', e);
        throw e;
    }
}

// ---- Emergency Reports DB Actions ----

export async function fetchEmergencyReportsFromDB() {
    try {
        const { data, error } = await supabase
            .from('emergency_reports')
            .select('*, profiles(first_name, last_name, suffix, student_number, profile_picture_url)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
            const mapped = data.map((row: any) => ({
                ...row,
                requester_name: row.profiles 
                    ? [row.profiles.first_name, row.profiles.last_name, row.profiles.suffix].filter(Boolean).join(' ')
                    : 'Unknown requester',
            }));
            store.setState(prev => ({ ...prev, emergencyReports: mapped }));
        }
    } catch (e) {
        console.error('Error fetching emergency reports:', e);
    }
}

export async function updateEmergencyReportStatusDB(id: string, status: string) {
    try {
        const { error } = await supabase.from('emergency_reports').update({ status, updated_at: nowISO() }).eq('id', id);
        if (error) throw error;
        await fetchEmergencyReportsFromDB();
        await addLog('MedSync System', `Emergency Report status updated to ${status} for ID: ${id}`);
    } catch (e) {
        console.error('Error updating emergency report status:', e);
        throw e;
    }
}

// =====================
// BOOTSTRAP DATA
// =====================

/**
 * Trigger an initial fetch for all major tables to ensure the dashboard 
 * and other pages have data ready immediately on app load.
 */
export async function bootstrapSessionData() {
    try {
        // Run in parallel for speed
        await Promise.allSettled([
            fetchUsersFromDB(),
            fetchOfficersFromDB(),
            fetchInventoryFromDB(),
            fetchRequestsFromDB(),
            fetchMedicalCertRequestsFromDB(),
            fetchMedicineRequestsFromDB(),
            fetchCampusesFromDB(),
            fetchClinicsFromDB(),
            fetchVisitRecords(),
            fetchLogsFromDB(),
            fetchAppointmentsFromDB(),
            fetchAcceptedAppointmentsFromDB(),
            fetchInquiriesFromDB(),
            fetchNotificationsFromDB(),
            fetchAdminReadNotificationsFromDB(),
            fetchEmergencyReportsFromDB()
        ]);
        console.log('✅ Global background data fetch complete.');
    } catch (e) {
        console.error('Error during data bootstrap:', e);
    }
}

// Initial trigger if we have a session or just to be ready
bootstrapSessionData();
